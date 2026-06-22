const WHITE = 'w';
const BLACK = 'b';
const PIECE_TYPES = ['K', 'Q', 'R', 'B', 'N', 'P'];
const INITIAL_POSITION = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR']
];
const BOARD_SIZE = 8;
const EMPTY_SQUARE = null;

const KNIGHT_OFFSETS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_OFFSETS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

const PIECE_SQUARE_TABLES = {
  P: [
    0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,0, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
    0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0
  ],
  N: [
    -50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,5,5,0,-20,-40, -30,5,10,15,15,10,5,-30,
    -30,0,15,20,20,15,0,-30, -30,5,15,20,20,15,5,-30, -30,0,10,15,15,10,0,-30,
    -30,5,5,10,10,5,5,-30, -40,-20,-30,-30,-30,-30,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50
  ],
  B: [
    -20,-10,-10,-10,-10,-10,-10,-20, -10,5,0,0,0,0,5,-10, -10,10,10,10,10,10,10,-10,
    0,5,10,10,10,10,5,0, -5,0,10,10,10,10,0,-5, -10,0,5,10,10,10,5,0,-10,
    -10,0,0,0,0,0,0,-10, -20,-10,-10,-10,-10,-10,-10,-20
  ],
  R: [
    0,0,0,5,5,0,0,0, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
    -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
    0,5,5,5,5,5,5,0, 0,0,0,0,0,0,0,0
  ],
  Q: [
    -20,-10,-10,-5,-5,-10,-10,-20, -10,0,5,0,0,0,0,-10, -10,5,5,5,5,5,5,-10,
    0,0,5,5,5,5,0,0, -5,0,5,5,5,5,0,-5, -10,0,5,5,5,5,0,-10,
    -10,0,5,5,5,5,0,-10, -20,-10,-10,-5,-5,-10,-10,-20
  ],
  K: [
    20,30,10,0,0,10,30,20, 20,20,0,0,0,0,20,20, 20,-10,-20,-20,-20,-20,-10,20,
    -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30
  ]
};

export class ChessEngine {
  constructor() {
    this.board = [];
    this.activeColor = WHITE;
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epTarget = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = [];
    this.reset();
  }

  reset() {
    this.board = INITIAL_POSITION.map(row => [...row]);
    this.activeColor = WHITE;
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epTarget = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = [];
  }

  colorOf(piece) { return piece ? piece[0] : null; }
  typeOf(piece) { return piece ? piece[1] : null; }
  isOwn(piece) { return this.colorOf(piece) === this.activeColor; }
  inBounds(r, c) { return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE; }

  findKing(color) {
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c] === color + 'K') return [r, c];
    return null;
  }

  isAttacked(r, c, byColor) {
    for (let row = 0; row < BOARD_SIZE; row++)
      for (let col = 0; col < BOARD_SIZE; col++) {
        const p = this.board[row][col];
        if (p && this.colorOf(p) === byColor && this.canAttack(row, col, r, c)) return true;
      }
    return false;
  }

  canAttack(fr, fc, tr, tc) {
    const piece = this.board[fr][fc];
    if (!piece) return false;
    const type = this.typeOf(piece);
    const color = this.colorOf(piece);
    const dr = tr - fr, dc = tc - fc;
    const absDr = Math.abs(dr), absDc = Math.abs(dc);

    if (type === 'P') return dr === (color === WHITE ? -1 : 1) && absDc === 1;
    if (type === 'N') return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);
    if (type === 'B') return absDr === absDc && absDr > 0 && this.isClearDiag(fr, fc, tr, tc);
    if (type === 'R') return (dr === 0 || dc === 0) && (absDr + absDc) > 0 && this.isClearLine(fr, fc, tr, tc);
    if (type === 'Q') {
      if (absDr === absDc && absDr > 0) return this.isClearDiag(fr, fc, tr, tc);
      if ((dr === 0 || dc === 0) && (absDr + absDc) > 0) return this.isClearLine(fr, fc, tr, tc);
      return false;
    }
    if (type === 'K') return absDr <= 1 && absDc <= 1 && (absDr + absDc) > 0;
    return false;
  }

  isClearLine(fr, fc, tr, tc) {
    const sr = Math.sign(tr - fr), sc = Math.sign(tc - fc);
    let r = fr + sr, c = fc + sc;
    while (r !== tr || c !== tc) {
      if (this.board[r][c]) return false;
      r += sr; c += sc;
    }
    return true;
  }

  isClearDiag(fr, fc, tr, tc) { return this.isClearLine(fr, fc, tr, tc); }

  inCheck(color) {
    const king = this.findKing(color);
    return king ? this.isAttacked(king[0], king[1], color === WHITE ? BLACK : WHITE) : false;
  }

  generatePseudoMoves(r, c) {
    const piece = this.board[r][c];
    if (!piece) return [];
    const color = this.colorOf(piece);
    const type = this.typeOf(piece);
    const moves = [];

    const addIfValid = (tr, tc, flags) => {
      if (this.inBounds(tr, tc)) {
        const target = this.board[tr][tc];
        if (!target || this.colorOf(target) !== color)
          moves.push({ from: [r, c], to: [tr, tc], ...flags });
      }
    };

    const addSliding = (dirs) => {
      for (const [dr, dc] of dirs) {
        let tr = r + dr, tc = c + dc;
        while (this.inBounds(tr, tc)) {
          const target = this.board[tr][tc];
          if (target) {
            if (this.colorOf(target) !== color) moves.push({ from: [r, c], to: [tr, tc] });
            break;
          }
          moves.push({ from: [r, c], to: [tr, tc] });
          tr += dr; tc += dc;
        }
      }
    };

    switch (type) {
      case 'P': {
        const dir = color === WHITE ? -1 : 1;
        const startRow = color === WHITE ? 6 : 1;
        const promoRow = color === WHITE ? 0 : 7;
        const fwd = r + dir;
        if (this.inBounds(fwd, c) && !this.board[fwd][c]) {
          if (fwd === promoRow) {
            for (const p of ['Q','R','B','N']) moves.push({ from: [r,c], to: [fwd,c], promotion: p });
          } else {
            moves.push({ from: [r,c], to: [fwd,c] });
            if (r === startRow && !this.board[r + 2*dir][c])
              moves.push({ from: [r,c], to: [r + 2*dir,c], doublePush: true });
          }
        }
        for (const dc of [-1, 1]) {
          const tr = r + dir, tc = c + dc;
          if (!this.inBounds(tr, tc)) continue;
          const target = this.board[tr][tc];
          if (target && this.colorOf(target) !== color) {
            if (tr === promoRow) {
              for (const p of ['Q','R','B','N']) moves.push({ from: [r,c], to: [tr,tc], promotion: p });
            } else {
              moves.push({ from: [r,c], to: [tr,tc] });
            }
          }
          if (this.epTarget && tr === this.epTarget[0] && tc === this.epTarget[1])
            moves.push({ from: [r,c], to: [tr,tc], enPassant: true });
        }
        break;
      }
      case 'N': for (const [dr,dc] of KNIGHT_OFFSETS) addIfValid(r+dr, c+dc); break;
      case 'B': addSliding(BISHOP_DIRS); break;
      case 'R': addSliding(ROOK_DIRS); break;
      case 'Q': addSliding(QUEEN_DIRS); break;
      case 'K': {
        for (const [dr,dc] of KING_OFFSETS) addIfValid(r+dr, c+dc);
        const opp = color === WHITE ? BLACK : WHITE;
        if (this.castling[color+'K'] && !this.board[r][5] && !this.board[r][6] &&
            this.board[r][7] === color+'R' && !this.inCheck(color) &&
            !this.isAttacked(r, 5, opp) && !this.isAttacked(r, 6, opp))
          moves.push({ from: [r,c], to: [r,6], castling: 'K' });
        if (this.castling[color+'Q'] && !this.board[r][3] && !this.board[r][2] && !this.board[r][1] &&
            this.board[r][0] === color+'R' && !this.inCheck(color) &&
            !this.isAttacked(r, 3, opp) && !this.isAttacked(r, 2, opp))
          moves.push({ from: [r,c], to: [r,2], castling: 'Q' });
        break;
      }
    }
    return moves;
  }

  getLegalMoves(r, c) {
    const piece = this.board[r][c];
    if (!piece || !this.isOwn(piece)) return [];
    const color = this.colorOf(piece);
    return this.generatePseudoMoves(r, c).filter(m => {
      const snap = this.applyMove(m);
      const legal = !this.inCheck(color);
      this.revertMove(snap);
      return legal;
    });
  }

  allLegalMoves(color) {
    const saved = this.activeColor;
    this.activeColor = color;
    const moves = [];
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c] && this.colorOf(this.board[r][c]) === color)
          moves.push(...this.getLegalMoves(r, c));
    this.activeColor = saved;
    return moves;
  }

  applyMove(move) {
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = this.board[fr][fc];
    const captured = this.board[tr][tc];
    const color = this.colorOf(piece);

    const snap = {
      move, captured,
      prevCastling: { ...this.castling },
      prevEp: this.epTarget,
      prevHalf: this.halfmoveClock
    };

    this.board[tr][tc] = move.promotion ? color + move.promotion : piece;
    this.board[fr][fc] = EMPTY_SQUARE;

    if (move.enPassant) {
      const epRow = color === WHITE ? tr + 1 : tr - 1;
      snap.epCaptured = this.board[epRow][tc];
      this.board[epRow][tc] = EMPTY_SQUARE;
    }

    this.epTarget = move.doublePush ? [(fr+tr)/2, fc] : null;

    const type = this.typeOf(piece);
    if (type === 'K') { this.castling[color+'K'] = false; this.castling[color+'Q'] = false; }
    if (type === 'R') {
      if (fr===7&&fc===0) this.castling.wQ=false;
      if (fr===7&&fc===7) this.castling.wK=false;
      if (fr===0&&fc===0) this.castling.bQ=false;
      if (fr===0&&fc===7) this.castling.bK=false;
    }
    if (tr===0&&tc===0) this.castling.bQ=false;
    if (tr===0&&tc===7) this.castling.bK=false;
    if (tr===7&&tc===0) this.castling.wQ=false;
    if (tr===7&&tc===7) this.castling.wK=false;

    if (move.castling) {
      const rookTo = move.castling === 'K' ? 5 : 3;
      const rookFrom = move.castling === 'K' ? 7 : 0;
      this.board[tr][rookTo] = this.board[tr][rookFrom];
      this.board[tr][rookFrom] = EMPTY_SQUARE;
    }

    this.halfmoveClock = (type === 'P' || captured || move.enPassant) ? 0 : this.halfmoveClock + 1;
    if (color === BLACK) this.fullmoveNumber++;
    this.activeColor = color === WHITE ? BLACK : WHITE;
    this.history.push(snap);
    return snap;
  }

  revertMove(snap) {
    const { move, captured, prevCastling, prevEp, prevHalf, epCaptured } = snap;
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = this.board[tr][tc];
    const color = this.colorOf(piece);

    this.board[fr][fc] = move.promotion ? color + 'P' : piece;
    this.board[tr][tc] = captured || EMPTY_SQUARE;

    if (move.enPassant) {
      const epRow = color === WHITE ? tr + 1 : tr - 1;
      this.board[epRow][tc] = epCaptured;
    }

    if (move.castling) {
      const rookFrom = move.castling === 'K' ? 7 : 0;
      const rookTo = move.castling === 'K' ? 5 : 3;
      this.board[fr][rookFrom] = this.board[fr][rookTo];
      this.board[fr][rookTo] = EMPTY_SQUARE;
    }

    this.castling = prevCastling;
    this.epTarget = prevEp;
    this.halfmoveClock = prevHalf;
    if (color === BLACK) this.fullmoveNumber--;
    this.activeColor = color;
    this.history.pop();
  }

  isCheckmate() { return this.inCheck(this.activeColor) && this.allLegalMoves(this.activeColor).length === 0; }
  isStalemate() { return !this.inCheck(this.activeColor) && this.allLegalMoves(this.activeColor).length === 0; }
  isDraw() {
    if (this.halfmoveClock >= 100) return true;
    const pieces = [];
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c]) pieces.push(this.board[r][c]);
    if (pieces.length === 2) return true;
    if (pieces.length === 3 && pieces.some(p => this.typeOf(p) === 'B' || this.typeOf(p) === 'N')) return true;
    return false;
  }

  evaluate() {
    let score = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = this.board[r][c];
        if (!piece) continue;
        const color = this.colorOf(piece);
        const type = this.typeOf(piece);
        const val = PIECE_VALUES[type] || 0;
        const idx = color === WHITE ? r * BOARD_SIZE + c : (BOARD_SIZE - 1 - r) * BOARD_SIZE + c;
        const posVal = PIECE_SQUARE_TABLES[type] ? PIECE_SQUARE_TABLES[type][idx] : 0;
        score += color === WHITE ? val + posVal : -(val + posVal);
      }
    }
    return score;
  }
}
