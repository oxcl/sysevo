/**
 * Chess Engine Module
 * ==================
 * Board representation, move generation, and rule enforcement.
 * 
 * @module ChessEngine
 */

const WHITE = 'w';
const BLACK = 'b';
const BOARD_SIZE = 8;
const EMPTY = null;

const INITIAL_BOARD = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR']
];

const MOVEMENT_PATTERNS = {
  knight: [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
  king: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
  diagonal: [[-1,-1],[-1,1],[1,-1],[1,1]],
  straight: [[-1,0],[1,0],[0,-1],[0,1]],
  all: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
};

const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

const PIECE_SQUARE_TABLES = {
  P: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,0,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  N: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,5,10,15,15,10,5,-30,-30,0,15,20,20,15,0,-30,-30,5,15,20,20,15,5,-30,-30,0,10,15,15,10,0,-30,-30,5,5,10,10,5,5,-30,-40,-20,-30,-30,-30,-30,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  B: [-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,0,5,10,10,10,10,5,0,-5,0,10,10,10,10,0,-5,-10,0,5,10,10,10,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  R: [0,0,0,5,5,0,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,5,5,5,5,5,5,0,0,0,0,0,0,0,0,0],
  Q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,5,0,0,0,0,-10,-10,5,5,5,5,5,5,-10,0,0,5,5,5,5,0,0,-5,0,5,5,5,5,0,-5,-10,0,5,5,5,5,0,-10,-10,0,5,5,5,5,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  K: [20,30,10,0,0,10,30,20,20,20,0,0,0,0,20,20,20,-10,-20,-20,-20,-20,-10,20,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30]
};

export class ChessEngine {
  constructor() {
    this.board = [];
    this.turn = WHITE;
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassantTarget = null;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.moveHistory = [];
    this.reset();
  }

  reset() {
    this.board = INITIAL_BOARD.map(row => [...row]);
    this.turn = WHITE;
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassantTarget = null;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.moveHistory = [];
  }

  getPieceColor(piece) { return piece ? piece[0] : null; }
  getPieceType(piece) { return piece ? piece[1] : null; }
  isCurrentPlayerPiece(piece) { return this.getPieceColor(piece) === this.turn; }
  isOnBoard(row, col) { return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE; }

  findKingPosition(color) {
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c] === color + 'K') return [r, c];
    return null;
  }

  isSquareUnderAttack(row, col, byColor) {
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = this.board[r][c];
        if (piece && this.getPieceColor(piece) === byColor && this.canPieceAttack(r, c, row, col))
          return true;
      }
    return false;
  }

  canPieceAttack(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    if (!piece) return false;
    const type = this.getPieceType(piece);
    const color = this.getPieceColor(piece);
    const dRow = toRow - fromRow, dCol = toCol - fromCol;
    const absRow = Math.abs(dRow), absCol = Math.abs(dCol);

    switch (type) {
      case 'P': return dRow === (color === WHITE ? -1 : 1) && absCol === 1;
      case 'N': return (absRow === 2 && absCol === 1) || (absRow === 1 && absCol === 2);
      case 'B': return absRow === absCol && absRow > 0 && this.isPathClear(fromRow, fromCol, toRow, toCol);
      case 'R': return (dRow === 0 || dCol === 0) && (absRow + absCol) > 0 && this.isPathClear(fromRow, fromCol, toRow, toCol);
      case 'Q': return ((absRow === absCol && absRow > 0) || ((dRow === 0 || dCol === 0) && (absRow + absCol) > 0)) && this.isPathClear(fromRow, fromCol, toRow, toCol);
      case 'K': return absRow <= 1 && absCol <= 1 && (absRow + absCol) > 0;
      default: return false;
    }
  }

  isPathClear(fromRow, fromCol, toRow, toCol) {
    const stepRow = Math.sign(toRow - fromRow);
    const stepCol = Math.sign(toCol - fromCol);
    let r = fromRow + stepRow, c = fromCol + stepCol;
    while (r !== toRow || c !== toCol) {
      if (this.board[r][c]) return false;
      r += stepRow; c += stepCol;
    }
    return true;
  }

  isKingInCheck(color) {
    const kingPos = this.findKingPosition(color);
    if (!kingPos) return false;
    const opponent = color === WHITE ? BLACK : WHITE;
    return this.isSquareUnderAttack(kingPos[0], kingPos[1], opponent);
  }

  generatePseudoLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];
    const color = this.getPieceColor(piece);
    const type = this.getPieceType(piece);
    const opponent = color === WHITE ? BLACK : WHITE;
    const moves = [];

    const addIfValid = (toRow, toCol, flags = {}) => {
      if (this.isOnBoard(toRow, toCol)) {
        const target = this.board[toRow][toCol];
        if (!target || this.getPieceColor(target) === opponent)
          moves.push({ from: [row, col], to: [toRow, toCol], ...flags });
      }
    };

    const addSlidingMoves = (directions) => {
      for (const [dRow, dCol] of directions) {
        let toRow = row + dRow, toCol = col + dCol;
        while (this.isOnBoard(toRow, toCol)) {
          const target = this.board[toRow][toCol];
          if (target) {
            if (this.getPieceColor(target) === opponent)
              moves.push({ from: [row, col], to: [toRow, toCol] });
            break;
          }
          moves.push({ from: [row, col], to: [toRow, toCol] });
          toRow += dRow; toCol += dCol;
        }
      }
    };

    switch (type) {
      case 'P': {
        const direction = color === WHITE ? -1 : 1;
        const startRow = color === WHITE ? 6 : 1;
        const promotionRow = color === WHITE ? 0 : 7;
        const forwardRow = row + direction;

        if (this.isOnBoard(forwardRow, col) && !this.board[forwardRow][col]) {
          if (forwardRow === promotionRow) {
            for (const promo of ['Q', 'R', 'B', 'N'])
              moves.push({ from: [row, col], to: [forwardRow, col], promotion: promo });
          } else {
            moves.push({ from: [row, col], to: [forwardRow, col] });
            if (row === startRow && this.isOnBoard(row + 2 * direction, col) && !this.board[row + 2 * direction][col])
              moves.push({ from: [row, col], to: [row + 2 * direction, col], doublePush: true });
          }
        }

        for (const dCol of [-1, 1]) {
          const toRow = row + direction, toCol = col + dCol;
          if (!this.isOnBoard(toRow, toCol)) continue;
          const target = this.board[toRow][toCol];
          if (target && this.getPieceColor(target) === opponent) {
            if (toRow === promotionRow) {
              for (const promo of ['Q', 'R', 'B', 'N'])
                moves.push({ from: [row, col], to: [toRow, toCol], promotion: promo });
            } else {
              moves.push({ from: [row, col], to: [toRow, toCol] });
            }
          }
          if (this.enPassantTarget && toRow === this.enPassantTarget[0] && toCol === this.enPassantTarget[1])
            moves.push({ from: [row, col], to: [toRow, toCol], enPassant: true });
        }
        break;
      }
      case 'N':
        for (const [dRow, dCol] of MOVEMENT_PATTERNS.knight) addIfValid(row + dRow, col + dCol);
        break;
      case 'B':
        addSlidingMoves(MOVEMENT_PATTERNS.diagonal);
        break;
      case 'R':
        addSlidingMoves(MOVEMENT_PATTERNS.straight);
        break;
      case 'Q':
        addSlidingMoves(MOVEMENT_PATTERNS.all);
        break;
      case 'K': {
        for (const [dRow, dCol] of MOVEMENT_PATTERNS.king) addIfValid(row + dRow, col + dCol);
        const opponent = color === WHITE ? BLACK : WHITE;
        if (this.castlingRights[color + 'K'] && !this.board[row][5] && !this.board[row][6] &&
            this.board[row][7] === color + 'R' && !this.isKingInCheck(color) &&
            !this.isSquareUnderAttack(row, 5, opponent) && !this.isSquareUnderAttack(row, 6, opponent))
          moves.push({ from: [row, col], to: [row, 6], castling: 'K' });
        if (this.castlingRights[color + 'Q'] && !this.board[row][3] && !this.board[row][2] && !this.board[row][1] &&
            this.board[row][0] === color + 'R' && !this.isKingInCheck(color) &&
            !this.isSquareUnderAttack(row, 3, opponent) && !this.isSquareUnderAttack(row, 2, opponent))
          moves.push({ from: [row, col], to: [row, 2], castling: 'Q' });
        break;
      }
    }
    return moves;
  }

  getLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece || !this.isCurrentPlayerPiece(piece)) return [];
    const color = this.getPieceColor(piece);
    return this.generatePseudoLegalMoves(row, col).filter(move => {
      const snapshot = this.executeMove(move);
      const legal = !this.isKingInCheck(color);
      this.revertMove(snapshot);
      return legal;
    });
  }

  getAllLegalMoves(color) {
    const savedTurn = this.turn;
    this.turn = color;
    const allMoves = [];
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c] && this.getPieceColor(this.board[r][c]) === color)
          allMoves.push(...this.getLegalMoves(r, c));
    this.turn = savedTurn;
    return allMoves;
  }

  executeMove(move) {
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;
    const piece = this.board[fromRow][fromCol];
    const capturedPiece = this.board[toRow][toCol];
    const color = this.getPieceColor(piece);

    const snapshot = {
      move, capturedPiece,
      previousCastling: { ...this.castlingRights },
      previousEnPassant: this.enPassantTarget,
      previousHalfMoveClock: this.halfMoveClock
    };

    this.board[toRow][toCol] = move.promotion ? color + move.promotion : piece;
    this.board[fromRow][fromCol] = EMPTY;

    if (move.enPassant) {
      const epRow = color === WHITE ? toRow + 1 : toRow - 1;
      snapshot.enPassantCaptured = this.board[epRow][toCol];
      this.board[epRow][toCol] = EMPTY;
    }

    this.enPassantTarget = move.doublePush ? [(fromRow + toRow) / 2, fromCol] : null;

    const type = this.getPieceType(piece);
    if (type === 'K') { this.castlingRights[color + 'K'] = false; this.castlingRights[color + 'Q'] = false; }
    if (type === 'R') {
      if (fromRow === 7 && fromCol === 0) this.castlingRights.wQ = false;
      if (fromRow === 7 && fromCol === 7) this.castlingRights.wK = false;
      if (fromRow === 0 && fromCol === 0) this.castlingRights.bQ = false;
      if (fromRow === 0 && fromCol === 7) this.castlingRights.bK = false;
    }
    if (toRow === 0 && toCol === 0) this.castlingRights.bQ = false;
    if (toRow === 0 && toCol === 7) this.castlingRights.bK = false;
    if (toRow === 7 && toCol === 0) this.castlingRights.wQ = false;
    if (toRow === 7 && toCol === 7) this.castlingRights.wK = false;

    if (move.castling) {
      const rookFromCol = move.castling === 'K' ? 7 : 0;
      const rookToCol = move.castling === 'K' ? 5 : 3;
      this.board[toRow][rookToCol] = this.board[toRow][rookFromCol];
      this.board[toRow][rookFromCol] = EMPTY;
    }

    this.halfMoveClock = (type === 'P' || capturedPiece || move.enPassant) ? 0 : this.halfMoveClock + 1;
    if (color === BLACK) this.fullMoveNumber++;
    this.turn = color === WHITE ? BLACK : WHITE;
    this.moveHistory.push(snapshot);
    return snapshot;
  }

  revertMove(snapshot) {
    const { move, capturedPiece, previousCastling, previousEnPassant, previousHalfMoveClock, enPassantCaptured } = snapshot;
    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;
    const piece = this.board[toRow][toCol];
    const color = this.getPieceColor(piece);

    this.board[fromRow][fromCol] = move.promotion ? color + 'P' : piece;
    this.board[toRow][toCol] = capturedPiece || EMPTY;

    if (move.enPassant) {
      const epRow = color === WHITE ? toRow + 1 : toRow - 1;
      this.board[epRow][toCol] = enPassantCaptured || EMPTY;
    }

    if (move.castling) {
      const rookFromCol = move.castling === 'K' ? 7 : 0;
      const rookToCol = move.castling === 'K' ? 5 : 3;
      this.board[fromRow][rookFromCol] = this.board[fromRow][rookToCol];
      this.board[fromRow][rookToCol] = EMPTY;
    }

    this.castlingRights = previousCastling;
    this.enPassantTarget = previousEnPassant;
    this.halfMoveClock = previousHalfMoveClock;
    if (color === BLACK) this.fullMoveNumber--;
    this.turn = color;
    this.moveHistory.pop();
  }

  isCheckmate() { return this.isKingInCheck(this.turn) && this.getAllLegalMoves(this.turn).length === 0; }
  isStalemate() { return !this.isKingInCheck(this.turn) && this.getAllLegalMoves(this.turn).length === 0; }
  isDraw() {
    if (this.halfMoveClock >= 100) return true;
    const pieces = [];
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c]) pieces.push(this.board[r][c]);
    if (pieces.length === 2) return true;
    if (pieces.length === 3 && pieces.some(p => ['B', 'N'].includes(this.getPieceType(p)))) return true;
    return false;
  }

  evaluate() {
    let score = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = this.board[r][c];
        if (!piece) continue;
        const color = this.getPieceColor(piece);
        const type = this.getPieceType(piece);
        const idx = color === WHITE ? r * BOARD_SIZE + c : (BOARD_SIZE - 1 - r) * BOARD_SIZE + c;
        const value = (PIECE_VALUES[type] || 0) + (PIECE_SQUARE_TABLES[type] ? PIECE_SQUARE_TABLES[type][idx] : 0);
        score += color === WHITE ? value : -value;
      }
    }
    return score;
  }
}
