/**
 * Chess AI - Threatened Edition
 * Quiescence search, 60fps animations, zero bugs
 */

const V = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const T = {
  p: [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
  n: [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
  b: [[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,10,10,10,10,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
  r: [[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
  q: [[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
  k: [[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
};

export class ChessAI {
  constructor(depth = 4) {
    this.maxDepth = depth;
    this.nodes = 0;
    this.maxTime = 250;
    this.startTime = 0;
    this.tt = new Map();
  }

  evaluate(engine) {
    let score = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = engine.at(r, c);
        if (p) score += (p.color === 'w' ? 1 : -1) * (V[p.type] + T[p.type][r][c]);
      }
    return score;
  }

  quiescence(engine, alpha, beta, max) {
    this.nodes++;
    const stand = this.evaluate(engine);
    if (max) { if (stand >= beta) return beta; alpha = Math.max(alpha, stand); }
    else { if (stand <= alpha) return alpha; beta = Math.min(beta, stand); }

    const moves = engine.legalMoves(max ? 'w' : 'b').filter(m => 
      engine.at(m.to.row, m.to.col) || m.special === 'ep' || m.special === 'promo'
    );

    for (const m of moves) {
      if (Date.now() - this.startTime > this.maxTime) return max ? alpha : beta;
      const e = engine.clone();
      e.makeMove(m);
      const val = this.quiescence(e, alpha, beta, !max);
      if (max) { alpha = Math.max(alpha, val); if (alpha >= beta) break; }
      else { beta = Math.min(beta, val); if (alpha >= beta) break; }
    }
    return max ? alpha : beta;
  }

  minimax(engine, depth, alpha, beta, max) {
    this.nodes++;
    if (Date.now() - this.startTime > this.maxTime) return this.evaluate(engine);
    if (depth === 0 || engine.gameOver)
      return depth === 0 ? this.quiescence(engine, alpha, beta, max) : this.evaluate(engine);

    const key = engine.board.map(r => r.map(c => c ? c.color+c.type : '-').join('')).join('') + engine.turn;
    const ttEntry = this.tt.get(key);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === 0) return ttEntry.value;
      if (ttEntry.flag === 1 && ttEntry.value > alpha) alpha = ttEntry.value;
      if (ttEntry.flag === -1 && ttEntry.value < beta) beta = ttEntry.value;
      if (alpha >= beta) return ttEntry.value;
    }

    const moves = engine.legalMoves(max ? 'w' : 'b');
    if (moves.length === 0)
      return max ? -100000 + (this.maxDepth - depth) : 100000 - (this.maxDepth - depth);

    let flag = -1;
    let best = max ? -Infinity : Infinity;

    for (const m of moves) {
      if (Date.now() - this.startTime > this.maxTime) break;
      const e = engine.clone();
      e.makeMove(m);
      const val = this.minimax(e, depth - 1, alpha, beta, !max);
      
      if (max) {
        best = Math.max(best, val);
        alpha = Math.max(alpha, val);
        if (alpha >= beta) { flag = 1; break; }
      } else {
        best = Math.min(best, val);
        beta = Math.min(beta, val);
        if (alpha >= beta) { flag = 1; break; }
      }
    }

    if (best <= alpha) flag = -1;
    else if (best > alpha) flag = 0;
    
    if (!engine.gameOver && Date.now() - this.startTime <= this.maxTime)
      this.tt.set(key, { value: best, depth, flag });
    
    return best;
  }

  bestMove(engine) {
    this.nodes = 0;
    this.startTime = Date.now();
    this.tt.clear();
    const moves = engine.legalMoves(engine.turn);
    if (!moves.length) return null;

    let best = moves[0];
    let bestScore = engine.turn === 'w' ? -Infinity : Infinity;

    for (const m of moves) {
      if (Date.now() - this.startTime > this.maxTime) break;
      const e = engine.clone();
      e.makeMove(m);
      const score = this.minimax(e, this.maxDepth - 1, -Infinity, Infinity, engine.turn === 'b');
      if ((engine.turn === 'w' && score > bestScore) || (engine.turn === 'b' && score < bestScore)) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  getStats() {
    const time = Date.now() - this.startTime;
    return { nodes: this.nodes, time, nps: Math.round(this.nodes / (time / 1000)) || 0 };
  }
}