/**
 * Chess Engine - Full standard chess rules implementation.
 * No external dependencies.
 */

// Piece types
export const PAWN = 'pawn';
export const KNIGHT = 'knight';
export const BISHOP = 'bishop';
export const ROOK = 'rook';
export const QUEEN = 'queen';
export const KING = 'king';

export const WHITE = 'white';
export const BLACK = 'black';

export const PIECE_VALUES = {
  [PAWN]: 100,
  [KNIGHT]: 320,
  [BISHOP]: 330,
  [ROOK]: 500,
  [QUEEN]: 900,
  [KING]: 20000,
};

// Unicode symbols for pieces
export const PIECE_SYMBOLS = {
  [WHITE]: {
    [KING]: '♔',
    [QUEEN]: '♕',
    [ROOK]: '♖',
    [BISHOP]: '♗',
    [KNIGHT]: '♘',
    [PAWN]: '♙',
  },
  [BLACK]: {
    [KING]: '♚',
    [QUEEN]: '♛',
    [ROOK]: '♜',
    [BISHOP]: '♝',
    [KNIGHT]: '♞',
    [PAWN]: '♟',
  },
};

// Piece-square tables for evaluation (from white's perspective, flip for black)
const PST = {
  [PAWN]: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0],
  ],
  [KNIGHT]: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  [BISHOP]: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  [ROOK]: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0],
  ],
  [QUEEN]: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  [KING]: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20],
  ],
};

// King middle-game table for evaluation
const KING_MID = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50],
];

function createPiece(type, color) {
  return { type, color };
}

function isColor(piece, color) {
  return piece !== null && piece.color === color;
}

function isValidSquare(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export class ChessGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = this._initBoard();
    this.turn = WHITE;
    this.castlingRights = { K: true, Q: true, k: true, q: true };
    this.enPassantTarget = null;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.moveHistory = [];
    this.positionHistory = [];
    this.kingPositions = {
      [WHITE]: { row: 7, col: 4 },
      [BLACK]: { row: 0, col: 4 },
    };
    this.gameOver = false;
    this.gameResult = null; // '1-0', '0-1', '½-½'
    this.gameResultReason = '';
    this.capturedPieces = { [WHITE]: [], [BLACK]: [] };
    this.lastMove = null;
    this.inCheck = false;
  }

  _initBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));

    const backRank = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];

    for (let col = 0; col < 8; col++) {
      board[0][col] = createPiece(backRank[col], BLACK);
      board[1][col] = createPiece(PAWN, BLACK);
      board[6][col] = createPiece(PAWN, WHITE);
      board[7][col] = createPiece(backRank[col], WHITE);
    }

    return board;
  }

  // Deep clone the game state
  clone() {
    const g = new ChessGame();
    g.board = this.board.map(row => row.map(p => p ? { ...p } : null));
    g.turn = this.turn;
    g.castlingRights = { ...this.castlingRights };
    g.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    g.halfMoveClock = this.halfMoveClock;
    g.fullMoveNumber = this.fullMoveNumber;
    g.moveHistory = this.moveHistory.map(m => ({ ...m }));
    g.kingPositions = {
      [WHITE]: { ...this.kingPositions[WHITE] },
      [BLACK]: { ...this.kingPositions[BLACK] },
    };
    g.gameOver = this.gameOver;
    g.gameResult = this.gameResult;
    g.gameResultReason = this.gameResultReason;
    g.capturedPieces = {
      [WHITE]: [...this.capturedPieces[WHITE]],
      [BLACK]: [...this.capturedPieces[BLACK]],
    };
    g.lastMove = this.lastMove ? { ...this.lastMove } : null;
    g.inCheck = this.inCheck;
    return g;
  }

  /**
   * Generate all pseudo-legal moves for a given side.
   * Pseudo-legal means they follow piece movement rules but may leave king in check.
   */
  _generatePseudoMoves(color) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (!piece || piece.color !== color) continue;
        this._generatePieceMoves(row, col, piece, moves);
      }
    }
    return moves;
  }

  _generatePieceMoves(row, col, piece, moves) {
    switch (piece.type) {
      case PAWN:
        this._pawnMoves(row, col, piece.color, moves);
        break;
      case KNIGHT:
        this._knightMoves(row, col, piece.color, moves);
        break;
      case BISHOP:
        this._slidingMoves(row, col, piece.color, [[1,1],[1,-1],[-1,1],[-1,-1]], moves);
        break;
      case ROOK:
        this._slidingMoves(row, col, piece.color, [[1,0],[-1,0],[0,1],[0,-1]], moves);
        break;
      case QUEEN:
        this._slidingMoves(row, col, piece.color, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]], moves);
        break;
      case KING:
        this._kingMoves(row, col, piece.color, moves);
        break;
    }
  }

  _pawnMoves(row, col, color, moves) {
    const dir = color === WHITE ? -1 : 1;
    const startRow = color === WHITE ? 6 : 1;
    const promoRow = color === WHITE ? 0 : 7;
    const enemy = color === WHITE ? BLACK : WHITE;

    // Single push
    const nr = row + dir;
    if (isValidSquare(nr, col) && !this.board[nr][col]) {
      if (nr === promoRow) {
        // Promotion
        for (const pType of [QUEEN, ROOK, BISHOP, KNIGHT]) {
          moves.push({ from: { row, col }, to: { row: nr, col }, promotion: pType });
        }
      } else {
        moves.push({ from: { row, col }, to: { row: nr, col } });
      }

      // Double push
      if (row === startRow) {
        const nr2 = row + 2 * dir;
        if (!this.board[nr2][col]) {
          moves.push({ from: { row, col }, to: { row: nr2, col } });
        }
      }
    }

    // Captures
    for (const dc of [-1, 1]) {
      const nc = col + dc;
      if (!isValidSquare(nr, nc)) continue;

      // Normal capture
      if (this.board[nr][nc] && this.board[nr][nc].color === enemy) {
        if (nr === promoRow) {
          for (const pType of [QUEEN, ROOK, BISHOP, KNIGHT]) {
            moves.push({ from: { row, col }, to: { row: nr, col: nc }, promotion: pType });
          }
        } else {
          moves.push({ from: { row, col }, to: { row: nr, col: nc } });
        }
      }

      // En passant
      if (this.enPassantTarget &&
          this.enPassantTarget.row === nr &&
          this.enPassantTarget.col === nc) {
        moves.push({
          from: { row, col },
          to: { row: nr, col: nc },
          enPassant: true,
        });
      }
    }
  }

  _knightMoves(row, col, color, moves) {
    const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (!isValidSquare(nr, nc)) continue;
      const target = this.board[nr][nc];
      if (target && target.color === color) continue;
      moves.push({ from: { row, col }, to: { row: nr, col: nc } });
    }
  }

  _slidingMoves(row, col, color, directions, moves) {
    for (const [dr, dc] of directions) {
      let nr = row + dr;
      let nc = col + dc;
      while (isValidSquare(nr, nc)) {
        const target = this.board[nr][nc];
        if (target) {
          if (target.color !== color) {
            moves.push({ from: { row, col }, to: { row: nr, col: nc } });
          }
          break;
        }
        moves.push({ from: { row, col }, to: { row: nr, col: nc } });
        nr += dr;
        nc += dc;
      }
    }
  }

  _kingMoves(row, col, color, moves) {
    const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (!isValidSquare(nr, nc)) continue;
      const target = this.board[nr][nc];
      if (target && target.color === color) continue;
      moves.push({ from: { row, col }, to: { row: nr, col: nc } });
    }

    // Castling
    if (color === WHITE) {
      if (this.castlingRights.K) this._addCastlingMove(row, col, 7, 5, 7, 6, moves);
      if (this.castlingRights.Q) this._addCastlingMove(row, col, 7, 3, 7, 2, moves);
    } else {
      if (this.castlingRights.k) this._addCastlingMove(row, col, 0, 5, 0, 6, moves);
      if (this.castlingRights.q) this._addCastlingMove(row, col, 0, 3, 0, 2, moves);
    }
  }

  _addCastlingMove(row, col, rookRow, rookCol, kingDestCol, kingToCol, moves) {
    // King and rook must be at correct positions
    const kingCol = 4;
    if (col !== kingCol) return;

    const rook = this.board[rookRow][rookCol];
    if (!rook || rook.type !== ROOK) return;

    // Squares between king and rook must be empty
    const minC = Math.min(kingCol, rookCol);
    const maxC = Math.max(kingCol, rookCol);
    for (let c = minC + 1; c < maxC; c++) {
      if (this.board[rookRow][c]) return;
    }

    // King must not be in check, and must not pass through check
    const enemy = this.turn === WHITE ? BLACK : WHITE;
    const step = kingDestCol > kingCol ? 1 : -1;
    for (let c = kingCol; c !== kingToCol + step; c += step) {
      if (this._isSquareAttacked(rookRow, c, enemy)) return;
    }

    moves.push({
      from: { row, col },
      to: { row, col: kingDestCol },
      castling: kingDestCol > kingCol ? 'K' : 'Q',
    });
  }

  /**
   * Check if a square is attacked by the given color.
   */
  _isSquareAttacked(row, col, byColor) {
    // Pawn attacks
    const pawnDir = byColor === WHITE ? 1 : -1;
    for (const dc of [-1, 1]) {
      const pr = row + pawnDir;
      const pc = col + dc;
      if (isValidSquare(pr, pc) && this.board[pr][pc] &&
          this.board[pr][pc].type === PAWN && this.board[pr][pc].color === byColor) {
        return true;
      }
    }

    // Knight attacks
    const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightOffsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (isValidSquare(nr, nc) && this.board[nr][nc] &&
          this.board[nr][nc].type === KNIGHT && this.board[nr][nc].color === byColor) {
        return true;
      }
    }

    // King attacks (adjacent squares)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (isValidSquare(nr, nc) && this.board[nr][nc] &&
            this.board[nr][nc].type === KING && this.board[nr][nc].color === byColor) {
          return true;
        }
      }
    }

    // Sliding pieces (queen, rook, bishop)
    const directions = {
      rook: [[1,0],[-1,0],[0,1],[0,-1]],
      bishop: [[1,1],[1,-1],[-1,1],[-1,-1]],
    };
    for (const [dr, dc] of directions.rook) {
      let nr = row + dr;
      let nc = col + dc;
      while (isValidSquare(nr, nc)) {
        const p = this.board[nr][nc];
        if (p) {
          if (p.color === byColor && (p.type === ROOK || p.type === QUEEN)) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    for (const [dr, dc] of directions.bishop) {
      let nr = row + dr;
      let nc = col + dc;
      while (isValidSquare(nr, nc)) {
        const p = this.board[nr][nc];
        if (p) {
          if (p.color === byColor && (p.type === BISHOP || p.type === QUEEN)) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    return false;
  }

  /**
   * Check if the given color's king is in check.
   */
  isInCheck(color) {
    const kingPos = this.kingPositions[color];
    const enemy = color === WHITE ? BLACK : WHITE;
    return this._isSquareAttacked(kingPos.row, kingPos.col, enemy);
  }

  /**
   * Generate all legal moves for the current turn.
   */
  getLegalMoves() {
    const pseudoMoves = this._generatePseudoMoves(this.turn);
    const legalMoves = [];

    for (const move of pseudoMoves) {
      // Try the move
      const gameCopy = this.clone();
      gameCopy._applyMove(move, true);

      // If the king is not in check after the move, it's legal
      if (!gameCopy.isInCheck(this.turn)) {
        legalMoves.push(move);
      }
    }

    return legalMoves;
  }

  /**
   * Apply a move (internal, no validation).
   */
  _applyMove(move, skipHistory = false) {
    const { from, to } = move;
    const piece = this.board[from.row][from.col];
    const captured = this.board[to.row][to.col];
    const isEnPassant = move.enPassant || false;
    const isCastling = move.castling || false;
    const promotion = move.promotion || null;

    // Save state for history
    const stateSnapshot = {
      board: this.board.map(r => r.map(p => p ? { ...p } : null)),
      turn: this.turn,
      castlingRights: { ...this.castlingRights },
      enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
      halfMoveClock: this.halfMoveClock,
      fullMoveNumber: this.fullMoveNumber,
      kingPositions: {
        [WHITE]: { ...this.kingPositions[WHITE] },
        [BLACK]: { ...this.kingPositions[BLACK] },
      },
      captured: captured ? { ...captured } : null,
    };

    if (!skipHistory) {
      this.moveHistory.push({
        ...move,
        pieceType: piece.type,
        captured: captured ? { ...captured } : null,
        stateSnapshot,
      });
    }

    // Track captured pieces
    if (captured) {
      this.capturedPieces[this.turn === WHITE ? BLACK : WHITE].push(captured);
    }

    // En passant capture
    if (isEnPassant) {
      const epCaptured = this.board[from.row][to.col];
      if (epCaptured) {
        this.board[from.row][to.col] = null;
        this.capturedPieces[this.turn === WHITE ? BLACK : WHITE].push(epCaptured);
      }
    }

    // Move piece
    this.board[to.row][to.col] = piece;
    this.board[from.row][from.col] = null;

    // Update king position
    if (piece.type === KING) {
      this.kingPositions[piece.color] = { row: to.row, col: to.col };
    }

    // Castling - move the rook
    if (isCastling) {
      const color = piece.color;
      const row = to.row;
      if (move.castling === 'K') {
        // Kingside: rook from h to f
        const rook = this.board[row][7];
        this.board[row][5] = rook;
        this.board[row][7] = null;
      } else {
        // Queenside: rook from a to d
        const rook = this.board[row][0];
        this.board[row][3] = rook;
        this.board[row][0] = null;
      }
    }

    // Promotion
    if (promotion) {
      this.board[to.row][to.col] = createPiece(promotion, piece.color);
    }

    // Update en passant target
    this.enPassantTarget = null;
    if (piece.type === PAWN && Math.abs(to.row - from.row) === 2) {
      this.enPassantTarget = {
        row: (from.row + to.row) / 2,
        col: from.col,
      };
    }

    // Update castling rights
    if (piece.type === KING) {
      if (piece.color === WHITE) {
        this.castlingRights.K = false;
        this.castlingRights.Q = false;
      } else {
        this.castlingRights.k = false;
        this.castlingRights.q = false;
      }
    }
    if (piece.type === ROOK) {
      if (from.row === 7 && from.col === 7) this.castlingRights.K = false;
      if (from.row === 7 && from.col === 0) this.castlingRights.Q = false;
      if (from.row === 0 && from.col === 7) this.castlingRights.k = false;
      if (from.row === 0 && from.col === 0) this.castlingRights.q = false;
    }
    // If a rook is captured
    if (captured && captured.type === ROOK) {
      if (to.row === 7 && to.col === 7) this.castlingRights.K = false;
      if (to.row === 7 && to.col === 0) this.castlingRights.Q = false;
      if (to.row === 0 && to.col === 7) this.castlingRights.k = false;
      if (to.row === 0 && to.col === 0) this.castlingRights.q = false;
    }

    // Half-move clock
    if (piece.type === PAWN || captured || isEnPassant) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }

    // Switch turn
    this.turn = this.turn === WHITE ? BLACK : WHITE;
    if (this.turn === WHITE) {
      this.fullMoveNumber++;
    }

    this.lastMove = move;
    this.inCheck = this.isInCheck(this.turn);
  }

  /**
   * Make a move on the board. Returns true if move was made.
   */
  makeMove(move) {
    if (this.gameOver) return false;

    // Find the legal move that matches this one
    const legalMoves = this.getLegalMoves();
    const matchingMove = legalMoves.find(m =>
      m.from.row === move.from.row &&
      m.from.col === move.from.col &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col &&
      (m.promotion || null) === (move.promotion || null)
    );

    if (!matchingMove) return false;

    this._applyMove(matchingMove);

    // Check for game over conditions
    this._checkGameOver();

    return true;
  }

  /**
   * Check and update game-over state.
   */
  _checkGameOver() {
    const legalMoves = this.getLegalMoves();
    const inCheck = this.isInCheck(this.turn);

    if (legalMoves.length === 0) {
      this.gameOver = true;
      if (inCheck) {
        // Checkmate
        this.gameResult = this.turn === WHITE ? '0-1' : '1-0';
        this.gameResultReason = `Checkmate! ${this.turn === WHITE ? 'Black' : 'White'} wins.`;
      } else {
        // Stalemate
        this.gameResult = '½-½';
        this.gameResultReason = 'Stalemate — Draw.';
      }
      return;
    }

    // Insufficient material
    if (this._isInsufficientMaterial()) {
      this.gameOver = true;
      this.gameResult = '½-½';
      this.gameResultReason = 'Draw — Insufficient material.';
      return;
    }

    // Threefold repetition (optional, but let's add it)
    if (this._isThreefoldRepetition()) {
      this.gameOver = true;
      this.gameResult = '½-½';
      this.gameResultReason = 'Draw — Threefold repetition.';
      return;
    }

    // Fifty-move rule
    if (this.halfMoveClock >= 100) {
      this.gameOver = true;
      this.gameResult = '½-½';
      this.gameResultReason = 'Draw — Fifty-move rule.';
      return;
    }
  }

  _isInsufficientMaterial() {
    const pieces = { white: [], black: [] };
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const p = this.board[row][col];
        if (p) {
          pieces[p.color].push({ ...p, row, col });
        }
      }
    }

    const all = [...pieces.white, ...pieces.black];

    // Only kings
    if (all.length === 2) return true;

    // King + bishop/knight vs king
    if (all.length === 3) {
      const nonKing = all.find(p => p.type !== KING);
      if (nonKing && (nonKing.type === BISHOP || nonKing.type === KNIGHT)) {
        return true;
      }
    }

    // King + bishop vs king + bishop (same color bishops)
    if (all.length === 4) {
      const bishops = all.filter(p => p.type === BISHOP);
      if (bishops.length === 2) {
        const color1 = (bishops[0].row + bishops[0].col) % 2;
        const color2 = (bishops[1].row + bishops[1].col) % 2;
        if (color1 === color2) return true;
      }
    }

    return false;
  }

  _isThreefoldRepetition() {
    // Create a simple hash of the current position
    const hash = this._positionHash();
    let count = 1;
    for (const h of this.positionHistory) {
      if (h === hash) count++;
    }
    this.positionHistory.push(hash);
    return count >= 3;
  }

  _positionHash() {
    let s = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) s += '.';
        else s += (p.color === WHITE ? 'w' : 'b') + p.type[0];
      }
    }
    s += this.turn;
    s += this.castlingRights.K ? 'K' : '';
    s += this.castlingRights.Q ? 'Q' : '';
    s += this.castlingRights.k ? 'k' : '';
    s += this.castlingRights.q ? 'q' : '';
    s += this.enPassantTarget ? `${this.enPassantTarget.row}${this.enPassantTarget.col}` : '-';
    return s;
  }

  /**
   * Undo the last move.
   */
  undoMove() {
    if (this.moveHistory.length === 0) return false;

    const lastMove = this.moveHistory.pop();
    const snap = lastMove.stateSnapshot;

    // Restore state from snapshot
    this.board = snap.board;
    this.turn = snap.turn;
    this.castlingRights = snap.castlingRights;
    this.enPassantTarget = snap.enPassantTarget;
    this.halfMoveClock = snap.halfMoveClock;
    this.fullMoveNumber = snap.fullMoveNumber;
    this.kingPositions = snap.kingPositions;
    this.gameOver = false;
    this.gameResult = null;
    this.gameResultReason = '';
    this.inCheck = this.isInCheck(this.turn);
    this.lastMove = this.moveHistory.length > 0
      ? this.moveHistory[this.moveHistory.length - 1]
      : null;

    // Remove from captured
    if (snap.captured) {
      const capturedArr = this.capturedPieces[this.turn === WHITE ? WHITE : BLACK];
      capturedArr.pop();
    }

    // Handle en passant undo (remove the captured pawn)
    if (lastMove.enPassant) {
      // The captured pawn was at (from.row, to.col)
      const capturedPawn = this.capturedPieces[this.turn === WHITE ? WHITE : BLACK].pop();
      if (capturedPawn) {
        this.board[lastMove.from.row][lastMove.to.col] = capturedPawn;
      }
    }

    return true;
  }

  /**
   * Evaluate the board from white's perspective.
   */
  evaluate() {
    let score = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (!piece) continue;

        const value = PIECE_VALUES[piece.type];
        let pstScore = 0;

        // Piece-square table
        const pstTable = PST[piece.type];
        if (pstTable) {
          if (piece.color === WHITE) {
            pstScore = pstTable[row][col];
          } else {
            pstScore = pstTable[7 - row][7 - col];
          }
        }

        if (piece.color === WHITE) {
          score += value + pstScore;
        } else {
          score -= value + pstScore;
        }
      }
    }

    // Bonus for king safety (simplified)
    // Bonus for mobility - approximated by piece count differential

    return score;
  }

  /**
   * Get FEN string for the current position.
   */
  toFen() {
    let fen = '';
    for (let row = 0; row < 8; row++) {
      let empty = 0;
      for (let col = 0; col < 8; col++) {
        const p = this.board[row][col];
        if (!p) {
          empty++;
        } else {
          if (empty > 0) { fen += empty; empty = 0; }
          const sym = p.color === WHITE ? p.type[0].toUpperCase() : p.type[0].toLowerCase();
          fen += sym;
        }
      }
      if (empty > 0) fen += empty;
      if (row < 7) fen += '/';
    }
    fen += ' ' + (this.turn === WHITE ? 'w' : 'b');
    fen += ' ';
    let castling = '';
    if (this.castlingRights.K) castling += 'K';
    if (this.castlingRights.Q) castling += 'Q';
    if (this.castlingRights.k) castling += 'k';
    if (this.castlingRights.q) castling += 'q';
    fen += castling || '-';
    fen += ' ';
    fen += this.enPassantTarget ? String.fromCharCode(97 + this.enPassantTarget.col) + (8 - this.enPassantTarget.row) : '-';
    fen += ' ' + this.halfMoveClock;
    fen += ' ' + this.fullMoveNumber;
    return fen;
  }
}
