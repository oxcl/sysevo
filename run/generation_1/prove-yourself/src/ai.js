import { ChessEngine } from './chess.js';

const MAX_DEPTH = 5;
const TIME_LIMIT = 240;
const CHECKMATE = 100000;
const BLACK = 'b';

export class ChessAI {
  constructor() {
    this.nodes = 0;
    this.killTable = {};
  }

  getBestMove(engine) {
    const moves = engine.allLegalMoves(BLACK);
    if (!moves.length) return null;

    this.orderMoves(moves, engine);
    const start = Date.now();
    let best = moves[0];
    let bestScore = Infinity;
    this.nodes = 0;

    for (const move of moves) {
      const snap = engine.applyMove(move);
      const score = this.ab(engine, MAX_DEPTH - 1, -Infinity, Infinity, true, start);
      engine.undoMove(snap);
      if (score < bestScore) { bestScore = score; best = move; }
      if (Date.now() - start > TIME_LIMIT) break;
    }
    return best;
  }

  ab(engine, depth, alpha, beta, max, start) {
    this.nodes++;
    if (depth === 0) return engine.evaluate();

    const color = max ? BLACK : 'w';
    let moves = engine.allLegalMoves(color);
    if (!moves.length) return engine.inCheck(color) ? (max ? CHECKMATE : -CHECKMATE) : 0;

    this.orderMoves(moves, engine);

    if (max) {
      let val = -Infinity;
      for (const m of moves) {
        if (Date.now() - start > TIME_LIMIT) break;
        const s = engine.applyMove(m);
        val = Math.max(val, this.ab(engine, depth - 1, alpha, beta, false, start));
        engine.undoMove(s);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return val;
    }

    let val = Infinity;
    for (const m of moves) {
      if (Date.now() - start > TIME_LIMIT) break;
      const s = engine.applyMove(m);
      val = Math.min(val, this.ab(engine, depth - 1, alpha, beta, true, start));
      engine.undoMove(s);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return val;
  }

  orderMoves(moves, engine) {
    moves.sort((a, b) => {
      let sa = 0, sb = 0;
      const ac = engine.board[a.to[0]][a.to[1]];
      const bc = engine.board[b.to[0]][b.to[1]];
      if (ac) sa += ({ P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 })[ac[1]] || 0;
      if (bc) sb += ({ P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 })[bc[1]] || 0;
      if (a.promotion) sa += 8;
      if (b.promotion) sb += 8;
      return sb - sa;
    });
  }
}
