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

const KNIGHT_OFFSETS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_OFFSETS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const ALL_DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function validateBoard(board) {
  if (!Array.isArray(board) || board.length !== BOARD_SIZE) return false;
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (!Array.isArray(board[r]) || board[r].length !== BOARD_SIZE) return false;
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p !== null && (typeof p !== 'string' || p.length !== 2 || !['w','b'].includes(p[0]) || !['K','Q','R','B','N','P'].includes(p[1])))
        return false;
    }
  }
  return true;
}

function validateMove(move) {
  if (!move || typeof move !== 'object') return false;
  if (!Array.isArray(move.from) || move.from.length !== 2) return false;
  if (!Array.isArray(move.to) || move.to.length !== 2) return false;
  if (!Number.isInteger(move.from[0]) || !Number.isInteger(move.from[1])) return false;
  if (!Number.isInteger(move.to[0]) || !Number.isInteger(move.to[1])) return false;
  if (move.from[0] < 0 || move.from[0] >= BOARD_SIZE || move.from[1] < 0 || move.from[1] >= BOARD_SIZE) return false;
  if (move.to[0] < 0 || move.to[0] >= BOARD_SIZE || move.to[1] < 0 || move.to[1] >= BOARD_SIZE) return false;
  return true;
}

export class ChessEngine {
  constructor() {
    this.board = [];
    this.turn = WHITE;
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epTarget = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = [];
    this.reset();
  }

  reset() {
    this.board = INITIAL_BOARD.map(r => [...r]);
    this.turn = WHITE;
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epTarget = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = [];
  }

  colorOf(p) { return p && typeof p === 'string' && p.length >= 2 ? p[0] : null; }
  typeOf(p) { return p && typeof p === 'string' && p.length >= 2 ? p[1] : null; }
  isOwn(p) { return this.colorOf(p) === this.turn; }
  inBounds(r, c) { return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE; }

  findKing(color) {
    if (color !== WHITE && color !== BLACK) return null;
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c] === color + 'K') return [r, c];
    return null;
  }

  isAttacked(r, c, byColor) {
    if (!this.inBounds(r, c)) return false;
    if (byColor !== WHITE && byColor !== BLACK) return false;
    for (let row = 0; row < BOARD_SIZE; row++)
      for (let col = 0; col < BOARD_SIZE; col++) {
        const p = this.board[row][col];
        if (p && this.colorOf(p) === byColor && this.canAttack(row, col, r, c)) return true;
      }
    return false;
  }

  canAttack(fr, fc, tr, tc) {
    if (!this.inBounds(fr, fc) || !this.inBounds(tr, tc)) return false;
    const piece = this.board[fr][fc];
    if (!piece) return false;
    const type = this.typeOf(piece);
    const color = this.colorOf(piece);
    if (!type || !color) return false;
    const dr = tr - fr, dc = tc - fc;
    const adr = Math.abs(dr), adc = Math.abs(dc);

    if (type === 'P') return dr === (color === WHITE ? -1 : 1) && adc === 1;
    if (type === 'N') return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
    if (type === 'B') return adr === adc && adr > 0 && this.isClear(fr, fc, tr, tc);
    if (type === 'R') return (dr === 0 || dc === 0) && (adr + adc) > 0 && this.isClear(fr, fc, tr, tc);
    if (type === 'Q') return ((adr === adc && adr > 0) || ((dr === 0 || dc === 0) && (adr + adc) > 0)) && this.isClear(fr, fc, tr, tc);
    if (type === 'K') return adr <= 1 && adc <= 1 && (adr + adc) > 0;
    return false;
  }

  isClear(fr, fc, tr, tc) {
    const sr = Math.sign(tr - fr), sc = Math.sign(tc - fc);
    let r = fr + sr, c = fc + sc;
    while (r !== tr || c !== tc) {
      if (!this.inBounds(r, c)) return false;
      if (this.board[r][c]) return false;
      r += sr; c += sc;
    }
    return true;
  }

  inCheck(color) {
    const king = this.findKing(color);
    if (!king) return false;
    return this.isAttacked(king[0], king[1], color === WHITE ? BLACK : WHITE);
  }

  pseudoMoves(r, c) {
    if (!this.inBounds(r, c)) return [];
    const piece = this.board[r][c];
    if (!piece) return [];
    const color = this.colorOf(piece);
    const type = this.typeOf(piece);
    if (!color || !type) return [];
    const opp = color === WHITE ? BLACK : WHITE;
    const moves = [];

    const addValid = (tr, tc, flags = {}) => {
      if (!this.inBounds(tr, tc)) return;
      const tgt = this.board[tr][tc];
      if (!tgt || this.colorOf(tgt) === opp)
        moves.push({ from: [r,c], to: [tr,tc], ...flags });
    };

    const addSlide = (dirs) => {
      for (const [dr, dc] of dirs) {
        let tr = r+dr, tc = c+dc;
        while (this.inBounds(tr, tc)) {
          const tgt = this.board[tr][tc];
          if (tgt) {
            if (this.colorOf(tgt) === opp) moves.push({ from: [r,c], to: [tr,tc] });
            break;
          }
          moves.push({ from: [r,c], to: [tr,tc] });
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
            if (r === startRow && this.inBounds(r + 2*dir, c) && !this.board[r + 2*dir][c])
              moves.push({ from: [r,c], to: [r + 2*dir,c], doublePush: true });
          }
        }
        for (const dc of [-1, 1]) {
          const tr = r + dir, tc = c + dc;
          if (!this.inBounds(tr, tc)) continue;
          const tgt = this.board[tr][tc];
          if (tgt && this.colorOf(tgt) === opp) {
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
      case 'N': for (const [dr,dc] of KNIGHT_OFFSETS) addValid(r+dr, c+dc); break;
      case 'B': addSlide(ALL_DIRS.filter(([dr,dc]) => dr*dc !== 0)); break;
      case 'R': addSlide(ALL_DIRS.filter(([dr,dc]) => dr === 0 || dc === 0)); break;
      case 'Q': addSlide(ALL_DIRS); break;
      case 'K': {
        for (const [dr,dc] of KING_OFFSETS) addValid(r+dr, c+dc);
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

  legalMoves(r, c) {
    if (!this.inBounds(r, c)) return [];
    const piece = this.board[r][c];
    if (!piece || !this.isOwn(piece)) return [];
    const color = this.colorOf(piece);
    return this.pseudoMoves(r, c).filter(m => {
      const snap = this.applyMove(m);
      const ok = !this.inCheck(color);
      this.undoMove(snap);
      return ok;
    });
  }

  allLegalMoves(color) {
    if (color !== WHITE && color !== BLACK) return [];
    const saved = this.turn;
    this.turn = color;
    const moves = [];
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c] && this.colorOf(this.board[r][c]) === color)
          moves.push(...this.legalMoves(r, c));
    this.turn = saved;
    return moves;
  }

  applyMove(move) {
    if (!validateMove(move)) throw new Error('Invalid move format');
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = this.board[fr][fc];
    if (!piece) throw new Error('No piece at source square');
    const captured = this.board[tr][tc];
    const color = this.colorOf(piece);
    const snap = { move, captured, prevCastling: { ...this.castling }, prevEp: this.epTarget, prevHalf: this.halfmoveClock };

    this.board[tr][tc] = move.promotion ? color + move.promotion : piece;
    this.board[fr][fc] = EMPTY;

    if (move.enPassant) {
      const epRow = color === WHITE ? tr + 1 : tr - 1;
      if (this.inBounds(epRow, tc)) {
        snap.epCaptured = this.board[epRow][tc];
        this.board[epRow][tc] = EMPTY;
      }
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
      const rf = move.castling === 'K' ? 7 : 0;
      const rt = move.castling === 'K' ? 5 : 3;
      this.board[tr][rt] = this.board[tr][rf];
      this.board[tr][rf] = EMPTY;
    }

    this.halfmoveClock = (type === 'P' || captured || move.enPassant) ? 0 : this.halfmoveClock + 1;
    if (color === BLACK) this.fullmoveNumber++;
    this.turn = color === WHITE ? BLACK : WHITE;
    this.history.push(snap);
    return snap;
  }

  undoMove(snap) {
    if (!snap) return;
    const { move, captured, prevCastling, prevEp, prevHalf, epCaptured } = snap;
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = this.board[tr][tc];
    if (!piece) return;
    const color = this.colorOf(piece);

    this.board[fr][fc] = move.promotion ? color + 'P' : piece;
    this.board[tr][tc] = captured || EMPTY;

    if (move.enPassant && this.inBounds(tr, tc)) {
      const epRow = color === WHITE ? tr + 1 : tr - 1;
      if (this.inBounds(epRow, tc)) this.board[epRow][tc] = epCaptured || EMPTY;
    }

    if (move.castling) {
      const rf = move.castling === 'K' ? 7 : 0;
      const rt = move.castling === 'K' ? 5 : 3;
      this.board[fr][rf] = this.board[fr][rt];
      this.board[fr][rt] = EMPTY;
    }

    this.castling = prevCastling || { wK:true,wQ:true,bK:true,bQ:true };
    this.epTarget = prevEp;
    this.halfmoveClock = prevHalf || 0;
    if (color === BLACK) this.fullmoveNumber--;
    this.turn = color;
    this.history.pop();
  }

  isCheckmate() { return this.inCheck(this.turn) && this.allLegalMoves(this.turn).length === 0; }
  isStalemate() { return !this.inCheck(this.turn) && this.allLegalMoves(this.turn).length === 0; }
  isDraw() {
    if (this.halfmoveClock >= 100) return true;
    const ps = [];
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c]) ps.push(this.board[r][c]);
    if (ps.length === 2) return true;
    if (ps.length === 3 && ps.some(p => ['B','N'].includes(this.typeOf(p)))) return true;
    return false;
  }

  evaluate() {
    const vals = { P:100, N:320, B:330, R:500, Q:900, K:20000 };
    const pst = {
      P: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,0,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      N: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,5,10,15,15,10,5,-30,-30,0,15,20,20,15,0,-30,-30,5,15,20,20,15,5,-30,-30,0,10,15,15,10,0,-30,-30,5,5,10,10,5,5,-30,-40,-20,-30,-30,-30,-30,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
      B: [-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,0,5,10,10,10,10,5,0,-5,0,10,10,10,10,0,-5,-10,0,5,10,10,10,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
      R: [0,0,0,5,5,0,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,5,5,5,5,5,5,0,0,0,0,0,0,0,0,0],
      Q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,5,0,0,0,0,-10,-10,5,5,5,5,5,5,-10,0,0,5,5,5,5,0,0,-5,0,5,5,5,5,0,-5,-10,0,5,5,5,5,0,-10,-10,0,5,5,5,5,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
      K: [20,30,10,0,0,10,30,20,20,20,0,0,0,0,20,20,20,-10,-20,-20,-20,-20,-10,20,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30]
    };
    let score = 0;
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = this.board[r][c];
        if (!p) continue;
        const color = this.colorOf(p);
        const type = this.typeOf(p);
        const idx = color === WHITE ? r*BOARD_SIZE+c : (BOARD_SIZE-1-r)*BOARD_SIZE+c;
        const val = (vals[type]||0) + (pst[type]?pst[type][idx]:0);
        score += color === WHITE ? val : -val;
      }
    return score;
  }
}
