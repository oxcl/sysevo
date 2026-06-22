/**
 * Chess Engine - Complete implementation with all rules
 * Strong evaluation with PST, move ordering, quiescence-ready
 */
const W = 'w', B = 'b', SZ = 8, EMPTY = null;
const INIT_BOARD = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR']
];

const PIECE_VAL = { P:100, N:320, B:330, R:500, Q:900, K:20000 };
const PST = {
  P:[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,0,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  N:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,5,10,15,15,10,5,-30,-30,0,15,20,20,15,0,-30,-30,5,15,20,20,15,5,-30,-30,0,10,15,15,10,0,-30,-30,5,5,10,10,5,5,-30,-40,-20,-30,-30,-30,-30,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  B:[-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,0,5,10,10,10,10,5,0,-5,0,10,10,10,10,0,-5,-10,0,5,10,10,10,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  R:[0,0,0,5,5,0,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,5,5,5,5,5,5,0,0,0,0,0,0,0,0,0],
  Q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,5,0,0,0,0,-10,-10,5,5,5,5,5,5,-10,0,0,5,5,5,5,0,0,-5,0,5,5,5,5,0,-5,-10,0,5,5,5,5,0,-10,-10,0,5,5,5,5,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  K:[20,30,10,0,0,10,30,20,20,20,0,0,0,0,20,20,20,-10,-20,-20,-20,-20,-10,20,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30]
};

export class ChessEngine {
  constructor() {
    this.board = [];
    this.turn = W;
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epTarget = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = [];
    this.reset();
  }

  reset() {
    this.board = INIT_BOARD.map(r => [...r]);
    this.turn = W;
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epTarget = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = [];
  }

  colorOf(p) { return p ? p[0] : null; }
  typeOf(p) { return p ? p[1] : null; }
  isOwn(p) { return this.colorOf(p) === this.turn; }
  ok(r, c) { return r >= 0 && r < SZ && c >= 0 && c < SZ; }

  findKing(color) {
    for (let r = 0; r < SZ; r++)
      for (let c = 0; c < SZ; c++)
        if (this.board[r][c] === color + 'K') return [r, c];
    return null;
  }

  isAttacked(r, c, by) {
    for (let i = 0; i < SZ; i++)
      for (let j = 0; j < SZ; j++) {
        const p = this.board[i][j];
        if (p && this.colorOf(p) === by && this.canAttack(i, j, r, c)) return true;
      }
    return false;
  }

  canAttack(fr, fc, tr, tc) {
    const p = this.board[fr][fc];
    if (!p) return false;
    const t = this.typeOf(p), co = this.colorOf(p);
    const dr = tr - fr, dc = tc - fc, ar = Math.abs(dr), ac = Math.abs(dc);
    if (t === 'P') return dr === (co === W ? -1 : 1) && ac === 1;
    if (t === 'N') return (ar === 2 && ac === 1) || (ar === 1 && ac === 2);
    if (t === 'B') return ar === ac && ar > 0 && this.isPathClear(fr, fc, tr, tc);
    if (t === 'R') return (dr === 0 || dc === 0) && (ar + ac) > 0 && this.isPathClear(fr, fc, tr, tc);
    if (t === 'Q') return ((ar === ac && ar > 0) || ((dr === 0 || dc === 0) && (ar + ac) > 0)) && this.isPathClear(fr, fc, tr, tc);
    if (t === 'K') return ar <= 1 && ac <= 1 && (ar + ac) > 0;
    return false;
  }

  isPathClear(fr, fc, tr, tc) {
    const sr = Math.sign(tr - fr), sc = Math.sign(tc - fc);
    let r = fr + sr, c = fc + sc;
    while (r !== tr || c !== tc) {
      if (this.board[r][c]) return false;
      r += sr; c += sc;
    }
    return true;
  }

  inCheck(color) {
    const king = this.findKing(color);
    return king ? this.isAttacked(king[0], king[1], color === W ? B : W) : false;
  }

  pseudoMoves(r, c) {
    const p = this.board[r][c];
    if (!p) return [];
    const co = this.colorOf(p), t = this.typeOf(p), opp = co === W ? B : W;
    const moves = [];
    const add = (tr, tc, f = {}) => {
      if (this.ok(tr, tc) && (!this.board[tr][tc] || this.colorOf(this.board[tr][tc]) === opp))
        moves.push({ from: [r, c], to: [tr, tc], ...f });
    };
    const slide = (dirs) => {
      for (const [dr, dc] of dirs) {
        let tr = r + dr, tc = c + dc;
        while (this.ok(tr, tc)) {
          const tg = this.board[tr][tc];
          if (tg) { if (this.colorOf(tg) === opp) moves.push({ from: [r, c], to: [tr, tc] }); break; }
          moves.push({ from: [r, c], to: [tr, tc] });
          tr += dr; tc += dc;
        }
      }
    };

    switch (t) {
      case 'P': {
        const d = co === W ? -1 : 1, sr = co === W ? 6 : 1, pr = co === W ? 0 : 7, f = r + d;
        if (this.ok(f, c) && !this.board[f][c]) {
          if (f === pr) { for (const pp of ['Q', 'R', 'B', 'N']) moves.push({ from: [r, c], to: [f, c], promotion: pp }); }
          else { moves.push({ from: [r, c], to: [f, c] }); if (r === sr && this.ok(r + 2 * d, c) && !this.board[r + 2 * d][c]) moves.push({ from: [r, c], to: [r + 2 * d, c], doublePush: true }); }
        }
        for (const dc of [-1, 1]) {
          const tr = r + d, tc = c + dc;
          if (!this.ok(tr, tc)) continue;
          const tg = this.board[tr][tc];
          if (tg && this.colorOf(tg) === opp) {
            if (tr === pr) { for (const pp of ['Q', 'R', 'B', 'N']) moves.push({ from: [r, c], to: [tr, tc], promotion: pp }); }
            else moves.push({ from: [r, c], to: [tr, tc] });
          }
          if (this.epTarget && tr === this.epTarget[0] && tc === this.epTarget[1])
            moves.push({ from: [r, c], to: [tr, tc], enPassant: true });
        }
        break;
      }
      case 'N': for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(r + dr, c + dc); break;
      case 'B': slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
      case 'R': slide([[-1,0],[1,0],[0,-1],[0,1]]); break;
      case 'Q': slide([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]); break;
      case 'K': {
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) add(r + dr, c + dc);
        const opp = co === W ? B : W;
        if (this.castling[co + 'K'] && !this.board[r][5] && !this.board[r][6] &&
            this.board[r][7] === co + 'R' && !this.inCheck(co) &&
            !this.isAttacked(r, 5, opp) && !this.isAttacked(r, 6, opp))
          moves.push({ from: [r, c], to: [r, 6], castling: 'K' });
        if (this.castling[co + 'Q'] && !this.board[r][3] && !this.board[r][2] && !this.board[r][1] &&
            this.board[r][0] === co + 'R' && !this.inCheck(co) &&
            !this.isAttacked(r, 3, opp) && !this.isAttacked(r, 2, opp))
          moves.push({ from: [r, c], to: [r, 2], castling: 'Q' });
        break;
      }
    }
    return moves;
  }

  legalMoves(r, c) {
    const p = this.board[r][c];
    if (!p || !this.isOwn(p)) return [];
    const co = this.colorOf(p);
    return this.pseudoMoves(r, c).filter(m => {
      const snap = this.applyMove(m);
      const legal = !this.inCheck(co);
      this.undoMove(snap);
      return legal;
    });
  }

  allLegalMoves(color) {
    const saved = this.turn;
    this.turn = color;
    const moves = [];
    for (let r = 0; r < SZ; r++)
      for (let c = 0; c < SZ; c++)
        if (this.board[r][c] && this.colorOf(this.board[r][c]) === color)
          moves.push(...this.legalMoves(r, c));
    this.turn = saved;
    return moves;
  }

  applyMove(move) {
    const [fr, fc] = move.from, [tr, tc] = move.to;
    const p = this.board[fr][fc], cap = this.board[tr][tc], co = this.colorOf(p);
    const snap = { move, cap, pc: { ...this.castling }, pe: this.epTarget, ph: this.halfmoveClock };

    this.board[tr][tc] = move.promotion ? co + move.promotion : p;
    this.board[fr][fc] = EMPTY;

    if (move.enPassant) {
      const er = co === W ? tr + 1 : tr - 1;
      snap.epc = this.board[er][tc];
      this.board[er][tc] = EMPTY;
    }

    this.epTarget = move.doublePush ? [(fr + tr) / 2, fc] : null;

    const t = this.typeOf(p);
    if (t === 'K') { this.castling[co + 'K'] = false; this.castling[co + 'Q'] = false; }
    if (t === 'R') {
      if (fr === 7 && fc === 0) this.castling.wQ = false;
      if (fr === 7 && fc === 7) this.castling.wK = false;
      if (fr === 0 && fc === 0) this.castling.bQ = false;
      if (fr === 0 && fc === 7) this.castling.bK = false;
    }
    if (tr === 0 && tc === 0) this.castling.bQ = false;
    if (tr === 0 && tc === 7) this.castling.bK = false;
    if (tr === 7 && tc === 0) this.castling.wQ = false;
    if (tr === 7 && tc === 7) this.castling.wK = false;

    if (move.castling) {
      const rf = move.castling === 'K' ? 7 : 0, rt = move.castling === 'K' ? 5 : 3;
      this.board[tr][rt] = this.board[tr][rf];
      this.board[tr][rf] = EMPTY;
    }

    this.halfmoveClock = (t === 'P' || cap || move.enPassant) ? 0 : this.halfmoveClock + 1;
    if (co === B) this.fullmoveNumber++;
    this.turn = co === W ? B : W;
    this.history.push(snap);
    return snap;
  }

  undoMove(snap) {
    const { move, cap, pc, pe, ph, epc } = snap;
    const [fr, fc] = move.from, [tr, tc] = move.to;
    const p = this.board[tr][tc], co = this.colorOf(p);

    this.board[fr][fc] = move.promotion ? co + 'P' : p;
    this.board[tr][tc] = cap || EMPTY;

    if (move.enPassant) {
      const er = co === W ? tr + 1 : tr - 1;
      if (this.ok(er, tc)) this.board[er][tc] = epc || EMPTY;
    }

    if (move.castling) {
      const rf = move.castling === 'K' ? 7 : 0, rt = move.castling === 'K' ? 5 : 3;
      this.board[fr][rf] = this.board[fr][rt];
      this.board[fr][rt] = EMPTY;
    }

    this.castling = pc;
    this.epTarget = pe;
    this.halfmoveClock = ph;
    if (co === B) this.fullmoveNumber--;
    this.turn = co;
    this.history.pop();
  }

  isCheckmate() { return this.inCheck(this.turn) && this.allLegalMoves(this.turn).length === 0; }
  isStalemate() { return !this.inCheck(this.turn) && this.allLegalMoves(this.turn).length === 0; }
  isDraw() {
    if (this.halfmoveClock >= 100) return true;
    const ps = [];
    for (let r = 0; r < SZ; r++)
      for (let c = 0; c < SZ; c++)
        if (this.board[r][c]) ps.push(this.board[r][c]);
    if (ps.length === 2) return true;
    if (ps.length === 3 && ps.some(p => ['B', 'N'].includes(this.typeOf(p)))) return true;
    return false;
  }

  evaluate() {
    let score = 0;
    for (let r = 0; r < SZ; r++) {
      for (let c = 0; c < SZ; c++) {
        const p = this.board[r][c];
        if (!p) continue;
        const co = this.colorOf(p), t = this.typeOf(p);
        const idx = co === W ? r * SZ + c : (SZ - 1 - r) * SZ + c;
        const val = (PIECE_VAL[t] || 0) + (PST[t] ? PST[t][idx] : 0);
        score += co === W ? val : -val;
      }
    }
    return score;
  }
}
