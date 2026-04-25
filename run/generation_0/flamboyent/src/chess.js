/**
 * Flamboyent Chess Engine
 * Full standard chess rules implementation.
 */

// Piece types
export const PIECES = {
  KING: 'k',
  QUEEN: 'q',
  ROOK: 'r',
  BISHOP: 'b',
  KNIGHT: 'n',
  PAWN: 'p'
};

// Colors
export const COLORS = {
  WHITE: 'w',
  BLACK: 'b'
};

// Unicode symbols for rendering
export const UNICODE_PIECES = {
  [COLORS.WHITE]: {
    [PIECES.KING]: '\u2654',
    [PIECES.QUEEN]: '\u2655',
    [PIECES.ROOK]: '\u2656',
    [PIECES.BISHOP]: '\u2657',
    [PIECES.KNIGHT]: '\u2658',
    [PIECES.PAWN]: '\u2659'
  },
  [COLORS.BLACK]: {
    [PIECES.KING]: '\u265A',
    [PIECES.QUEEN]: '\u265B',
    [PIECES.ROOK]: '\u265C',
    [PIECES.BISHOP]: '\u265D',
    [PIECES.KNIGHT]: '\u265E',
    [PIECES.PAWN]: '\u265F'
  }
};

// Piece values for evaluation
export const PIECE_VALUES = {
  [PIECES.PAWN]: 100,
  [PIECES.KNIGHT]: 320,
  [PIECES.BISHOP]: 330,
  [PIECES.ROOK]: 500,
  [PIECES.QUEEN]: 900,
  [PIECES.KING]: 20000
};

// Initial board setup in FEN-like structure
function createInitialBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRank = [PIECES.ROOK, PIECES.KNIGHT, PIECES.BISHOP, PIECES.QUEEN,
                    PIECES.KING, PIECES.BISHOP, PIECES.KNIGHT, PIECES.ROOK];

  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRank[col], color: COLORS.BLACK };
    board[1][col] = { type: PIECES.PAWN, color: COLORS.BLACK };
    board[6][col] = { type: PIECES.PAWN, color: COLORS.WHITE };
    board[7][col] = { type: backRank[col], color: COLORS.WHITE };
  }

  return board;
}

export class Chess {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = createInitialBoard();
    this.turn = COLORS.WHITE;
    this.castlingRights = {
      [COLORS.WHITE]: { kingSide: true, queenSide: true },
      [COLORS.BLACK]: { kingSide: true, queenSide: true }
    };
    this.enPassantTarget = null; // { row, col } or null
    this.kings = {
      [COLORS.WHITE]: { row: 7, col: 4 },
      [COLORS.BLACK]: { row: 0, col: 4 }
    };
    this.moveHistory = [];
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.gameOver = false;
    this.gameResult = null; // '1-0', '0-1', '½-½'
    this.gameResultReason = null;
    this.positionHistory = new Map(); // for repetition detection
    this._updatePositionHash();
  }

  /**
   * Get the piece at a given position.
   */
  getPiece(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.board[row][col];
  }

  /**
   * Get the color of the piece at a given position.
   */
  getPieceColor(row, col) {
    const piece = this.getPiece(row, col);
    return piece ? piece.color : null;
  }

  /**
   * Check if a square is occupied.
   */
  isOccupied(row, col) {
    return this.getPiece(row, col) !== null;
  }

  /**
   * Check if a square is occupied by the given color.
   */
  isOccupiedBy(row, col, color) {
    const piece = this.getPiece(row, col);
    return piece !== null && piece.color === color;
  }

  /**
   * Check if a square is within the board.
   */
  isInBounds(row, col) {
    return row >= 0 && row <= 7 && col >= 0 && col <= 7;
  }

  /**
   * Generate pseudo-legal moves for a piece at (row, col).
   * These moves are valid according to piece movement rules but may leave the king in check.
   */
  getPseudoLegalMoves(row, col) {
    const piece = this.getPiece(row, col);
    if (!piece) return [];

    const moves = [];
    const color = piece.color;
    const enemy = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

    switch (piece.type) {
      case PIECES.PAWN:
        this._pawnMoves(row, col, color, enemy, moves);
        break;
      case PIECES.KNIGHT:
        this._knightMoves(row, col, color, enemy, moves);
        break;
      case PIECES.BISHOP:
        this._slidingMoves(row, col, color, enemy, moves, [[1,1],[1,-1],[-1,1],[-1,-1]]);
        break;
      case PIECES.ROOK:
        this._slidingMoves(row, col, color, enemy, moves, [[0,1],[0,-1],[1,0],[-1,0]]);
        break;
      case PIECES.QUEEN:
        this._slidingMoves(row, col, color, enemy, moves, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);
        break;
      case PIECES.KING:
        this._kingMoves(row, col, color, enemy, moves);
        break;
    }

    return moves;
  }

  /**
   * Generate legal moves for a piece at (row, col).
   * These are pseudo-legal moves filtered by whether they leave the king in check.
   */
  getLegalMoves(row, col) {
    const piece = this.getPiece(row, col);
    if (!piece || piece.color !== this.turn) return [];

    const pseudoMoves = this.getPseudoLegalMoves(row, col);
    const legalMoves = [];

    for (const move of pseudoMoves) {
      this._makeMoveInternal(move);
      const inCheck = this.isInCheck(this.turn);
      this._undoMoveInternal();

      if (!inCheck) {
        legalMoves.push(move);
      }
    }

    return legalMoves;
  }

  /**
   * Get all legal moves for the current turn.
   */
  getAllLegalMoves() {
    const moves = [];
    const color = this.turn;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === color) {
          const pieceMoves = this.getLegalMoves(row, col);
          moves.push(...pieceMoves);
        }
      }
    }

    return moves;
  }

  /**
   * Check if the given color's king is in check.
   */
  isInCheck(color) {
    const king = this.kings[color];
    if (!king) return false;
    const enemy = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

    // Check if any enemy piece attacks the king's square
    return this.isSquareAttacked(king.row, king.col, enemy);
  }

  /**
   * Check if a square is attacked by the given color.
   */
  isSquareAttacked(row, col, attackingColor) {
    // Check knight attacks
    const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightMoves) {
      const r = row + dr;
      const c = col + dc;
      if (this.isInBounds(r, c)) {
        const piece = this.board[r][c];
        if (piece && piece.color === attackingColor && piece.type === PIECES.KNIGHT) {
          return true;
        }
      }
    }

    // Check king attacks (adjacent squares)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (this.isInBounds(r, c)) {
          const piece = this.board[r][c];
          if (piece && piece.color === attackingColor && piece.type === PIECES.KING) {
            return true;
          }
        }
      }
    }

    // Check pawn attacks
    const pawnDir = attackingColor === COLORS.WHITE ? -1 : 1; // pawns move up for white, down for black
    const pawnAttacks = [[pawnDir, -1], [pawnDir, 1]];
    for (const [dr, dc] of pawnAttacks) {
      const r = row + dr;
      const c = col + dc;
      if (this.isInBounds(r, c)) {
        const piece = this.board[r][c];
        if (piece && piece.color === attackingColor && piece.type === PIECES.PAWN) {
          return true;
        }
      }
    }

    // Check sliding pieces (bishop, rook, queen) along rays
    const directions = {
      straight: [[0,1],[0,-1],[1,0],[-1,0]],
      diagonal: [[1,1],[1,-1],[-1,1],[-1,-1]]
    };

    // Check straight directions for rook/queen
    for (const [dr, dc] of directions.straight) {
      let r = row + dr;
      let c = col + dc;
      while (this.isInBounds(r, c)) {
        const piece = this.board[r][c];
        if (piece) {
          if (piece.color === attackingColor &&
              (piece.type === PIECES.ROOK || piece.type === PIECES.QUEEN)) {
            return true;
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }

    // Check diagonal directions for bishop/queen
    for (const [dr, dc] of directions.diagonal) {
      let r = row + dr;
      let c = col + dc;
      while (this.isInBounds(r, c)) {
        const piece = this.board[r][c];
        if (piece) {
          if (piece.color === attackingColor &&
              (piece.type === PIECES.BISHOP || piece.type === PIECES.QUEEN)) {
            return true;
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }

    return false;
  }

  /**
   * Make a move on the board. Returns the move object if successful, null otherwise.
   */
  makeMove(move) {
    // Ensure the move is legal
    const legalMoves = this.getLegalMoves(move.from.row, move.from.col);
    const legalMove = legalMoves.find(m =>
      m.to.row === move.to.row && m.to.col === move.to.col
    );
    if (!legalMove) return null;

    // Execute the move
    this._makeMoveInternal(legalMove);

    // Switch turns
    this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    this.fullMoveNumber += (this.turn === COLORS.WHITE) ? 1 : 0;

    // Update position hash for repetition detection
    this._updatePositionHash();

    // Check game state
    this._checkGameState();

    return legalMove;
  }

  /**
   * Make a move (from the AI or UI) without legality checking.
   */
  makeMoveDirect(move) {
    this._makeMoveInternal(move);
    this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    this.fullMoveNumber += (this.turn === COLORS.WHITE) ? 1 : 0;
    this._updatePositionHash();
    this._checkGameState();
    return move;
  }

  /**
   * Undo the last move.
   */
  undoMove() {
    if (this.moveHistory.length === 0) return null;
    const move = this.moveHistory.pop();
    this._undoMoveInternal();
    this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    this.fullMoveNumber -= (this.turn === COLORS.WHITE) ? 1 : 0;
    this.positionHistory = new Map(); // reset position history (can't easily undo)
    this.gameOver = false;
    this.gameResult = null;
    this.gameResultReason = null;
    return move;
  }

  /**
   * Get the current game state.
   */
  getGameState() {
    if (this.gameOver) {
      return {
        status: this.gameResultReason,
        result: this.gameResult,
        winner: this.gameResult === '1-0' ? COLORS.WHITE :
                this.gameResult === '0-1' ? COLORS.BLACK : null,
        inCheck: this.isInCheck(this.turn)
      };
    }

    const inCheck = this.isInCheck(this.turn);
    const hasLegalMoves = this.getAllLegalMoves().length > 0;

    if (inCheck && !hasLegalMoves) {
      // Checkmate - but not set yet, compute it
      const winner = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      return {
        status: 'checkmate',
        result: winner === COLORS.WHITE ? '1-0' : '0-1',
        winner,
        inCheck: true
      };
    }

    if (!inCheck && !hasLegalMoves) {
      return {
        status: 'stalemate',
        result: '½-½',
        winner: null,
        inCheck: false
      };
    }

    if (this._isInsufficientMaterial()) {
      return {
        status: 'insufficient',
        result: '½-½',
        winner: null,
        inCheck: false
      };
    }

    return {
      status: 'playing',
      result: null,
      winner: null,
      inCheck
    };
  }

  /**
   * Internal move execution without turn switching or game state checks.
   */
  _makeMoveInternal(move) {
    const piece = this.board[move.from.row][move.from.col];

    // Save state for undo
    const state = {
      from: { ...move.from },
      to: { ...move.to },
      piece: { ...piece },
      captured: move.captured ? { ...move.captured } : null,
      castling: move.castling || null,
      enPassant: move.enPassant || false,
      promotion: move.promotion || null,
      rookFrom: move.rookFrom ? { ...move.rookFrom } : null,
      rookTo: move.rookTo ? { ...move.rookTo } : null,
      enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
      castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
      halfMoveClock: this.halfMoveClock,
      kingPositions: {
        [COLORS.WHITE]: { ...this.kings[COLORS.WHITE] },
        [COLORS.BLACK]: { ...this.kings[COLORS.BLACK] }
      }
    };
    this.moveHistory.push(state);

    // Reset en passant target
    this.enPassantTarget = null;

    // Move the piece
    this.board[move.to.row][move.to.col] = piece;
    this.board[move.from.row][move.from.col] = null;

    // Update king position if king moved
    if (piece.type === PIECES.KING) {
      this.kings[piece.color] = { row: move.to.row, col: move.to.col };
    }

    // Handle captures
    if (move.captured) {
      this.halfMoveClock = 0;
    }

    // Handle en passant
    if (move.enPassant) {
      // Remove the captured pawn
      this.board[move.from.row][move.to.col] = null;
    }

    // Set en passant target for double pawn push
    if (piece.type === PIECES.PAWN && Math.abs(move.to.row - move.from.row) === 2) {
      this.enPassantTarget = {
        row: (move.from.row + move.to.row) / 2,
        col: move.from.col
      };
    }

    // Handle castling
    if (move.castling) {
      const color = piece.color;
      if (move.castling === 'K') {
        // Kingside: rook from col 7 to col 5
        this.board[move.to.row][5] = this.board[move.to.row][7];
        this.board[move.to.row][7] = null;
      } else if (move.castling === 'Q') {
        // Queenside: rook from col 0 to col 3
        this.board[move.to.row][3] = this.board[move.to.row][0];
        this.board[move.to.row][0] = null;
      }
    }

    // Handle promotion
    if (move.promotion) {
      this.board[move.to.row][move.to.col] = {
        type: move.promotion,
        color: piece.color
      };
    }

    // Update castling rights
    if (piece.type === PIECES.KING) {
      this.castlingRights[piece.color].kingSide = false;
      this.castlingRights[piece.color].queenSide = false;
    }
    if (piece.type === PIECES.ROOK) {
      if (move.from.col === 0) {
        this.castlingRights[piece.color].queenSide = false;
      } else if (move.from.col === 7) {
        this.castlingRights[piece.color].kingSide = false;
      }
    }
    // If a rook is captured
    if (move.captured && move.captured.type === PIECES.ROOK) {
      const enemy = piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      if (move.to.col === 0) {
        this.castlingRights[enemy].queenSide = false;
      } else if (move.to.col === 7) {
        this.castlingRights[enemy].kingSide = false;
      }
    }

    // Update half move clock for pawn moves
    if (piece.type === PIECES.PAWN) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }
  }

  /**
   * Undo the last internal move.
   */
  _undoMoveInternal() {
    const state = this.moveHistory.pop();

    // Restore board state
    this.board[state.from.row][state.from.col] = state.piece;
    this.board[state.to.row][state.to.col] = state.captured;

    // Restore en passant target
    this.enPassantTarget = state.enPassantTarget;

    // Restore castling rights
    this.castlingRights = state.castlingRights;

    // Restore half move clock
    this.halfMoveClock = state.halfMoveClock;

    // Restore king positions
    this.kings[COLORS.WHITE] = state.kingPositions[COLORS.WHITE];
    this.kings[COLORS.BLACK] = state.kingPositions[COLORS.BLACK];

    // Undo en passant capture
    if (state.enPassant) {
      const enemy = state.piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      this.board[state.from.row][state.to.col] = { type: PIECES.PAWN, color: enemy };
    }

    // Undo castling rook movement
    if (state.castling) {
      const color = state.piece.color;
      if (state.castling === 'K') {
        this.board[state.to.row][7] = this.board[state.to.row][5];
        this.board[state.to.row][5] = null;
      } else if (state.castling === 'Q') {
        this.board[state.to.row][0] = this.board[state.to.row][3];
        this.board[state.to.row][3] = null;
      }
    }

    // Undo promotion (piece is already restored from state.piece)
    // No additional action needed since we restored the original piece

    // Push back to history for possible re-undo? No, we just popped it.
    // Actually we need to push it back so it's consistent for further operations.
    // But _undoMoveInternal is called internally, so we already popped it.
    // Let me re-think: we popped to read the state, but we want history to remain
    // consistent if someone calls undoMove again.
    // Actually, the pattern is: _makeMoveInternal pushes state, _undoMoveInternal pops it.
    // So after _undoMoveInternal, the move is fully undone and removed from history.
    // This is correct.
  }

  /**
   * Check game state and update gameOver/gameResult.
   */
  _checkGameState() {
    const state = this.getGameState();
    if (state.status !== 'playing') {
      this.gameOver = true;
      this.gameResult = state.result;
      this.gameResultReason = state.status;
    }
  }

  /**
   * Update position hash for repetition detection.
   */
  _updatePositionHash() {
    const hash = this._getPositionHash();
    const count = this.positionHistory.get(hash) || 0;
    this.positionHistory.set(hash, count + 1);
  }

  /**
   * Generate a hash string for the current board position.
   */
  _getPositionHash() {
    let hash = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece) {
          hash += piece.color + piece.type;
        } else {
          hash += '--';
        }
      }
    }
    hash += this.turn;
    hash += this.castlingRights[COLORS.WHITE].kingSide ? 'K' : '';
    hash += this.castlingRights[COLORS.WHITE].queenSide ? 'Q' : '';
    hash += this.castlingRights[COLORS.BLACK].kingSide ? 'k' : '';
    hash += this.castlingRights[COLORS.BLACK].queenSide ? 'q' : '';
    hash += this.enPassantTarget ? `${this.enPassantTarget.row}${this.enPassantTarget.col}` : '';
    return hash;
  }

  /**
   * Check for insufficient material draw.
   */
  _isInsufficientMaterial() {
    const pieces = { [COLORS.WHITE]: [], [COLORS.BLACK]: [] };
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece) {
          pieces[piece.color].push({ ...piece, row, col });
        }
      }
    }

    const allPieces = [...pieces[COLORS.WHITE], ...pieces[COLORS.BLACK]];

    // Only kings
    if (allPieces.length === 2) return true;

    // King + bishop vs king
    // King + knight vs king
    if (allPieces.length === 3) {
      const nonKing = allPieces.find(p => p.type !== PIECES.KING);
      if (nonKing && (nonKing.type === PIECES.BISHOP || nonKing.type === PIECES.KNIGHT)) {
        return true;
      }
    }

    // King + bishop vs king + bishop (same color bishops)
    if (allPieces.length === 4) {
      const bishops = allPieces.filter(p => p.type === PIECES.BISHOP);
      if (bishops.length === 2) {
        const squareColor1 = (bishops[0].row + bishops[0].col) % 2;
        const squareColor2 = (bishops[1].row + bishops[1].col) % 2;
        if (squareColor1 === squareColor2) return true;
      }
    }

    return false;
  }

  // ============ Move Generation Helpers ============

  _pawnMoves(row, col, color, enemy, moves) {
    const direction = color === COLORS.WHITE ? -1 : 1;
    const startRow = color === COLORS.WHITE ? 6 : 1;
    const promoteRow = color === COLORS.WHITE ? 0 : 7;

    // Forward one square
    const forwardRow = row + direction;
    if (this.isInBounds(forwardRow, col) && !this.isOccupied(forwardRow, col)) {
      if (forwardRow === promoteRow) {
        // Promotion
        for (const promoType of [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT]) {
          moves.push({
            from: { row, col },
            to: { row: forwardRow, col },
            piece: { type: PIECES.PAWN, color },
            captured: null,
            castling: null,
            enPassant: false,
            promotion: promoType,
            rookFrom: null,
            rookTo: null
          });
        }
      } else {
        moves.push({
          from: { row, col },
          to: { row: forwardRow, col },
          piece: { type: PIECES.PAWN, color },
          captured: null,
          castling: null,
          enPassant: false,
          promotion: null,
          rookFrom: null,
          rookTo: null
        });
      }
    }

    // Forward two squares from start
    if (row === startRow) {
      const twoForwardRow = row + 2 * direction;
      const intermediateRow = row + direction;
      if (!this.isOccupied(twoForwardRow, col) && !this.isOccupied(intermediateRow, col)) {
        moves.push({
          from: { row, col },
          to: { row: twoForwardRow, col },
          piece: { type: PIECES.PAWN, color },
          captured: null,
          castling: null,
          enPassant: false,
          promotion: null,
          rookFrom: null,
          rookTo: null
        });
      }
    }

    // Captures (diagonal)
    for (const dc of [-1, 1]) {
      const captureCol = col + dc;
      if (!this.isInBounds(forwardRow, captureCol)) continue;

      // Normal capture
      if (this.isOccupiedBy(forwardRow, captureCol, enemy)) {
        if (forwardRow === promoteRow) {
          for (const promoType of [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT]) {
            moves.push({
              from: { row, col },
              to: { row: forwardRow, col: captureCol },
              piece: { type: PIECES.PAWN, color },
              captured: this.board[forwardRow][captureCol],
              castling: null,
              enPassant: false,
              promotion: promoType,
              rookFrom: null,
              rookTo: null
            });
          }
        } else {
          moves.push({
            from: { row, col },
            to: { row: forwardRow, col: captureCol },
            piece: { type: PIECES.PAWN, color },
            captured: this.board[forwardRow][captureCol],
            castling: null,
            enPassant: false,
            promotion: null,
            rookFrom: null,
            rookTo: null
          });
        }
      }

      // En passant
      if (this.enPassantTarget &&
          this.enPassantTarget.row === forwardRow &&
          this.enPassantTarget.col === captureCol) {
        moves.push({
          from: { row, col },
          to: { row: forwardRow, col: captureCol },
          piece: { type: PIECES.PAWN, color },
          captured: { type: PIECES.PAWN, color: enemy }, // Will be removed from the square
          castling: null,
          enPassant: true,
          promotion: null,
          rookFrom: null,
          rookTo: null
        });
      }
    }
  }

  _knightMoves(row, col, color, enemy, moves) {
    const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightOffsets) {
      const r = row + dr;
      const c = col + dc;
      if (!this.isInBounds(r, c)) continue;
      if (!this.isOccupied(r, c) || this.isOccupiedBy(r, c, enemy)) {
        moves.push({
          from: { row, col },
          to: { row: r, col: c },
          piece: { type: PIECES.KNIGHT, color },
          captured: this.board[r][c],
          castling: null,
          enPassant: false,
          promotion: null,
          rookFrom: null,
          rookTo: null
        });
      }
    }
  }

  _slidingMoves(row, col, color, enemy, moves, directions) {
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (this.isInBounds(r, c)) {
        if (this.isOccupiedBy(r, c, color)) break;
        moves.push({
          from: { row, col },
          to: { row: r, col: c },
          piece: this.board[row][col],
          captured: this.board[r][c],
          castling: null,
          enPassant: false,
          promotion: null,
          rookFrom: null,
          rookTo: null
        });
        if (this.isOccupiedBy(r, c, enemy)) break;
        r += dr;
        c += dc;
      }
    }
  }

  _kingMoves(row, col, color, enemy, moves) {
    // Normal king moves
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (!this.isInBounds(r, c)) continue;
        if (!this.isOccupied(r, c) || this.isOccupiedBy(r, c, enemy)) {
          moves.push({
            from: { row, col },
            to: { row: r, col: c },
            piece: { type: PIECES.KING, color },
            captured: this.board[r][c],
            castling: null,
            enPassant: false,
            promotion: null,
            rookFrom: null,
            rookTo: null
          });
        }
      }
    }

    // Castling
    const castleY = color === COLORS.WHITE ? 7 : 0;
    if (row === castleY && col === 4) {
      // Kingside castling
      if (this.castlingRights[color].kingSide &&
          !this.isOccupied(castleY, 5) && !this.isOccupied(castleY, 6) &&
          this.board[castleY][7] && this.board[castleY][7].type === PIECES.ROOK &&
          this.board[castleY][7].color === color &&
          !this.isSquareAttacked(castleY, 4, enemy) &&
          !this.isSquareAttacked(castleY, 5, enemy) &&
          !this.isSquareAttacked(castleY, 6, enemy)) {
        moves.push({
          from: { row: castleY, col: 4 },
          to: { row: castleY, col: 6 },
          piece: { type: PIECES.KING, color },
          captured: null,
          castling: 'K',
          enPassant: false,
          promotion: null,
          rookFrom: { row: castleY, col: 7 },
          rookTo: { row: castleY, col: 5 }
        });
      }

      // Queenside castling
      if (this.castlingRights[color].queenSide &&
          !this.isOccupied(castleY, 3) && !this.isOccupied(castleY, 2) && !this.isOccupied(castleY, 1) &&
          this.board[castleY][0] && this.board[castleY][0].type === PIECES.ROOK &&
          this.board[castleY][0].color === color &&
          !this.isSquareAttacked(castleY, 4, enemy) &&
          !this.isSquareAttacked(castleY, 3, enemy) &&
          !this.isSquareAttacked(castleY, 2, enemy)) {
        moves.push({
          from: { row: castleY, col: 4 },
          to: { row: castleY, col: 2 },
          piece: { type: PIECES.KING, color },
          captured: null,
          castling: 'Q',
          enPassant: false,
          promotion: null,
          rookFrom: { row: castleY, col: 0 },
          rookTo: { row: castleY, col: 3 }
        });
      }
    }
  }

  /**
   * Convert move to algebraic notation (for display purposes).
   */
  moveToAlgebraic(move) {
    const files = 'abcdefgh';
    const piece = move.piece;

    let notation = '';

    if (move.castling === 'K') return 'O-O';
    if (move.castling === 'Q') return 'O-O-O';

    // Piece letter (except pawns)
    if (piece.type !== PIECES.PAWN) {
      notation += piece.type.toUpperCase();
    }

    // Captures
    if (move.captured || move.enPassant) {
      if (piece.type === PIECES.PAWN) {
        notation += files[move.from.col];
      }
      notation += 'x';
    }

    // Destination square
    notation += files[move.to.col] + (8 - move.to.row);

    // Promotion
    if (move.promotion) {
      notation += '=' + move.promotion.toUpperCase();
    }

    return notation;
  }

  /**
   * Create a FEN string for the current position.
   */
  toFen() {
    let fen = '';
    for (let row = 0; row < 8; row++) {
      let emptyCount = 0;
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          const p = piece.type.toUpperCase();
          fen += piece.color === COLORS.WHITE ? p : p.toLowerCase();
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) fen += emptyCount;
      if (row < 7) fen += '/';
    }

    fen += ' ' + this.turn;
    fen += ' ';

    let castle = '';
    if (this.castlingRights[COLORS.WHITE].kingSide) castle += 'K';
    if (this.castlingRights[COLORS.WHITE].queenSide) castle += 'Q';
    if (this.castlingRights[COLORS.BLACK].kingSide) castle += 'k';
    if (this.castlingRights[COLORS.BLACK].queenSide) castle += 'q';
    fen += castle || '-';

    fen += ' ';
    if (this.enPassantTarget) {
      const files = 'abcdefgh';
      fen += files[this.enPassantTarget.col] + (8 - this.enPassantTarget.row);
    } else {
      fen += '-';
    }

    fen += ' ' + this.halfMoveClock;
    fen += ' ' + this.fullMoveNumber;

    return fen;
  }

  /**
   * Clone the current game state.
   */
  clone() {
    const chess = new Chess();
    // Reset and set up from internal data
    chess.board = JSON.parse(JSON.stringify(this.board));
    chess.turn = this.turn;
    chess.castlingRights = JSON.parse(JSON.stringify(this.castlingRights));
    chess.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    chess.kings = JSON.parse(JSON.stringify(this.kings));
    chess.moveHistory = []; // Don't clone history (optimization for AI)
    chess.halfMoveClock = this.halfMoveClock;
    chess.fullMoveNumber = this.fullMoveNumber;
    chess.gameOver = this.gameOver;
    chess.gameResult = this.gameResult;
    chess.gameResultReason = this.gameResultReason;
    return chess;
  }

  /**
   * Load a position from a FEN string.
   */
  loadFen(fen) {
    const parts = fen.split(' ');
    const boardPart = parts[0];
    const turnPart = parts[1];
    const castlingPart = parts[2];
    const enPassantPart = parts[3];
    const halfMovePart = parts[4] || '0';
    const fullMovePart = parts[5] || '1';

    this.reset();

    const rows = boardPart.split('/');
    for (let row = 0; row < 8; row++) {
      let col = 0;
      for (const char of rows[row]) {
        if (char >= '1' && char <= '8') {
          col += parseInt(char);
        } else {
          const isUpper = char === char.toUpperCase();
          const color = isUpper ? COLORS.WHITE : COLORS.BLACK;
          const type = char.toLowerCase();
          this.board[row][col] = { type, color };
          if (type === PIECES.KING) {
            this.kings[color] = { row, col };
          }
          col++;
        }
      }
    }

    this.turn = turnPart;
    this.castlingRights = {
      [COLORS.WHITE]: { kingSide: false, queenSide: false },
      [COLORS.BLACK]: { kingSide: false, queenSide: false }
    };
    if (castlingPart !== '-') {
      if (castlingPart.includes('K')) this.castlingRights[COLORS.WHITE].kingSide = true;
      if (castlingPart.includes('Q')) this.castlingRights[COLORS.WHITE].queenSide = true;
      if (castlingPart.includes('k')) this.castlingRights[COLORS.BLACK].kingSide = true;
      if (castlingPart.includes('q')) this.castlingRights[COLORS.BLACK].queenSide = true;
    }

    if (enPassantPart !== '-') {
      const files = 'abcdefgh';
      const file = enPassantPart[0];
      const rank = parseInt(enPassantPart[1]);
      this.enPassantTarget = {
        row: 8 - rank,
        col: files.indexOf(file)
      };
    } else {
      this.enPassantTarget = null;
    }

    this.halfMoveClock = parseInt(halfMovePart);
    this.fullMoveNumber = parseInt(fullMovePart);

    this._updatePositionHash();
    this._checkGameState();
  }
}
