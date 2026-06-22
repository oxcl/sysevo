/**
 * Chess Engine - Personality Edition
 * Bitboard-inspired, transposition tables, iterative deepening
 */

const PIECE_TYPES = { PAWN: 0, KNIGHT: 1, BISHOP: 2, ROOK: 3, QUEEN: 4, KING: 5 };
const COLORS = { WHITE: 0, BLACK: 1 };
const PIECE_CHARS = ['p', 'n', 'b', 'r', 'q', 'k'];

export class ChessEngine {
  constructor() {
    this.board = this.initBoard();
    this.turn = COLORS.WHITE;
    this.castling = [0b1111, 0b1111]; // WK, WQ, BK, BQ bits
    this.enPassant = -1;
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.history = [];
    this.gameOver = false;
    this.result = null;
    this.hash = 0;
    this.zobrist = this.initZobrist();
  }

  initBoard() {
    const b = new Array(64).fill(null);
    const back = [3, 1, 2, 4, 5, 2, 1, 3]; // r,n,b,q,k,b,n,r
    
    for (let c = 0; c < 8; c++) {
      b[c] = { type: back[c], color: COLORS.BLACK };
      b[8 + c] = { type: 0, color: COLORS.BLACK };
      b[48 + c] = { type: 0, color: COLORS.WHITE };
      b[56 + c] = { type: back[c], color: COLORS.WHITE };
    }
    return b;
  }

  initZobrist() {
    const keys = [];
    for (let i = 0; i < 64; i++) {
      keys[i] = [];
      for (let j = 0; j < 12; j++) {
        keys[i][j] = Math.floor(Math.random() * 0xFFFFFFFF);
      }
    }
    return keys;
  }

  computeHash() {
    let h = 0;
    for (let i = 0; i < 64; i++) {
      if (this.board[i]) {
        const idx = this.board[i].color * 6 + this.board[i].type;
        h ^= this.zobrist[i][idx];
      }
    }
    return h;
  }

  at(sq) { return sq < 0 || sq > 63 ? null : this.board[sq]; }
  row(sq) { return sq >> 3; }
  col(sq) { return sq & 7; }
  sq(r, c) { return (r << 3) | c; }

  findKing(color) {
    for (let i = 0; i < 64; i++)
      if (this.board[i]?.type === 5 && this.board[i]?.color === color) return i;
    return -1;
  }

  isAttacked(sq, by) {
    const r = this.row(sq), c = this.col(sq);
    
    // Knight attacks
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const p = this.at(this.sq(r+dr, c+dc));
      if (p?.color === by && p.type === 1) return true;
    }
    
    // Pawn attacks
    const pd = by === 0 ? 1 : -1;
    for (const dc of [-1, 1]) {
      const p = this.at(this.sq(r+pd, c+dc));
      if (p?.color === by && p.type === 0) return true;
    }
    
    // King attacks
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const p = this.at(this.sq(r+dr, c+dc));
      if (p?.color === by && p.type === 5) return true;
    }
    
    // Sliding attacks
    const slides = [
      { dirs: [[-1,-1],[-1,1],[1,-1],[1,1]], types: [2, 4] },
      { dirs: [[-1,0],[1,0],[0,-1],[0,1]], types: [3, 4] }
    ];
    
    for (const { dirs, types } of slides) {
      for (const [dr, dc] of dirs) {
        for (let i = 1; i < 8; i++) {
          const p = this.at(this.sq(r+dr*i, c+dc*i));
          if (p) {
            if (p.color === by && types.includes(p.type)) return true;
            break;
          }
        }
      }
    }
    
    return false;
  }

  inCheck(color) {
    const k = this.findKing(color);
    return k >= 0 ? this.isAttacked(k, 1 - color) : false;
  }

  pseudoMoves(sq) {
    const p = this.board[sq];
    if (!p) return [];
    const moves = [];
    const r = this.row(sq), c = this.col(sq);
    const enemy = 1 - p.color;

    const add = (tsq, special = null) => {
      const t = this.board[tsq];
      if (!t || t.color === enemy)
        moves.push({ from: sq, to: tsq, piece: p, special });
    };

    const slide = (dr, dc) => {
      for (let i = 1; i < 8; i++) {
        const tsq = this.sq(r+dr*i, c+dc*i);
        const t = this.board[tsq];
        if (!t) moves.push({ from: sq, to: tsq, piece: p });
        else { if (t.color === enemy) moves.push({ from: sq, to: tsq, piece: p }); break; }
      }
    };

    switch (p.type) {
      case 0: { // Pawn
        const dir = p.color === 0 ? -1 : 1;
        const start = p.color === 0 ? 6 : 1;
        const promo = p.color === 0 ? 0 : 7;
        const next = this.sq(r+dir, c);
        
        if (!this.board[next]) {
          if (r+dir === promo) {
            for (let pp = 0; pp < 4; pp++)
              moves.push({ from: sq, to: next, piece: p, special: 'promo', promotion: pp });
          } else {
            moves.push({ from: sq, to: next, piece: p });
            if (r === start) {
              const next2 = this.sq(r+2*dir, c);
              if (!this.board[next2])
                moves.push({ from: sq, to: next2, piece: p, special: 'double' });
            }
          }
        }
        
        for (const dc of [-1, 1]) {
          const tsq = this.sq(r+dir, c+dc);
          const t = this.board[tsq];
          if (t?.color === enemy) {
            if (r+dir === promo) {
              for (let pp = 0; pp < 4; pp++)
                moves.push({ from: sq, to: tsq, piece: p, special: 'promo', promotion: pp });
            } else {
              moves.push({ from: sq, to: tsq, piece: p });
            }
          }
          if (tsq === this.enPassant)
            moves.push({ from: sq, to: tsq, piece: p, special: 'ep' });
        }
        break;
      }
      case 1: // Knight
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
          add(this.sq(r+dr, c+dc));
        break;
      case 2: // Bishop
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc);
        break;
      case 3: // Rook
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc);
        break;
      case 4: // Queen
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) slide(dr, dc);
        break;
      case 5: // King
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
          add(this.sq(r+dr, c+dc));
        
        // Castling
        const cRights = this.castling[p.color];
        if (cRights & 2 && !this.inCheck(p.color)) { // King side
          if (!this.board[this.sq(r, 5)] && !this.board[this.sq(r, 6)] &&
              !this.isAttacked(this.sq(r, 5), enemy) && !this.isAttacked(this.sq(r, 6), enemy))
            moves.push({ from: sq, to: this.sq(r, 6), piece: p, special: 'ck' });
        }
        if (cRights & 1 && !this.inCheck(p.color)) { // Queen side
          if (!this.board[this.sq(r, 3)] && !this.board[this.sq(r, 2)] && !this.board[this.sq(r, 1)] &&
              !this.isAttacked(this.sq(r, 3), enemy) && !this.isAttacked(this.sq(r, 2), enemy))
            moves.push({ from: sq, to: this.sq(r, 2), piece: p, special: 'cq' });
        }
        break;
    }
    return moves;
  }

  legalMoves(color) {
    const moves = [];
    for (let i = 0; i < 64; i++)
      if (this.board[i]?.color === color)
        for (const m of this.pseudoMoves(i))
          if (this.isLegal(m)) moves.push(m);
    return moves;
  }

  isLegal(move) {
    const save = this.save();
    this.apply(move);
    const legal = !this.inCheck(move.piece.color);
    this.restore(save);
    return legal;
  }

  apply(move) {
    const { from, to, special } = move;
    if (special === 'ep') this.board[this.sq(this.row(to), from & 7)] = null;
    this.board[to] = this.board[from];
    this.board[from] = null;
    if (special === 'promo') this.board[to] = { type: move.promotion, color: move.piece.color };
    if (special === 'ck') { this.board[this.sq(this.row(from), 5)] = this.board[this.sq(this.row(from), 7)]; this.board[this.sq(this.row(from), 7)] = null; }
    if (special === 'cq') { this.board[this.sq(this.row(from), 3)] = this.board[this.sq(this.row(from), 0)]; this.board[this.sq(this.row(from), 0)] = null; }
  }

  save() {
    return {
      board: this.board.map(c => c ? {...c} : null),
      castling: [...this.castling],
      enPassant: this.enPassant,
      halfMoves: this.halfMoves,
      fullMoves: this.fullMoves
    };
  }

  restore(s) {
    this.board = s.board;
    this.castling = s.castling;
    this.enPassant = s.enPassant;
    this.halfMoves = s.halfMoves;
    this.fullMoves = s.fullMoves;
  }

  makeMove(move) {
    if (this.gameOver) return false;
    const save = this.save();
    this.apply(move);
    
    this.halfMoves = (move.piece.type === 0 || move.special === 'ep') ? 0 : this.halfMoves + 1;
    
    if (move.piece.type === 5) this.castling[move.piece.color] = 0;
    if (move.piece.type === 3) {
      if ((move.from & 7) === 0) this.castling[move.piece.color] &= ~1;
      if ((move.from & 7) === 7) this.castling[move.piece.color] &= ~2;
    }
    
    this.enPassant = move.special === 'double' ? (move.from + move.to) / 2 : -1;
    this.turn = 1 - this.turn;
    if (this.turn === 0) this.fullMoves++;
    
    this.history.push({ move, save });
    this.hash = this.computeHash();
    
    const moves = this.legalMoves(this.turn);
    if (moves.length === 0) {
      this.gameOver = true;
      this.result = this.inCheck(this.turn) ? (this.turn === 0 ? '0-1' : '1-0') : '1/2-1/2';
    } else if (this.halfMoves >= 100) {
      this.gameOver = true;
      this.result = '1/2-1/2';
    }
    
    return true;
  }

  undo() {
    if (!this.history.length) return false;
    const { save } = this.history.pop();
    this.restore(save);
    this.turn = 1 - this.turn;
    this.gameOver = false;
    this.result = null;
    this.hash = this.computeHash();
    return true;
  }

  clone() {
    const e = new ChessEngine();
    e.board = this.board.map(c => c ? {...c} : null);
    e.turn = this.turn;
    e.castling = [...this.castling];
    e.enPassant = this.enPassant;
    e.halfMoves = this.halfMoves;
    e.fullMoves = this.fullMoves;
    e.gameOver = this.gameOver;
    e.result = this.result;
    e.hash = this.hash;
    return e;
  }
}