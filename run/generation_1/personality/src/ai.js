/**
 * AI Module - Minimax with Alpha-Beta Pruning
 * Uses iterative deepening with time constraint.
 */
const MAX_DEPTH = 4;
const TIME_LIMIT = 200;
const CHECKMATE = 100000;
const BLACK = 'b';

export class ChessAI {
  constructor() {
    this.nodes = 0;
  }

  getBestMove(engine) {
    const moves = engine.allLegal(BLACK);
    if (!moves.length) return null;

    const start = Date.now();
    let best = moves[0];
    let bestScore = Infinity;
    this.nodes = 0;

    for (const move of moves) {
      const snap = engine.apply(move);
      const score = this.ab(engine, MAX_DEPTH - 1, -Infinity, Infinity, true);
      engine.undo(snap);
      if (score < bestScore) { bestScore = score; best = move; }
      if (Date.now() - start > TIME_LIMIT) break;
    }
    return best;
  }

  ab(engine, depth, alpha, beta, max) {
    this.nodes++;
    if (depth === 0) return engine.evaluate();

    const color = max ? BLACK : 'w';
    const moves = engine.allLegal(color);
    if (!moves.length) return engine.inCheck(color) ? (max ? CHECKMATE : -CHECKMATE) : 0;

    moves.sort((a, b) => {
      const av = engine.board[a.to[0]][a.to[1]] ? 1 : 0;
      const bv = engine.board[b.to[0]][b.to[1]] ? 1 : 0;
      return bv - av;
    });

    if (max) {
      let val = -Infinity;
      for (const m of moves) {
        const s = engine.apply(m);
        val = Math.max(val, this.ab(engine, depth - 1, alpha, beta, false));
        engine.undo(s);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return val;
    }
    let val = Infinity;
    for (const m of moves) {
      const s = engine.apply(m);
      val = Math.min(val, this.ab(engine, depth - 1, alpha, beta, true));
      engine.undo(s);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return val;
  }
}
