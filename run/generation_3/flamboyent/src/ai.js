/**
 * Chess AI - Flamboyant Edition
 * Minimax with alpha-beta pruning and beautiful search
 */

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
  p: [
    [0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
    [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],
    [-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
    [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
    [-10,0,10,10,10,10,0,-10],[-10,5,5,10,10,5,5,-10],
    [-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],
    [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]
  ],
  q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
    [-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],
    [0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],
    [-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],
    [20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]
  ]
};

export class ChessAI {
  constructor(depth = 4) {
    this.maxDepth = depth;
    this.nodes = 0;
    this.tt = new Map();
  }

  evaluate(engine) {
    let score = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = engine.at(r, c);
        if (p) {
          const val = PIECE_VALUES[p.type] + PST[p.type][r][c];
          score += (p.color === 'w' ? 1 : -1) * val;
        }
      }
    return score;
  }

  quiescence(engine, alpha, beta, maximizing) {
    this.nodes++;
    const stand = this.evaluate(engine);
    
    if (maximizing) {
      if (stand >= beta) return beta;
      alpha = Math.max(alpha, stand);
    } else {
      if (stand <= alpha) return alpha;
      beta = Math.min(beta, stand);
    }

    const moves = engine.legalMoves(maximizing ? 'w' : 'b').filter(m => 
      engine.at(m.to.row, m.to.col) !== null || m.special === 'enpassant' || m.special === 'promotion'
    );

    if (maximizing) {
      for (const m of moves) {
        const e = engine.clone();
        e.makeMove(m);
        const val = this.quiescence(e, alpha, beta, false);
        alpha = Math.max(alpha, val);
        if (alpha >= beta) break;
      }
      return alpha;
    } else {
      for (const m of moves) {
        const e = engine.clone();
        e.makeMove(m);
        const val = this.quiescence(e, alpha, beta, true);
        beta = Math.min(beta, val);
        if (alpha >= beta) break;
      }
      return beta;
    }
  }

  minimax(engine, depth, alpha, beta, max) {
    this.nodes++;
    
    if (depth === 0 || engine.gameOver)
      return depth === 0 ? this.quiescence(engine, alpha, beta, max) : this.evaluate(engine);

    const color = max ? 'w' : 'b';
    const moves = engine.legalMoves(color);
    
    if (moves.length === 0)
      return max ? -100000 + (this.maxDepth - depth) : 100000 - (this.maxDepth - depth);

    if (max) {
      let val = -Infinity;
      for (const m of moves) {
        const e = engine.clone();
        e.makeMove(m);
        val = Math.max(val, this.minimax(e, depth - 1, alpha, beta, false));
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return val;
    } else {
      let val = Infinity;
      for (const m of moves) {
        const e = engine.clone();
        e.makeMove(m);
        val = Math.min(val, this.minimax(e, depth - 1, alpha, beta, true));
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return val;
    }
  }

  bestMove(engine) {
    this.nodes = 0;
    const moves = engine.legalMoves(engine.turn);
    if (!moves.length) return null;

    let best = moves[0];
    let bestScore = engine.turn === 'w' ? -Infinity : Infinity;

    for (const m of moves) {
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
}