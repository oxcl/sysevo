/**
 * TODOIST CHESS ENGINE
 * ====================
 * Section: Constants & Configuration
 * Section: Board State Management
 * Section: Piece Movement Rules
 * Section: Special Moves (Castling, En Passant, Promotion)
 * Section: Game State Detection (Check, Checkmate, Stalemate)
 * Section: Evaluation Function
 */

// --- Section: Constants ---
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
const DIRECTIONS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

// --- Section: Evaluation Tables ---
const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

const PIECE_SQUARE_TABLES = {
  P: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,0,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  N: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,5,10,15,15,10,5,-30,-30,0,15,20,20,15,0,-30,-30,5,15,20,20,15,5,-30,-30,0,10,15,15,10,0,-30,-30,5,5,10,10,5,5,-30,-40,-20,-30,-30,-30,-30,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  B: [-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,0,5,10,10,10,10,5,0,-5,0,10,10,10,10,0,-5,-10,0,5,10,10,10,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  R: [0,0,0,5,5,0,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,5,5,5,5,5,5,0,0,0,0,0,0,0,0,0],
  Q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,5,0,0,0,0,-10,-10,5,5,5,5,5,5,-10,0,0,5,5,5,5,0,0,-5,0,5,5,5,5,0,-5,-10,0,5,5,5,5,0,-10,-10,0,5,5,5,5,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  K: [20,30,10,0,0,10,30,20,20,20,0,0,0,0,20,20,20,-10,-20,-20,-20,-20,-10,20,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30]
};

// --- Section: Chess Engine Class ---
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
    this.board = INITIAL_BOARD.map(row => [...row]);
    this.turn = WHITE;
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epTarget = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = [];
  }

  // --- Section: Helper Methods ---
  colorOf(piece) { return piece ? piece[0] : null; }
  typeOf(piece) { return piece ? piece[1] : null; }
  isOwn(piece) { return this.colorOf(piece) === this.turn; }
  onBoard(r, c) { return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE; }

  // --- Section: King Detection ---
  findKing(color) {
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c] === color + 'K') return [r, c];
    return null;
  }

  // --- Section: Attack Detection ---
  isAttacked(r, c, byColor) {
    if (!this.onBoard(r, c)) return false;
    for (let i = 0; i < BOARD_SIZE; i++)
      for (let j = 0; j < BOARD_SIZE; j++) {
        const p = this.board[i][j];
        if (p && this.colorOf(p) === byColor && this.canAttack(i, j, r, c)) return true;
      }
    return false;
  }

  canAttack(fr, fc, tr, tc) {
    if (!this.onBoard(fr, fc) || !this.onBoard(tr, tc)) return false;
    const p = this.board[fr][fc];
    if (!p) return false;
    const type = this.typeOf(p), color = this.colorOf(p);
    const dr = tr - fr, dc = tc - fc, adr = Math.abs(dr), adc = Math.abs(dc);

    if (type === 'P') return dr === (color === WHITE ? -1 : 1) && adc === 1;
    if (type === 'N') return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
    if (type === 'B') return adr === adc && adr > 0 && this.isPathClear(fr, fc, tr, tc);
    if (type === 'R') return (dr === 0 || dc === 0) && (adr + adc) > 0 && this.isPathClear(fr, fc, tr, tc);
    if (type === 'Q') return ((adr === adc && adr > 0) || ((dr === 0 || dc === 0) && (adr + adc) > 0)) && this.isPathClear(fr, fc, tr, tc);
    if (type === 'K') return adr <= 1 && adc <= 1 && (adr + adc) > 0;
    return false;
  }

  isPathClear(fr, fc, tr, tc) {
    const sr = Math.sign(tr - fr), sc = Math.sign(tc - fc);
    let r = fr + sr, c = fc + sc;
    while (r !== tr || c !== tc) {
      if (!this.onBoard(r, c) || this.board[r][c]) return false;
      r += sr; c += sc;
    }
    return true;
  }

  inCheck(color) {
    const king = this.findKing(color);
    return king ? this.isAttacked(king[0], king[1], color === WHITE ? BLACK : WHITE) : false;
  }

  // --- Section: Move Generation ---
  pseudoMoves(r, c) {
    if (!this.onBoard(r, c)) return [];
    const p = this.board[r][c];
    if (!p) return [];
    const color = this.colorOf(p), type = this.typeOf(p), opp = color === WHITE ? BLACK : WHITE;
    const moves = [];

    const addIfValid = (tr, tc, flags = {}) => {
      if (!this.onBoard(tr, tc)) return;
      const target = this.board[tr][tc];
      if (!target || this.colorOf(target) === opp)
        moves.push({ from: [r, c], to: [tr, tc], ...flags });
    };

    const addSliding = (dirs) => {
      for (const [dr, dc] of dirs) {
        let tr = r + dr, tc = c + dc;
        while (this.onBoard(tr, tc)) {
          const target = this.board[tr][tc];
          if (target) {
            if (this.colorOf(target) === opp) moves.push({ from: [r, c], to: [tr, tc] });
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
        if (this.onBoard(fwd, c) && !this.board[fwd][c]) {
          if (fwd === promoRow) {
            for (const pp of ['Q', 'R', 'B', 'N']) moves.push({ from: [r, c], to: [fwd, c], promotion: pp });
          } else {
            moves.push({ from: [r, c], to: [fwd, c] });
            if (r === startRow && this.onBoard(r + 2 * dir, c) && !this.board[r + 2 * dir][c])
              moves.push({ from: [r, c], to: [r + 2 * dir, c], doublePush: true });
          }
        }
        for (const dc of [-1, 1]) {
          const tr = r + dir, tc = c + dc;
          if (!this.onBoard(tr, tc)) continue;
          const target = this.board[tr][tc];
          if (target && this.colorOf(target) === opp) {
            if (tr === promoRow) {
              for (const pp of ['Q', 'R', 'B', 'N']) moves.push({ from: [r, c], to: [tr, tc], promotion: pp });
            } else {
              moves.push({ from: [r, c], to: [tr, tc] });
            }
          }
          if (this.epTarget && tr === this.epTarget[0] && tc === this.epTarget[1])
            moves.push({ from: [r, c], to: [tr, tc], enPassant: true });
        }
        break;
      }
      case 'N': for (const [dr, dc] of KNIGHT_OFFSETS) addIfValid(r + dr, c + dc); break;
      case 'B': addSliding(DIRECTIONS.filter(([dr, dc]) => dr * dc !== 0)); break;
      case 'R': addSliding(DIRECTIONS.filter(([dr, dc]) => dr === 0 || dc === 0)); break;
      case 'Q': addSliding(DIRECTIONS); break;
      case 'K': {
        for (const [dr, dc] of KING_OFFSETS) addIfValid(r + dr, c + dc);
        const opp = color === WHITE ? BLACK : WHITE;
        if (this.castling[color + 'K'] && !this.board[r][5] && !this.board[r][6] &&
            this.board[r][7] === color + 'R' && !this.inCheck(color) &&
            !this.isAttacked(r, 5, opp) && !this.isAttacked(r, 6, opp))
          moves.push({ from: [r, c], to: [r, 6], castling: 'K' });
        if (this.castling[color + 'Q'] && !this.board[r][3] && !this.board[r][2] && !this.board[r][1] &&
            this.board[r][0] === color + 'R' && !this.inCheck(color) &&
            !this.isAttacked(r, 3, opp) && !this.isAttacked(r, 2, opp))
          moves.push({ from: [r, c], to: [r, 2], castling: 'Q' });
        break;
      }
    }
    return moves;
  }

  legalMoves(r, c) {
    if (!this.onBoard(r, c)) return [];
    const p = this.board[r][c];
    if (!p || !this.isOwn(p)) return [];
    const color = this.colorOf(p);
    return this.pseudoMoves(r, c).filter(m => {
      const snap = this.executeMove(m);
      const legal = !this.inCheck(color);
      this.revertMove(snap);
      return legal;
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

  // --- Section: Move Execution ---
  executeMove(move) {
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
    this.board[fr][fc] = EMPTY;

    if (move.enPassant) {
      const epRow = color === WHITE ? tr + 1 : tr - 1;
      if (this.onBoard(epRow, tc)) {
        snap.epCaptured = this.board[epRow][tc];
        this.board[epRow][tc] = EMPTY;
      }
    }

    this.epTarget = move.doublePush ? [(fr + tr) / 2, fc] : null;

    const type = this.typeOf(piece);
    if (type === 'K') { this.castling[color + 'K'] = false; this.castling[color + 'Q'] = false; }
    if (type === 'R') {
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

  revertMove(snap) {
    const { move, captured, prevCastling, prevEp, prevHalf, epCaptured } = snap;
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = this.board[tr][tc];
    const color = this.colorOf(piece);

    this.board[fr][fc] = move.promotion ? color + 'P' : piece;
    this.board[tr][tc] = captured || EMPTY;

    if (move.enPassant) {
      const epRow = color === WHITE ? tr + 1 : tr - 1;
      if (this.onBoard(epRow, tc)) this.board[epRow][tc] = epCaptured || EMPTY;
    }

    if (move.castling) {
      const rf = move.castling === 'K' ? 7 : 0;
      const rt = move.castling === 'K' ? 5 : 3;
      this.board[fr][rf] = this.board[fr][rt];
      this.board[fr][rt] = EMPTY;
    }

    this.castling = prevCastling;
    this.epTarget = prevEp;
    this.halfmoveClock = prevHalf;
    if (color === BLACK) this.fullmoveNumber--;
    this.turn = color;
    this.history.pop();
  }

  // --- Section: Game State Detection ---
  isCheckmate() { return this.inCheck(this.turn) && this.allLegalMoves(this.turn).length === 0; }
  isStalemate() { return !this.inCheck(this.turn) && this.allLegalMoves(this.turn).length === 0; }
  isDraw() {
    if (this.halfmoveClock >= 100) return true;
    const pieces = [];
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (this.board[r][c]) pieces.push(this.board[r][c]);
    if (pieces.length === 2) return true;
    if (pieces.length === 3 && pieces.some(p => ['B', 'N'].includes(this.typeOf(p)))) return true;
    return false;
  }

  // --- Section: Evaluation ---
  evaluate() {
    let score = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = this.board[r][c];
        if (!p) continue;
        const color = this.colorOf(p), type = this.typeOf(p);
        const idx = color === WHITE ? r * BOARD_SIZE + c : (BOARD_SIZE - 1 - r) * BOARD_SIZE + c;
        const value = (PIECE_VALUES[type] || 0) + (PIECE_SQUARE_TABLES[type] ? PIECE_SQUARE_TABLES[type][idx] : 0);
        score += color === WHITE ? value : -value;
      }
    }
    return score;
  }
}
