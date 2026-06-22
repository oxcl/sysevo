/**
 * Chess AI - Personality Edition
 * Iterative deepening, transposition tables, 100ms response
 */

const PIECE_VALUES = [100, 320, 330, 500, 900, 20000];

const PST = [
  [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
   [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
   [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
  [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],
   [-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
   [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
   [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
  [[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
   [-10,0,10,10,10,10,0,-10],[-10,5,5,10,10,5,5,-10],
   [-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],
   [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
  [[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],
   [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
   [-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
  [[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
   [-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],
   [0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],
   [-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
  [[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
   [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
   [-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],
   [20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
];

export class ChessAI {
  constructor(depth = 4) {
    this.maxDepth = depth;
    this.nodes = 0;
    this.tt = new Map();
    this.maxTime = 100;
    this.startTime = 0;
    this.bestMoveFound = null;
  }

  evaluate(engine) {
    let score = 0;
    for (let i = 0; i < 64; i++) {
      const p = engine.board[i];
      if (p) {
        const r = i >> 3, c = i & 7;
        const val = PIECE_VALUES[p.type] + PST[p.type][p.color === 0 ? r : 7-r][c];
        score += (p.color === 0 ? 1 : -1) * val;
      }
    }
    return score;
  }

  quiescence(engine, alpha, beta, max) {
    this.nodes++;
    const stand = this.evaluate(engine);
    
    if (max) {
      if (stand >= beta) return beta;
      alpha = Math.max(alpha, stand);
    } else {
      if (stand <= alpha) return alpha;
      beta = Math.min(beta, stand);
    }

    const moves = engine.legalMoves(engine.turn).filter(m => 
      engine.board[m.to] || m.special === 'ep' || m.special === 'promo'
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

  negamax(engine, depth, alpha, beta) {
    this.nodes++;
    
    if (Date.now() - this.startTime > this.maxTime) return this.evaluate(engine);
    
    if (depth === 0 || engine.gameOver)
      return depth === 0 ? this.quiescence(engine, alpha, beta, engine.turn === 0) : this.evaluate(engine);

    const key = engine.hash ^ (engine.turn * 0x5A5A5A5A);
    const ttEntry = this.tt.get(key);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === 0) return ttEntry.value;
      if (ttEntry.flag === 1 && ttEntry.value > alpha) alpha = ttEntry.value;
      if (ttEntry.flag === -1 && ttEntry.value < beta) beta = ttEntry.value;
      if (alpha >= beta) return ttEntry.value;
    }

    const moves = engine.legalMoves(engine.turn);
    
    if (moves.length === 0)
      return engine.inCheck(engine.turn) ? -100000 + (this.maxDepth - depth) : 0;

    let flag = -1;
    let best = -Infinity;

    for (const m of moves) {
      if (Date.now() - this.startTime > this.maxTime) break;
      const e = engine.clone();
      e.makeMove(m);
      const val = -this.negamax(e, depth - 1, -beta, -alpha);
      
      if (val > best) {
        best = val;
        if (val > alpha) alpha = val;
        if (depth === this.maxDepth) this.bestMoveFound = m;
      }
      
      if (alpha >= beta) { flag = 1; break; }
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
    this.bestMoveFound = null;
    
    const moves = engine.legalMoves(engine.turn);
    if (!moves.length) return null;

    this.bestMoveFound = moves[0];

    for (let depth = 1; depth <= this.maxDepth; depth++) {
      if (Date.now() - this.startTime > this.maxTime) break;
      this.negamax(engine, depth, -Infinity, Infinity);
    }

    return this.bestMoveFound;
  }

  getStats() {
    return {
      nodes: this.nodes,
      time: Date.now() - this.startTime,
      nps: Math.round(this.nodes / ((Date.now() - this.startTime) / 1000)) || 0
    };
  }
}