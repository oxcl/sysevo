import { ChessEngine } from './chess.js';

const MAX_DEPTH = 4;
const TIME_LIMIT = 200;
const CHECKMATE = 100000;

export class ChessAI {
  constructor() {
    this.nodesEvaluated = 0;
  }

  getBestMove(engine) {
    if (!engine) return null;
    const moves = engine.allLegalMoves('b');
    if (!moves || moves.length === 0) return null;

    const start = Date.now();
    let best = moves[0];
    let bestScore = Infinity;
    this.nodesEvaluated = 0;

    for (const move of moves) {
      try {
        const snap = engine.applyMove(move);
        const score = this.alphaBeta(engine, MAX_DEPTH - 1, -Infinity, Infinity, true);
        engine.undoMove(snap);
        if (score < bestScore) { bestScore = score; best = move; }
      } catch (err) {
        continue;
      }
      if (Date.now() - start > TIME_LIMIT) break;
    }
    return best;
  }

  alphaBeta(engine, depth, alpha, beta, maximizing) {
    this.nodesEvaluated++;
    if (depth === 0 || !engine) return engine ? engine.evaluate() : 0;

    const color = maximizing ? 'b' : 'w';
    let moves;
    try {
      moves = engine.allLegalMoves(color);
    } catch (err) {
      return 0;
    }

    if (!moves || moves.length === 0) {
      try { return engine.inCheck(color) ? (maximizing ? CHECKMATE : -CHECKMATE) : 0; }
      catch { return 0; }
    }

    moves.sort((a, b) => {
      const av = (engine.board[a.to[0]] && engine.board[a.to[0]][a.to[1]]) ? 1 : 0;
      const bv = (engine.board[b.to[0]] && engine.board[b.to[0]][b.to[1]]) ? 1 : 0;
      return bv - av;
    });

    if (maximizing) {
      let max = -Infinity;
      for (const m of moves) {
        try {
          const s = engine.applyMove(m);
          const val = this.alphaBeta(engine, depth - 1, alpha, beta, false);
          engine.undoMove(s);
          max = Math.max(max, val);
          alpha = Math.max(alpha, val);
          if (beta <= alpha) break;
        } catch (err) { continue; }
      }
      return max;
    }

    let min = Infinity;
    for (const m of moves) {
      try {
        const s = engine.applyMove(m);
        const val = this.alphaBeta(engine, depth - 1, alpha, beta, true);
        engine.undoMove(s);
        min = Math.min(min, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      } catch (err) { continue; }
    }
    return min;
  }
}
