/**
 * Chess Engine — Pure game logic with full standard rules.
 *
 * Exports:
 *   PieceType, Color, oppositeColor(), PIECE_UNICODE, PIECE_VALUE
 *   Move class
 *   Chess class
 */

/* ── Constants ─────────────────────────────────────────────────────── */

export const PieceType = Object.freeze({
  KING: 'king',
  QUEEN: 'queen',
  ROOK: 'rook',
  BISHOP: 'bishop',
  KNIGHT: 'knight',
  PAWN: 'pawn',
});

export const Color = Object.freeze({
  WHITE: 'white',
  BLACK: 'black',
});

export function oppositeColor(color) {
  return color === Color.WHITE ? Color.BLACK : Color.WHITE;
}

export const PIECE_UNICODE = {
  [Color.WHITE]: {
    [PieceType.KING]: '\u2654',
    [PieceType.QUEEN]: '\u2655',
    [PieceType.ROOK]: '\u2656',
    [PieceType.BISHOP]: '\u2657',
    [PieceType.KNIGHT]: '\u2658',
    [PieceType.PAWN]: '\u2659',
  },
  [Color.BLACK]: {
    [PieceType.KING]: '\u265A',
    [PieceType.QUEEN]: '\u265B',
    [PieceType.ROOK]: '\u265C',
    [PieceType.BISHOP]: '\u265D',
    [PieceType.KNIGHT]: '\u265E',
    [PieceType.PAWN]: '\u265F',
  },
};

export const PIECE_VALUE = {
  [PieceType.PAWN]: 100,
  [PieceType.KNIGHT]: 320,
  [PieceType.BISHOP]: 330,
  [PieceType.ROOK]: 500,
  [PieceType.QUEEN]: 900,
  [PieceType.KING]: 20000,
};

/* ── Piece–Square Tables (from WHITE perspective, row 0 = rank 8) ──── */

const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MIDDLE_TABLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const KING_ENDGAME_TABLE = [
  [-50, -40, -30, -20, -20, -30, -40, -50],
  [-30, -20, -10, 0, 0, -10, -20, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -30, 0, 0, 0, 0, -30, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
];

/* Look-up for piece-square tables */
const PST = {
  [PieceType.PAWN]: PAWN_TABLE,
  [PieceType.KNIGHT]: KNIGHT_TABLE,
  [PieceType.BISHOP]: BISHOP_TABLE,
  [PieceType.ROOK]: ROOK_TABLE,
  [PieceType.QUEEN]: QUEEN_TABLE,
};

/* ── Move class ────────────────────────────────────────────────────── */

export class Move {
  constructor(fromRow, fromCol, toRow, toCol, piece) {
    this.fromRow = fromRow;
    this.fromCol = fromCol;
    this.toRow = toRow;
    this.toCol = toCol;
    this.piece = piece; // { type, color }

    /* Populated during move execution */
    this.captured = null;

    /* Special-move flags */
    this.isCastling = false;
    this.castlingRookFrom = null; // { row, col }
    this.castlingRookTo = null; // { row, col }

    this.isEnPassant = false;
    this.enPassantCaptureRow = null;

    this.isPromotion = false;
    this.promotionType = null;

    /* Saved state for undo */
    this.prevEnPassantTarget = null;
    this.prevCastlingRights = null;
    this.prevHalfMoveClock = null;
  }
}

/* ── Chess class ───────────────────────────────────────────────────── */

export class Chess {
  constructor() {
    this.reset();
  }

  /* ---------- reset / board creation ---------- */

  reset() {
    this.board = this._createInitialBoard();
    this.turn = Color.WHITE;
    this.moveHistory = [];
    this.enPassantTarget = null;
    this.castlingRights = {
      [Color.WHITE]: { kingside: true, queenside: true },
      [Color.BLACK]: { kingside: true, queenside: true },
    };
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.positionHistory = [this._getPositionKey()];
    this.lastMove = null;
    this.gameOver = false;
    this.gameResult = null; // '1-0' | '0-1' | '1/2-1/2' | null
    this.inCheck = false;
  }

  _createInitialBoard() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));

    for (let c = 0; c < 8; c++) {
      board[1][c] = { type: PieceType.PAWN, color: Color.WHITE };
      board[6][c] = { type: PieceType.PAWN, color: Color.BLACK };
    }

    const back = [
      PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP,
      PieceType.QUEEN, PieceType.KING,
      PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK,
    ];
    for (let c = 0; c < 8; c++) {
      board[0][c] = { type: back[c], color: Color.WHITE };
      board[7][c] = { type: back[c], color: Color.BLACK };
    }

    return board;
  }

  /* ---------- helpers ---------- */

  getPiece(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.board[row][col];
  }

  _findKing(color) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type === PieceType.KING && p.color === color) return { row: r, col: c };
      }
    return null;
  }

  /* ---------- attack detection ---------- */

  isSquareAttacked(row, col, byColor) {
    /* Pawn attacks */
    const dir = byColor === Color.WHITE ? 1 : -1;
    const pr = row - dir;
    if (pr >= 0 && pr <= 7) {
      for (const pc of [col - 1, col + 1]) {
        if (pc >= 0 && pc <= 7) {
          const p = this.board[pr][pc];
          if (p && p.type === PieceType.PAWN && p.color === byColor) return true;
        }
      }
    }

    /* Knight attacks */
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of knightOffsets) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const p = this.board[r][c];
        if (p && p.type === PieceType.KNIGHT && p.color === byColor) return true;
      }
    }

    /* King attacks */
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
          const p = this.board[r][c];
          if (p && p.type === PieceType.KING && p.color === byColor) return true;
        }
      }

    /* Sliding pieces */
    const dirs = [
      { dr: -1, dc: -1, b: true, r: false },
      { dr: -1, dc: 0, b: false, r: true },
      { dr: -1, dc: 1, b: true, r: false },
      { dr: 0, dc: -1, b: false, r: true },
      { dr: 0, dc: 1, b: false, r: true },
      { dr: 1, dc: -1, b: true, r: false },
      { dr: 1, dc: 0, b: false, r: true },
      { dr: 1, dc: 1, b: true, r: false },
    ];

    for (const d of dirs) {
      let r = row + d.dr;
      let c = col + d.dc;
      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const p = this.board[r][c];
        if (p) {
          if (p.color === byColor) {
            if (p.type === PieceType.QUEEN) return true;
            if (d.b && p.type === PieceType.BISHOP) return true;
            if (d.r && p.type === PieceType.ROOK) return true;
          }
          break;
        }
        r += d.dr;
        c += d.dc;
      }
    }

    return false;
  }

  /** Convenience: is the side‑to‑move (or given colour) in check? */
  isInCheck(color = this.turn) {
    const king = this._findKing(color);
    if (!king) return true;
    return this.isSquareAttacked(king.row, king.col, oppositeColor(color));
  }

  /* ---------- pseudo-legal move generation ---------- */

  _genPseudoMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];
    const moves = [];
    switch (piece.type) {
      case PieceType.PAWN: this._pawnMoves(row, col, piece, moves); break;
      case PieceType.KNIGHT: this._knightMoves(row, col, piece, moves); break;
      case PieceType.BISHOP: this._slideMoves(row, col, piece, [[-1, -1], [-1, 1], [1, -1], [1, 1]], moves); break;
      case PieceType.ROOK: this._slideMoves(row, col, piece, [[-1, 0], [1, 0], [0, -1], [0, 1]], moves); break;
      case PieceType.QUEEN: this._slideMoves(row, col, piece,
        [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]], moves); break;
      case PieceType.KING: this._kingMoves(row, col, piece, moves); break;
    }
    return moves;
  }

  _pawnMoves(row, col, piece, moves) {
    const dir = piece.color === Color.WHITE ? 1 : -1;
    const startRow = piece.color === Color.WHITE ? 1 : 6;
    const promoRow = piece.color === Color.WHITE ? 7 : 0;

    const push = (r, c, promo) => {
      if (promo) {
        for (const t of [PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT]) {
          const m = new Move(row, col, r, c, piece);
          m.isPromotion = true;
          m.promotionType = t;
          moves.push(m);
        }
      } else {
        moves.push(new Move(row, col, r, c, piece));
      }
    };

    /* Forward one */
    const fr = row + dir;
    if (fr >= 0 && fr <= 7 && !this.board[fr][col]) {
      push(fr, col, fr === promoRow);
      /* Forward two from start */
      if (row === startRow) {
        const tr = row + 2 * dir;
        if (!this.board[tr][col]) moves.push(new Move(row, col, tr, col, piece));
      }
    }

    /* Captures */
    for (const dc of [-1, 1]) {
      const cc = col + dc;
      if (cc < 0 || cc > 7) continue;
      const cr = row + dir;
      if (cr < 0 || cr > 7) continue;
      const target = this.board[cr][cc];
      if (target && target.color !== piece.color) {
        push(cr, cc, cr === promoRow);
        const idx = moves.length - 1;
        if (moves[idx]) moves[idx].captured = target;
      }
      /* En passant */
      if (
        this.enPassantTarget &&
        this.enPassantTarget.row === cr &&
        this.enPassantTarget.col === cc
      ) {
        const m = new Move(row, col, cr, cc, piece);
        m.isEnPassant = true;
        m.enPassantCaptureRow = row;
        m.captured = this.board[row][cc];
        moves.push(m);
      }
    }
  }

  _knightMoves(row, col, piece, moves) {
    const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of offsets) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r > 7 || c < 0 || c > 7) continue;
      const t = this.board[r][c];
      if (t && t.color === piece.color) continue;
      const m = new Move(row, col, r, c, piece);
      if (t) m.captured = t;
      moves.push(m);
    }
  }

  _slideMoves(row, col, piece, dirs, moves) {
    for (const [dr, dc] of dirs) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const t = this.board[r][c];
        if (t) {
          if (t.color !== piece.color) {
            const m = new Move(row, col, r, c, piece);
            m.captured = t;
            moves.push(m);
          }
          break;
        }
        moves.push(new Move(row, col, r, c, piece));
        r += dr;
        c += dc;
      }
    }
  }

  _kingMoves(row, col, piece, moves) {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r > 7 || c < 0 || c > 7) continue;
        const t = this.board[r][c];
        if (t && t.color === piece.color) continue;
        const m = new Move(row, col, r, c, piece);
        if (t) m.captured = t;
        moves.push(m);
      }

    /* Castling */
    const castleRow = piece.color === Color.WHITE ? 0 : 7;
    if (row !== castleRow || col !== 4) return;
    const rights = this.castlingRights[piece.color];
    const opp = oppositeColor(piece.color);

    if (
      rights.kingside &&
      !this.board[castleRow][5] &&
      !this.board[castleRow][6] &&
      this.board[castleRow][7] &&
      this.board[castleRow][7].type === PieceType.ROOK &&
      this.board[castleRow][7].color === piece.color &&
      !this.isSquareAttacked(castleRow, 4, opp) &&
      !this.isSquareAttacked(castleRow, 5, opp) &&
      !this.isSquareAttacked(castleRow, 6, opp)
    ) {
      const m = new Move(row, col, castleRow, 6, piece);
      m.isCastling = true;
      m.castlingRookFrom = { row: castleRow, col: 7 };
      m.castlingRookTo = { row: castleRow, col: 5 };
      moves.push(m);
    }

    if (
      rights.queenside &&
      !this.board[castleRow][3] &&
      !this.board[castleRow][2] &&
      !this.board[castleRow][1] &&
      this.board[castleRow][0] &&
      this.board[castleRow][0].type === PieceType.ROOK &&
      this.board[castleRow][0].color === piece.color &&
      !this.isSquareAttacked(castleRow, 4, opp) &&
      !this.isSquareAttacked(castleRow, 3, opp) &&
      !this.isSquareAttacked(castleRow, 2, opp)
    ) {
      const m = new Move(row, col, castleRow, 2, piece);
      m.isCastling = true;
      m.castlingRookFrom = { row: castleRow, col: 0 };
      m.castlingRookTo = { row: castleRow, col: 3 };
      moves.push(m);
    }
  }

  /* ---------- legal move generation ---------- */

  /**
   * Return all legal moves for `color` (default: side to move).
   * If `square` is given, only generate moves for that square.
   */
  getLegalMoves(color = this.turn, square = null) {
    const results = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (square && (r !== square.row || c !== square.col)) continue;
        const p = this.board[r][c];
        if (!p || p.color !== color) continue;

        const pseudo = this._genPseudoMoves(r, c);
        for (const move of pseudo) {
          this._applyMove(move);
          const inCheck = this.isInCheck(color);
          this._undoMove(move);
          if (!inCheck) results.push(move);
        }
      }
    }

    return results;
  }

  /* ---------- apply / undo (used internally and by AI) ---------- */

  _applyMove(move) {
    /* Snapshot for undo */
    move.prevEnPassantTarget = this.enPassantTarget;
    move.prevCastlingRights = {
      white: { ...this.castlingRights.white },
      black: { ...this.castlingRights.black },
    };
    move.prevHalfMoveClock = this.halfMoveClock;

    /* Move piece */
    this.board[move.toRow][move.toCol] = this.board[move.fromRow][move.fromCol];
    this.board[move.fromRow][move.fromCol] = null;

    /* En passant capture */
    if (move.isEnPassant) {
      this.board[move.enPassantCaptureRow][move.toCol] = null;
    }

    /* Castling — move rook */
    if (move.isCastling) {
      this.board[move.castlingRookTo.row][move.castlingRookTo.col] =
        this.board[move.castlingRookFrom.row][move.castlingRookFrom.col];
      this.board[move.castlingRookFrom.row][move.castlingRookFrom.col] = null;
    }

    /* Promotion */
    if (move.isPromotion) {
      this.board[move.toRow][move.toCol] = { type: move.promotionType, color: move.piece.color };
    }

    /* En passant target */
    this.enPassantTarget = null;
    if (
      move.piece.type === PieceType.PAWN &&
      Math.abs(move.toRow - move.fromRow) === 2
    ) {
      this.enPassantTarget = {
        row: (move.fromRow + move.toRow) / 2,
        col: move.fromCol,
      };
    }

    /* Update castling rights */
    if (move.piece.type === PieceType.KING) {
      this.castlingRights[move.piece.color].kingside = false;
      this.castlingRights[move.piece.color].queenside = false;
    }
    if (move.piece.type === PieceType.ROOK) {
      if (move.fromCol === 0) this.castlingRights[move.piece.color].queenside = false;
      if (move.fromCol === 7) this.castlingRights[move.piece.color].kingside = false;
    }
    if (move.captured && move.captured.type === PieceType.ROOK) {
      if (move.toCol === 0) this.castlingRights[move.captured.color].queenside = false;
      if (move.toCol === 7) this.castlingRights[move.captured.color].kingside = false;
    }

    /* Half‑move clock */
    if (move.piece.type === PieceType.PAWN || move.captured) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }
  }

  _undoMove(move) {
    /* Restore piece */
    this.board[move.fromRow][move.fromCol] = this.board[move.toRow][move.toCol];
    this.board[move.toRow][move.toCol] = null;

    /* Restore captured piece */
    if (move.isEnPassant) {
      this.board[move.enPassantCaptureRow][move.toCol] = move.captured;
    } else if (move.captured) {
      this.board[move.toRow][move.toCol] = move.captured;
    }

    /* Undo castling rook */
    if (move.isCastling) {
      this.board[move.castlingRookFrom.row][move.castlingRookFrom.col] =
        this.board[move.castlingRookTo.row][move.castlingRookTo.col];
      this.board[move.castlingRookTo.row][move.castlingRookTo.col] = null;
    }

    /* Restore state */
    this.enPassantTarget = move.prevEnPassantTarget;
    this.castlingRights = move.prevCastlingRights;
    this.halfMoveClock = move.prevHalfMoveClock;
  }

  /* ---------- permanent make / unmake ---------- */

  /**
   * Permanently apply a move, update turn, detect game‑end conditions.
   * Returns the move.
   */
  makeMove(move) {
    this._applyMove(move);

    this.lastMove = move;
    this.moveHistory.push(move);
    this.turn = oppositeColor(this.turn);
    this.positionHistory.push(this._getPositionKey());
    this.inCheck = this.isInCheck(this.turn);

    /* Game‑end checks */
    const legal = this.getLegalMoves(this.turn);
    if (legal.length === 0) {
      this.gameOver = true;
      this.gameResult = this.inCheck
        ? (this.turn === Color.WHITE ? '0-1' : '1-0')
        : '1/2-1/2';
    } else if (this._isInsufficientMaterial()) {
      this.gameOver = true;
      this.gameResult = '1/2-1/2';
    } else if (this.halfMoveClock >= 100) {
      this.gameOver = true;
      this.gameResult = '1/2-1/2';
    }

    return move;
  }

  /** Undo the last permanent move (used for take‑back). */
  undoLastMove() {
    if (this.moveHistory.length === 0) return null;
    const move = this.moveHistory.pop();
    this.turn = oppositeColor(this.turn);
    this.positionHistory.pop();
    this._undoMove(move);
    this.lastMove = this.moveHistory.length > 0
      ? this.moveHistory[this.moveHistory.length - 1]
      : null;
    this.gameOver = false;
    this.gameResult = null;
    this.inCheck = this.isInCheck(this.turn);
    return move;
  }

  /* ---------- draw detection ---------- */

  _isInsufficientMaterial() {
    const pieces = { white: [], black: [] };
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p) pieces[p.color].push(p);
      }

    const wc = pieces.white.length;
    const bc = pieces.black.length;

    /* K vs K */
    if (wc === 1 && bc === 1) return true;

    /* K + minor vs K */
    if (wc === 2 && bc === 1) {
      const p = pieces.white.find(x => x.type !== PieceType.KING);
      if (p && (p.type === PieceType.BISHOP || p.type === PieceType.KNIGHT)) return true;
    }
    if (wc === 1 && bc === 2) {
      const p = pieces.black.find(x => x.type !== PieceType.KING);
      if (p && (p.type === PieceType.BISHOP || p.type === PieceType.KNIGHT)) return true;
    }

    /* K + B vs K + B (same colour) — skip for simplicity */
    return false;
  }

  /* ---------- position key (for repetition) ---------- */

  _getPositionKey() {
    let key = this.turn === Color.WHITE ? 'w' : 'b';
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) key += '-';
        else key += (p.color === Color.WHITE ? 'w' : 'b') + p.type[0];
      }
    key += this.castlingRights.white.kingside ? 'K' : '';
    key += this.castlingRights.white.queenside ? 'Q' : '';
    key += this.castlingRights.black.kingside ? 'k' : '';
    key += this.castlingRights.black.queenside ? 'q' : '';
    key += this.enPassantTarget ? `${this.enPassantTarget.row}${this.enPassantTarget.col}` : '-';
    return key;
  }

  /* ---------- evaluation (used by AI) ---------- */

  /**
   * Evaluate the current position from the perspective of `color` (default: side to move).
   * Uses material + piece‑square tables.
   */
  evaluate(color = this.turn) {
    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) continue;

        const mat = PIECE_VALUE[p.type];
        const tblRow = p.color === Color.WHITE ? r : 7 - r; // flip for black
        let pstVal = 0;

        if (p.type === PieceType.KING) {
          /* Rough heuristic: use endgame table if total material is low */
          let totalMat = 0;
          for (let rr = 0; rr < 8; rr++)
            for (let cc = 0; cc < 8; cc++) {
              const pp = this.board[rr][cc];
              if (pp && pp.type !== PieceType.KING) totalMat += PIECE_VALUE[pp.type];
            }
          pstVal = totalMat < 1500
            ? KING_ENDGAME_TABLE[tblRow][c]
            : KING_MIDDLE_TABLE[tblRow][c];
        } else {
          const table = PST[p.type];
          if (table) pstVal = table[tblRow][c];
        }

        if (p.color === color) {
          score += mat + pstVal;
        } else {
          score -= mat + pstVal;
        }
      }
    }

    return score;
  }
}
