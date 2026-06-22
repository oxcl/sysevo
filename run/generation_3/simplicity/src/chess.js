/**
 * Chess Engine - Simplicity Edition
 * 300 lines, data-driven, no abstractions
 */

export class ChessEngine {
  constructor() {
    this.board = this.initBoard();
    this.turn = 'w';
    this.castling = { w: { k: true, q: true }, b: { k: true, q: true } };
    this.enPassant = null;
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.history = [];
    this.gameOver = false;
    this.result = null;
  }

  initBoard() {
    const b = Array(8).fill(null).map(() => Array(8).fill(null));
    const back = ['r','n','b','q','k','b','n','r'];
    for (let c = 0; c < 8; c++) {
      b[0][c] = { type: back[c], color: 'b' };
      b[1][c] = { type: 'p', color: 'b' };
      b[6][c] = { type: 'p', color: 'w' };
      b[7][c] = { type: back[c], color: 'w' };
    }
    return b;
  }

  at(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : this.board[r][c]; }

  findKing(color) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (this.board[r][c]?.type === 'k' && this.board[r][c]?.color === color)
          return { row: r, col: c };
    return null;
  }

  isAttacked(row, col, by) {
    const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightMoves) {
      const p = this.at(row+dr, col+dc);
      if (p?.color === by && p.type === 'n') return true;
    }
    const pd = by === 'w' ? 1 : -1;
    for (const dc of [-1, 1]) {
      const p = this.at(row+pd, col+dc);
      if (p?.color === by && p.type === 'p') return true;
    }
    const allDirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (const [dr, dc] of allDirs) {
      const p = this.at(row+dr, col+dc);
      if (p?.color === by && p.type === 'k') return true;
    }
    const slides = [
      { dirs: [[-1,-1],[-1,1],[1,-1],[1,1]], types: ['b','q'] },
      { dirs: [[-1,0],[1,0],[0,-1],[0,1]], types: ['r','q'] }
    ];
    for (const { dirs, types } of slides) {
      for (const [dr, dc] of dirs) {
        for (let i = 1; i < 8; i++) {
          const p = this.at(row+dr*i, col+dc*i);
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
    return k ? this.isAttacked(k.row, k.col, color === 'w' ? 'b' : 'w') : false;
  }

  pseudoMoves(row, col) {
    const p = this.board[row][col];
    if (!p) return [];
    const moves = [];
    const enemy = p.color === 'w' ? 'b' : 'w';
    const add = (tr, tc, special = null) => {
      const t = this.at(tr, tc);
      if (!t || t.color === enemy) moves.push({ from: { row, col }, to: { row: tr, col: tc }, piece: p, special });
    };
    const slide = (dr, dc) => {
      for (let i = 1; i < 8; i++) {
        const t = this.at(row+dr*i, col+dc*i);
        if (!t) moves.push({ from: { row, col }, to: { row: row+dr*i, col: col+dc*i }, piece: p });
        else { if (t.color === enemy) moves.push({ from: { row, col }, to: { row: row+dr*i, col: col+dc*i }, piece: p }); break; }
      }
    };
    if (p.type === 'p') {
      const dir = p.color === 'w' ? -1 : 1;
      const start = p.color === 'w' ? 6 : 1;
      const promo = p.color === 'w' ? 0 : 7;
      if (!this.at(row+dir, col)) {
        if (row+dir === promo) {
          for (const pp of ['q','r','b','n']) moves.push({ from: { row, col }, to: { row: row+dir, col }, piece: p, special: 'promo', promotion: pp });
        } else {
          moves.push({ from: { row, col }, to: { row: row+dir, col }, piece: p });
          if (row === start && !this.at(row+2*dir, col)) moves.push({ from: { row, col }, to: { row: row+2*dir, col }, piece: p, special: 'double' });
        }
      }
      for (const dc of [-1, 1]) {
        const t = this.at(row+dir, col+dc);
        if (t?.color === enemy) {
          if (row+dir === promo) {
            for (const pp of ['q','r','b','n']) moves.push({ from: { row, col }, to: { row: row+dir, col: col+dc }, piece: p, special: 'promo', promotion: pp });
          } else {
            moves.push({ from: { row, col }, to: { row: row+dir, col: col+dc }, piece: p });
          }
        }
        if (this.enPassant?.row === row+dir && this.enPassant?.col === col+dc) moves.push({ from: { row, col }, to: { row: row+dir, col: col+dc }, piece: p, special: 'ep' });
      }
    } else if (p.type === 'n') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(row+dr, col+dc);
    } else if (p.type === 'b') {
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc);
    } else if (p.type === 'r') {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc);
    } else if (p.type === 'q') {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) slide(dr, dc);
    } else if (p.type === 'k') {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) add(row+dr, col+dc);
      if (this.castling[p.color].k && !this.inCheck(p.color)) {
        if (!this.at(row, col+1) && !this.at(row, col+2) && !this.isAttacked(row, col+1, enemy) && !this.isAttacked(row, col+2, enemy))
          moves.push({ from: { row, col }, to: { row, col: col+2 }, piece: p, special: 'ck' });
      }
      if (this.castling[p.color].q && !this.inCheck(p.color)) {
        if (!this.at(row, col-1) && !this.at(row, col-2) && !this.at(row, col-3) && !this.isAttacked(row, col-1, enemy) && !this.isAttacked(row, col-2, enemy))
          moves.push({ from: { row, col }, to: { row, col: col-2 }, piece: p, special: 'cq' });
      }
    }
    return moves;
  }

  legalMoves(color) {
    const moves = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (this.board[r][c]?.color === color)
          for (const m of this.pseudoMoves(r, c))
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
    if (special === 'ep') this.board[from.row][to.col] = null;
    this.board[to.row][to.col] = this.board[from.row][from.col];
    this.board[from.row][from.col] = null;
    if (special === 'promo') this.board[to.row][to.col] = { type: move.promotion, color: move.piece.color };
    if (special === 'ck') { this.board[from.row][from.col+1] = this.board[from.row][from.col+3]; this.board[from.row][from.col+3] = null; }
    if (special === 'cq') { this.board[from.row][from.col-1] = this.board[from.row][from.col-4]; this.board[from.row][from.col-4] = null; }
  }

  save() {
    return {
      board: this.board.map(r => r.map(c => c ? {...c} : null)),
      castling: JSON.parse(JSON.stringify(this.castling)),
      enPassant: this.enPassant ? {...this.enPassant} : null,
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
    if (this.gameOver || move.piece.color !== this.turn) return false;
    const save = this.save();
    this.apply(move);
    this.halfMoves = (move.piece.type === 'p' || move.special === 'ep') ? 0 : this.halfMoves + 1;
    if (move.piece.type === 'k') { this.castling[move.piece.color].k = false; this.castling[move.piece.color].q = false; }
    if (move.piece.type === 'r') {
      if (move.from.col === 0) this.castling[move.piece.color].q = false;
      if (move.from.col === 7) this.castling[move.piece.color].k = false;
    }
    this.enPassant = move.special === 'double' ? { row: (move.from.row+move.to.row)/2, col: move.from.col } : null;
    this.turn = this.turn === 'w' ? 'b' : 'w';
    if (this.turn === 'w') this.fullMoves++;
    this.history.push({ move, save });
    const moves = this.legalMoves(this.turn);
    if (moves.length === 0) {
      this.gameOver = true;
      this.result = this.inCheck(this.turn) ? (this.turn === 'w' ? '0-1' : '1-0') : '1/2-1/2';
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
    this.turn = this.turn === 'w' ? 'b' : 'w';
    this.gameOver = false;
    this.result = null;
    return true;
  }

  clone() {
    const e = new ChessEngine();
    e.board = this.board.map(r => r.map(c => c ? {...c} : null));
    e.turn = this.turn;
    e.castling = JSON.parse(JSON.stringify(this.castling));
    e.enPassant = this.enPassant ? {...this.enPassant} : null;
    e.halfMoves = this.halfMoves;
    e.fullMoves = this.fullMoves;
    e.gameOver = this.gameOver;
    e.result = this.result;
    return e;
  }
}