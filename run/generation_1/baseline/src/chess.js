const PIECES = { K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N', P: 'P' };
const COLORS = { W: 'w', B: 'b' };

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

export class ChessEngine {
  constructor() {
    this.board = [];
    this.turn = 'w';
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassantTarget = null;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.moveHistory = [];
    this.reset();
  }

  reset() {
    this.board = INITIAL_BOARD.map(r => [...r]);
    this.turn = 'w';
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassantTarget = null;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.moveHistory = [];
  }

  getPieceColor(piece) { return piece ? piece[0] : null; }
  getPieceType(piece) { return piece ? piece[1] : null; }
  isWhite(piece) { return this.getPieceColor(piece) === 'w'; }
  isBlack(piece) { return this.getPieceColor(piece) === 'b'; }
  isOwnPiece(piece) { return this.getPieceColor(piece) === this.turn; }

  inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  findKing(color) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (this.board[r][c] === color + 'K') return [r, c];
    return null;
  }

  isSquareAttacked(r, c, byColor) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const p = this.board[row][col];
        if (p && this.getPieceColor(p) === byColor) {
          if (this.canAttack(row, col, r, c)) return true;
        }
      }
    }
    return false;
  }

  canAttack(fr, fc, tr, tc) {
    const piece = this.board[fr][fc];
    if (!piece) return false;
    const type = this.getPieceType(piece);
    const color = this.getPieceColor(piece);
    const dr = tr - fr, dc = tc - fc;
    const adr = Math.abs(dr), adc = Math.abs(dc);

    switch (type) {
      case 'P': {
        const dir = color === 'w' ? -1 : 1;
        return dr === dir && adc === 1;
      }
      case 'N': return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
      case 'B': return adr === adc && adr > 0 && this.isClearDiagonal(fr, fc, tr, tc);
      case 'R': return (dr === 0 || dc === 0) && (adr + adc) > 0 && this.isClearLine(fr, fc, tr, tc);
      case 'Q': return (adr === adc && adr > 0 && this.isClearDiagonal(fr, fc, tr, tc)) ||
                         ((dr === 0 || dc === 0) && (adr + adc) > 0 && this.isClearLine(fr, fc, tr, tc));
      case 'K': return adr <= 1 && adc <= 1 && (adr + adc) > 0;
    }
    return false;
  }

  isClearLine(fr, fc, tr, tc) {
    const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc);
    let r = fr + dr, c = fc + dc;
    while (r !== tr || c !== tc) {
      if (this.board[r][c]) return false;
      r += dr; c += dc;
    }
    return true;
  }

  isClearDiagonal(fr, fc, tr, tc) {
    return this.isClearLine(fr, fc, tr, tc);
  }

  isInCheck(color) {
    const king = this.findKing(color);
    if (!king) return false;
    const opponent = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(king[0], king[1], opponent);
  }

  getRawMoves(r, c) {
    const piece = this.board[r][c];
    if (!piece) return [];
    const color = this.getPieceColor(piece);
    const type = this.getPieceType(piece);
    const moves = [];

    const addMove = (tr, tc, flags = {}) => {
      if (this.inBounds(tr, tc)) {
        const target = this.board[tr][tc];
        if (!target || this.getPieceColor(target) !== color) {
          moves.push({ from: [r, c], to: [tr, tc], ...flags });
        }
      }
    };

    const addSliding = (dirs) => {
      for (const [dr, dc] of dirs) {
        let tr = r + dr, tc = c + dc;
        while (this.inBounds(tr, tc)) {
          const target = this.board[tr][tc];
          if (target) {
            if (this.getPieceColor(target) !== color) moves.push({ from: [r, c], to: [tr, tc] });
            break;
          }
          moves.push({ from: [r, c], to: [tr, tc] });
          tr += dr; tc += dc;
        }
      }
    };

    switch (type) {
      case 'P': {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        const promoRow = color === 'w' ? 0 : 7;
        const forward = r + dir;
        if (this.inBounds(forward, c) && !this.board[forward][c]) {
          if (forward === promoRow) {
            for (const promo of ['Q', 'R', 'B', 'N']) moves.push({ from: [r, c], to: [forward, c], promotion: promo });
          } else {
            moves.push({ from: [r, c], to: [forward, c] });
          }
          if (r === startRow && !this.board[r + 2 * dir][c]) {
            moves.push({ from: [r, c], to: [r + 2 * dir, c], doublePush: true });
          }
        }
        for (const dc of [-1, 1]) {
          const tr = r + dir, tc = c + dc;
          if (!this.inBounds(tr, tc)) continue;
          const target = this.board[tr][tc];
          if (target && this.getPieceColor(target) !== color) {
            if (tr === promoRow) {
              for (const promo of ['Q', 'R', 'B', 'N']) moves.push({ from: [r, c], to: [tr, tc], promotion: promo });
            } else {
              moves.push({ from: [r, c], to: [tr, tc] });
            }
          }
          if (this.enPassantTarget && tr === this.enPassantTarget[0] && tc === this.enPassantTarget[1]) {
            moves.push({ from: [r, c], to: [tr, tc], enPassant: true });
          }
        }
        break;
      }
      case 'N':
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) addMove(r+dr, c+dc);
        break;
      case 'B':
        addSliding([[-1,-1],[-1,1],[1,-1],[1,1]]);
        break;
      case 'R':
        addSliding([[-1,0],[1,0],[0,-1],[0,1]]);
        break;
      case 'Q':
        addSliding([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
        break;
      case 'K':
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) addMove(r+dr, c+dc);
        if (this.castlingRights[color + 'K'] && !this.board[r][5] && !this.board[r][6] &&
            this.board[r][7] === color + 'R' && !this.isInCheck(color) &&
            !this.isSquareAttacked(r, 5, color === 'w' ? 'b' : 'w') &&
            !this.isSquareAttacked(r, 6, color === 'w' ? 'b' : 'w')) {
          moves.push({ from: [r, c], to: [r, 6], castling: 'K' });
        }
        if (this.castlingRights[color + 'Q'] && !this.board[r][3] && !this.board[r][2] && !this.board[r][1] &&
            this.board[r][0] === color + 'R' && !this.isInCheck(color) &&
            !this.isSquareAttacked(r, 3, color === 'w' ? 'b' : 'w') &&
            !this.isSquareAttacked(r, 2, color === 'w' ? 'b' : 'w')) {
          moves.push({ from: [r, c], to: [r, 2], castling: 'Q' });
        }
        break;
    }
    return moves;
  }

  getLegalMoves(r, c) {
    const piece = this.board[r][c];
    if (!piece || !this.isOwnPiece(piece)) return [];
    const color = this.getPieceColor(piece);
    return this.getRawMoves(r, c).filter(move => {
      const undo = this.makeMove(move);
      const legal = !this.isInCheck(color);
      this.undoMove(undo);
      return legal;
    });
  }

  getAllLegalMoves(color) {
    const savedTurn = this.turn;
    this.turn = color;
    const moves = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (this.board[r][c] && this.getPieceColor(this.board[r][c]) === color)
          moves.push(...this.getLegalMoves(r, c));
    this.turn = savedTurn;
    return moves;
  }

  makeMove(move) {
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = this.board[fr][fc];
    const captured = this.board[tr][tc];
    const color = this.getPieceColor(piece);
    const type = this.getPieceType(piece);

    const undo = {
      move, captured,
      prevCastling: { ...this.castlingRights },
      prevEnPassant: this.enPassantTarget,
      prevHalfMove: this.halfMoveClock
    };

    this.board[tr][tc] = move.promotion ? color + move.promotion : piece;
    this.board[fr][fc] = null;

    if (move.enPassant) {
      const epRow = color === 'w' ? tr + 1 : tr - 1;
      undo.capturedEP = this.board[epRow][tc];
      this.board[epRow][tc] = null;
    }

    if (move.doublePush) {
      this.enPassantTarget = [(fr + tr) / 2, fc];
    } else {
      this.enPassantTarget = null;
    }

    if (type === 'K') {
      this.castlingRights[color + 'K'] = false;
      this.castlingRights[color + 'Q'] = false;
    }
    if (type === 'R') {
      if (fr === 7 && fc === 0) this.castlingRights.wQ = false;
      if (fr === 7 && fc === 7) this.castlingRights.wK = false;
      if (fr === 0 && fc === 0) this.castlingRights.bQ = false;
      if (fr === 0 && fc === 7) this.castlingRights.bK = false;
    }
    if (tr === 0 && tc === 0) this.castlingRights.bQ = false;
    if (tr === 0 && tc === 7) this.castlingRights.bK = false;
    if (tr === 7 && tc === 0) this.castlingRights.wQ = false;
    if (tr === 7 && tc === 7) this.castlingRights.wK = false;

    if (move.castling) {
      if (move.castling === 'K') {
        this.board[tr][5] = this.board[tr][7];
        this.board[tr][7] = null;
      } else {
        this.board[tr][3] = this.board[tr][0];
        this.board[tr][0] = null;
      }
    }

    if (type === 'P' || captured || move.enPassant) this.halfMoveClock = 0;
    else this.halfMoveClock++;

    if (color === 'b') this.fullMoveNumber++;
    this.turn = color === 'w' ? 'b' : 'w';
    this.moveHistory.push(undo);
    return undo;
  }

  undoMove(undo) {
    const { move, captured, prevCastling, prevEnPassant, prevHalfMove, capturedEP } = undo;
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = this.board[tr][tc];
    const color = this.getPieceColor(piece);

    this.board[fr][fc] = move.promotion ? color + 'P' : piece;
    this.board[tr][tc] = captured || null;

    if (move.enPassant) {
      const epRow = color === 'w' ? tr + 1 : tr - 1;
      this.board[epRow][tc] = capturedEP;
    }

    if (move.castling) {
      if (move.castling === 'K') {
        this.board[fr][7] = this.board[fr][5];
        this.board[fr][5] = null;
      } else {
        this.board[fr][0] = this.board[fr][3];
        this.board[fr][3] = null;
      }
    }

    this.castlingRights = prevCastling;
    this.enPassantTarget = prevEnPassant;
    this.halfMoveClock = prevHalfMove;
    if (color === 'b') this.fullMoveNumber--;
    this.turn = color;
    this.moveHistory.pop();
  }

  isCheckmate() {
    return this.isInCheck(this.turn) && this.getAllLegalMoves(this.turn).length === 0;
  }

  isStalemate() {
    return !this.isInCheck(this.turn) && this.getAllLegalMoves(this.turn).length === 0;
  }

  isDraw() {
    if (this.halfMoveClock >= 100) return true;
    const pieces = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (this.board[r][c]) pieces.push(this.board[r][c]);
    if (pieces.length === 2) return true;
    if (pieces.length === 3 && pieces.some(p => p[1] === 'B' || p[1] === 'N')) return true;
    return false;
  }

  evaluate() {
    const pieceValues = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
    const pst = {
      P: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,0,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      N: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,5,10,15,15,10,5,-30,-30,0,15,20,20,15,0,-30,-30,5,15,20,20,15,5,-30,-30,0,10,15,15,10,0,-30,-30,5,5,10,10,5,5,-30,-40,-20,-30,-30,-30,-30,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
      B: [-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,0,5,10,10,10,10,5,0,-5,0,10,10,10,10,0,-5,-10,0,5,10,10,10,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
      R: [0,0,0,5,5,0,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,5,5,5,5,5,5,0,0,0,0,0,0,0,0,0],
      Q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,5,0,0,0,0,-10,-10,5,5,5,5,5,5,-10,0,0,5,5,5,5,0,0,-5,0,5,5,5,5,0,-5,-10,0,5,5,5,5,0,-10,-10,0,5,5,5,5,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
      K: [20,30,10,0,0,10,30,20,20,20,0,0,0,0,20,20,20,-10,-20,-20,-20,-20,-10,20,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30]
    };

    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece) continue;
        const color = this.getPieceColor(piece);
        const type = this.getPieceType(piece);
        const val = pieceValues[type] || 0;
        const idx = color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
        const posVal = pst[type] ? pst[type][idx] : 0;
        score += color === 'w' ? val + posVal : -(val + posVal);
      }
    }
    return score;
  }
}
