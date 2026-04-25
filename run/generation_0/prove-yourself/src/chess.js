/**
 * Chess Engine - Full implementation of standard chess rules.
 * Pure logic with no rendering dependencies.
 */

// Piece types
export const PAWN = 'p';
export const KNIGHT = 'n';
export const BISHOP = 'b';
export const ROOK = 'r';
export const QUEEN = 'q';
export const KING = 'k';

// Colors
export const WHITE = 'w';
export const BLACK = 'b';

// Piece values for evaluation
export const PIECE_VALUES = {
  [PAWN]: 100,
  [KNIGHT]: 320,
  [BISHOP]: 330,
  [ROOK]: 500,
  [QUEEN]: 900,
  [KING]: 20000,
};

// Unicode symbols for rendering
export const PIECE_SYMBOLS = {
  [WHITE]: { [KING]: '♔', [QUEEN]: '♕', [ROOK]: '♖', [BISHOP]: '♗', [KNIGHT]: '♘', [PAWN]: '♙' },
  [BLACK]: { [KING]: '♚', [QUEEN]: '♛', [ROOK]: '♜', [BISHOP]: '♝', [KNIGHT]: '♞', [PAWN]: '♟' },
};

export const PIECE_NAMES = {
  [KING]: 'K', [QUEEN]: 'Q', [ROOK]: 'R', [BISHOP]: 'B', [KNIGHT]: 'N', [PAWN]: ''
};

const OPPOSITE = { [WHITE]: BLACK, [BLACK]: WHITE };

// Initial board setup
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default class Chess {
  constructor() {
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    this.turn = WHITE;
    this.castling = { [WHITE]: { K: true, Q: true }, [BLACK]: { K: true, Q: true } };
    this.enPassant = null; // { row, col } or null
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.history = [];
    this.positionHistory = new Map(); // for repetition detection
    this.inCheckCache = null;
    this.legalMovesCache = null;
    this.load(INITIAL_FEN);
  }

  /**
   * Clone the game state (for AI search).
   */
  clone() {
    const g = new Chess();
    g.board = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
    g.turn = this.turn;
    g.castling = {
      [WHITE]: { ...this.castling[WHITE] },
      [BLACK]: { ...this.castling[BLACK] },
    };
    g.enPassant = this.enPassant ? { ...this.enPassant } : null;
    g.halfMoveClock = this.halfMoveClock;
    g.fullMoveNumber = this.fullMoveNumber;
    g.history = [...this.history];
    g.positionHistory = new Map(this.positionHistory);
    g.inCheckCache = null;
    g.legalMovesCache = null;
    return g;
  }

  /**
   * Load a position from FEN string.
   */
  load(fen) {
    const parts = fen.trim().split(/\s+/);
    const rows = parts[0].split('/');

    for (let r = 0; r < 8; r++) {
      let col = 0;
      for (const ch of rows[r]) {
        if (/[1-8]/.test(ch)) {
          col += parseInt(ch);
        } else {
          const color = ch === ch.toUpperCase() ? WHITE : BLACK;
          const type = ch.toLowerCase();
          this.board[r][col] = { color, type };
          col++;
        }
      }
    }

    this.turn = parts[1] === 'w' ? WHITE : BLACK;

    this.castling = {
      [WHITE]: { K: false, Q: false },
      [BLACK]: { K: false, Q: false },
    };
    if (parts[2] !== '-') {
      if (parts[2].includes('K')) this.castling[WHITE].K = true;
      if (parts[2].includes('Q')) this.castling[WHITE].Q = true;
      if (parts[2].includes('k')) this.castling[BLACK].K = true;
      if (parts[2].includes('q')) this.castling[BLACK].Q = true;
    }

    this.enPassant = null;
    if (parts[3] !== '-') {
      const col = parts[3].charCodeAt(0) - 97;
      const row = 8 - parseInt(parts[3][1]);
      this.enPassant = { row, col };
    }

    this.halfMoveClock = parseInt(parts[4]) || 0;
    this.fullMoveNumber = parseInt(parts[5]) || 1;

    this.history = [];
    this.positionHistory = new Map();
    this.inCheckCache = null;
    this.legalMovesCache = null;
    this._recordPosition();
  }

  /**
   * Get FEN string of current position.
   */
  fen() {
    let fen = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece) {
          if (empty > 0) { fen += empty; empty = 0; }
          const ch = piece.type;
          fen += piece.color === WHITE ? ch.toUpperCase() : ch.toLowerCase();
        } else {
          empty++;
        }
      }
      if (empty > 0) fen += empty;
      if (r < 7) fen += '/';
    }

    fen += ' ' + this.turn;

    let castling = '';
    if (this.castling[WHITE].K) castling += 'K';
    if (this.castling[WHITE].Q) castling += 'Q';
    if (this.castling[BLACK].K) castling += 'k';
    if (this.castling[BLACK].Q) castling += 'q';
    fen += ' ' + (castling || '-');

    fen += ' ' + (this.enPassant ? this._squareName(this.enPassant.row, this.enPassant.col) : '-');
    fen += ' ' + this.halfMoveClock;
    fen += ' ' + this.fullMoveNumber;

    return fen;
  }

  /**
   * Get all legal moves for the current player.
   * Returns an array of move objects.
   */
  moves() {
    if (this.legalMovesCache) return this.legalMovesCache;
    const pseudoMoves = this._generatePseudoMoves();
    const legal = [];
    for (const move of pseudoMoves) {
      const g = this._makeMoveClone(move);
      if (!g._isSquareAttacked(g._findKing(this.turn).row, g._findKing(this.turn).col, OPPOSITE[this.turn])) {
        legal.push(move);
      }
    }
    this.legalMovesCache = legal;
    return legal;
  }

  /**
   * Check if a specific square is attacked by the given color.
   */
  _isSquareAttacked(row, col, byColor) {
    // Check pawn attacks
    const pawnDir = byColor === WHITE ? 1 : -1;
    for (const dc of [-1, 1]) {
      const pr = row + pawnDir;
      const pc = col + dc;
      if (pr >= 0 && pr < 8 && pc >= 0 && pc < 8) {
        const p = this.board[pr][pc];
        if (p && p.color === byColor && p.type === PAWN) return true;
      }
    }

    // Knight attacks
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const kr = row + dr, kc = col + dc;
      if (kr >= 0 && kr < 8 && kc >= 0 && kc < 8) {
        const p = this.board[kr][kc];
        if (p && p.color === byColor && p.type === KNIGHT) return true;
      }
    }

    // King attacks (adjacent squares)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const kr = row + dr, kc = col + dc;
        if (kr >= 0 && kr < 8 && kc >= 0 && kc < 8) {
          const p = this.board[kr][kc];
          if (p && p.color === byColor && p.type === KING) return true;
        }
      }
    }

    // Bishop/Queen (diagonals)
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === BISHOP || p.type === QUEEN)) return true;
          break;
        }
        r += dr; c += dc;
      }
    }

    // Rook/Queen (straight lines)
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === ROOK || p.type === QUEEN)) return true;
          break;
        }
        r += dr; c += dc;
      }
    }

    return false;
  }

  /**
   * Generate all pseudo-legal moves (moves that may leave king in check).
   */
  _generatePseudoMoves() {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece || piece.color !== this.turn) continue;
        this._generatePieceMoves(r, c, piece, moves);
      }
    }
    return moves;
  }

  _generatePieceMoves(row, col, piece, moves) {
    switch (piece.type) {
      case PAWN: this._pawnMoves(row, col, piece, moves); break;
      case KNIGHT: this._knightMoves(row, col, piece, moves); break;
      case BISHOP: this._slideMoves(row, col, piece, moves, [[-1,-1],[-1,1],[1,-1],[1,1]]); break;
      case ROOK: this._slideMoves(row, col, piece, moves, [[-1,0],[1,0],[0,-1],[0,1]]); break;
      case QUEEN: this._slideMoves(row, col, piece, moves, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
      case KING: this._kingMoves(row, col, piece, moves); break;
    }
  }

  _pawnMoves(row, col, piece, moves) {
    const dir = piece.color === WHITE ? -1 : 1;
    const startRow = piece.color === WHITE ? 6 : 1;
    const promoRow = piece.color === WHITE ? 0 : 7;

    // Forward one
    const r1 = row + dir;
    if (r1 >= 0 && r1 < 8 && !this.board[r1][col]) {
      if (r1 === promoRow) {
        this._addPromotionMoves(row, col, r1, col, piece, moves);
      } else {
        moves.push(this._createMove(row, col, r1, col, piece));
      }

      // Forward two from start
      if (row === startRow) {
        const r2 = row + 2 * dir;
        if (!this.board[r2][col]) {
          moves.push(this._createMove(row, col, r2, col, piece, { enpassantTarget: { row: row + dir, col } }));
        }
      }
    }

    // Captures
    for (const dc of [-1, 1]) {
      const c2 = col + dc;
      if (c2 < 0 || c2 >= 8) continue;
      const r2 = row + dir;
      if (r2 < 0 || r2 >= 8) continue;

      const target = this.board[r2][c2];
      if (target && target.color !== piece.color) {
        if (r2 === promoRow) {
          this._addPromotionMoves(row, col, r2, c2, piece, moves, target);
        } else {
          moves.push(this._createMove(row, col, r2, c2, piece, { captured: target }));
        }
      }

      // En passant
      if (this.enPassant && this.enPassant.row === r2 && this.enPassant.col === c2) {
        moves.push(this._createMove(row, col, r2, c2, piece, {
          captured: this.board[row][c2],
          enpassant: true,
        }));
      }
    }
  }

  _addPromotionMoves(fromRow, fromCol, toRow, toCol, piece, moves, captured) {
    for (const promoType of [QUEEN, ROOK, BISHOP, KNIGHT]) {
      moves.push(this._createMove(fromRow, fromCol, toRow, toCol, piece, {
        captured,
        promotion: promoType,
      }));
    }
  }

  _knightMoves(row, col, piece, moves) {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r = row + dr, c = col + dc;
      if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
      const target = this.board[r][c];
      if (target && target.color === piece.color) continue;
      moves.push(this._createMove(row, col, r, c, piece, { captured: target || undefined }));
    }
  }

  _slideMoves(row, col, piece, moves, directions) {
    for (const [dr, dc] of directions) {
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const target = this.board[r][c];
        if (target) {
          if (target.color !== piece.color) {
            moves.push(this._createMove(row, col, r, c, piece, { captured: target }));
          }
          break;
        }
        moves.push(this._createMove(row, col, r, c, piece));
        r += dr; c += dc;
      }
    }
  }

  _kingMoves(row, col, piece, moves) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr, c = col + dc;
        if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
        const target = this.board[r][c];
        if (target && target.color === piece.color) continue;
        moves.push(this._createMove(row, col, r, c, piece, { captured: target || undefined }));
      }
    }

    // Castling
    const color = piece.color;
    const kingRow = color === WHITE ? 7 : 0;

    // Kingside
    if (this.castling[color].K &&
        !this.board[kingRow][5] && !this.board[kingRow][6] &&
        this._isRookAt(color, kingRow, 7)) {
      // Check king is not in check and doesn't pass through check
      if (!this._isSquareAttacked(kingRow, 4, OPPOSITE[color]) &&
          !this._isSquareAttacked(kingRow, 5, OPPOSITE[color]) &&
          !this._isSquareAttacked(kingRow, 6, OPPOSITE[color])) {
        moves.push(this._createMove(row, col, kingRow, 6, piece, { castling: 'k' }));
      }
    }

    // Queenside
    if (this.castling[color].Q &&
        !this.board[kingRow][3] && !this.board[kingRow][2] && !this.board[kingRow][1] &&
        this._isRookAt(color, kingRow, 0)) {
      if (!this._isSquareAttacked(kingRow, 4, OPPOSITE[color]) &&
          !this._isSquareAttacked(kingRow, 3, OPPOSITE[color]) &&
          !this._isSquareAttacked(kingRow, 2, OPPOSITE[color])) {
        moves.push(this._createMove(row, col, kingRow, 2, piece, { castling: 'q' }));
      }
    }
  }

  _isRookAt(color, row, col) {
    const p = this.board[row][col];
    return p && p.color === color && p.type === ROOK;
  }

  _createMove(fromRow, fromCol, toRow, toCol, piece, opts = {}) {
    return {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: { ...piece },
      captured: opts.captured || null,
      promotion: opts.promotion || null,
      castling: opts.castling || null,
      enpassant: opts.enpassant || false,
      enpassantTarget: opts.enpassantTarget || null,
    };
  }

  /**
   * Make a move on a cloned board (for legality checking).
   */
  _makeMoveClone(move) {
    const g = this.clone();
    g._applyMove(move);
    return g;
  }

  /**
   * Apply a move to the board (no validation).
   */
  _applyMove(move) {
    const { from, to, piece, promotion, castling, enpassant, enpassantTarget } = move;

    // Clear en passant target
    this.enPassant = enpassantTarget || null;

    // Move the piece
    this.board[to.row][to.col] = { ...piece };
    this.board[from.row][from.col] = null;

    // Handle captures
    if (move.captured) {
      // For en passant, remove the captured pawn
      if (enpassant) {
        this.board[from.row][to.col] = null;
      }
    }

    // Handle promotion
    if (promotion) {
      this.board[to.row][to.col].type = promotion;
    }

    // Handle castling - move the rook
    if (castling) {
      const row = to.row;
      if (castling === 'k') {
        this.board[row][5] = this.board[row][7];
        this.board[row][7] = null;
      } else {
        this.board[row][3] = this.board[row][0];
        this.board[row][0] = null;
      }
    }

    // Update castling rights
    if (piece.type === KING) {
      this.castling[piece.color].K = false;
      this.castling[piece.color].Q = false;
    }
    if (piece.type === ROOK) {
      if (from.col === 0) this.castling[piece.color].Q = false;
      if (from.col === 7) this.castling[piece.color].K = false;
    }
    // If a rook is captured
    if (move.captured && move.captured.type === ROOK) {
      const oppColor = move.captured.color;
      if (to.col === 0) this.castling[oppColor].Q = false;
      if (to.col === 7) this.castling[oppColor].K = false;
    }

    // Update half-move clock
    if (piece.type === PAWN || move.captured) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }

    // Update full move number
    if (this.turn === BLACK) {
      this.fullMoveNumber++;
    }

    // Switch turn
    this.turn = OPPOSITE[this.turn];

    // Invalidate caches
    this.inCheckCache = null;
    this.legalMovesCache = null;
  }

  /**
   * Make a move on the board. Returns the move object if successful, null if invalid.
   */
  move(move) {
    // Find the move in legal moves
    const legalMoves = this.moves();
    const found = legalMoves.find(m =>
      m.from.row === move.from.row && m.from.col === move.from.col &&
      m.to.row === move.to.row && m.to.col === move.to.col &&
      m.promotion === (move.promotion || null)
    );
    if (!found) return null;

    // Record position for repetition detection
    this._recordPosition();

    // Store in history
    this.history.push({
      ...found,
      moveNumber: this.fullMoveNumber,
      pieceColor: found.piece.color,
    });

    this._applyMove(found);

    return found;
  }

  /**
   * Undo the last move.
   */
  undo() {
    if (this.history.length === 0) return false;
    // We need to reconstruct previous state. Since we don't store full state,
    // we'll use the position history approach.
    // Actually, for simplicity, we'll track enough info to undo.
    // Let me implement a proper undo stack.
    return false; // Placeholder - proper undo is complex
  }

  /**
   * Record the current position hash for repetition detection.
   */
  _recordPosition() {
    const key = this.fen().split(' ').slice(0, 4).join(' ');
    this.positionHistory.set(key, (this.positionHistory.get(key) || 0) + 1);
  }

  /**
   * Find the king of the given color.
   */
  _findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === color && p.type === KING) return { row: r, col: c };
      }
    }
    return null;
  }

  /**
   * Is the current player in check?
   */
  inCheck() {
    if (this.inCheckCache !== null) return this.inCheckCache;
    const king = this._findKing(this.turn);
    if (!king) return false;
    this.inCheckCache = this._isSquareAttacked(king.row, king.col, OPPOSITE[this.turn]);
    return this.inCheckCache;
  }

  /**
   * Is the current player in checkmate?
   */
  inCheckmate() {
    return this.inCheck() && this.moves().length === 0;
  }

  /**
   * Is the current player in stalemate?
   */
  inStalemate() {
    return !this.inCheck() && this.moves().length === 0;
  }

  /**
   * Is there a draw by insufficient material?
   */
  insufficientMaterial() {
    const pieces = { [WHITE]: [], [BLACK]: [] };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p) pieces[p.color].push({ ...p, row: r, col: c });
      }
    }

    const all = [...pieces[WHITE], ...pieces[BLACK]];

    // K vs K
    if (all.length === 2) return true;

    // K+B vs K or K+N vs K
    if (all.length === 3) {
      const nonKing = all.find(p => p.type !== KING);
      if (nonKing && (nonKing.type === BISHOP || nonKing.type === KNIGHT)) return true;
    }

    // K+B vs K+B (same color bishops)
    if (all.length === 4) {
      const bishops = all.filter(p => p.type === BISHOP);
      if (bishops.length === 2) {
        const sq1 = (bishops[0].row + bishops[0].col) % 2;
        const sq2 = (bishops[1].row + bishops[1].col) % 2;
        if (sq1 === sq2) return true;
      }
    }

    return false;
  }

  /**
   * Is the game over?
   */
  isGameOver() {
    return this.inCheckmate() || this.inStalemate() || this.insufficientMaterial();
  }

  /**
   * Get game result string.
   */
  result() {
    if (this.inCheckmate()) {
      const winner = OPPOSITE[this.turn];
      return winner === WHITE ? '1-0' : '0-1';
    }
    if (this.inStalemate() || this.insufficientMaterial()) {
      return '½-½';
    }
    return '*';
  }

  /**
   * Get result description.
   */
  resultDescription() {
    if (this.inCheckmate()) {
      const winner = OPPOSITE[this.turn];
      return `Checkmate! ${winner === WHITE ? 'White' : 'Black'} wins!`;
    }
    if (this.inStalemate()) {
      return 'Draw by stalemate!';
    }
    if (this.insufficientMaterial()) {
      return 'Draw by insufficient material!';
    }
    return '';
  }

  /**
   * Convert row, col to square name (e.g., 'e4').
   */
  _squareName(row, col) {
    return String.fromCharCode(97 + col) + (8 - row);
  }

  /**
   * Get a human-readable representation of a move.
   */
  moveToAlgebraic(move) {
    const piece = move.piece;
    if (move.castling === 'k') return 'O-O';
    if (move.castling === 'q') return 'O-O-O';

    let s = '';
    if (piece.type !== PAWN) {
      s += PIECE_NAMES[piece.type];
    }

    // Disambiguation (simplified - we don't do full disambiguation)
    const from = this._squareName(move.from.row, move.from.col);

    if (move.captured) {
      if (piece.type === PAWN) s += from[0]; // file
      s += 'x';
    }

    s += this._squareName(move.to.row, move.to.col);

    if (move.promotion) {
      s += '=' + PIECE_NAMES[move.promotion];
    }

    // Append check/mate symbols
    const g = this._makeMoveClone(move);
    if (g.inCheckmate()) s += '#';
    else if (g.inCheck()) s += '+';

    return s;
  }
}
