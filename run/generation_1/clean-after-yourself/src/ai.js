import { ChessEngine } from './chess.js';

const MAX_DEPTH = 4;
const TIME_LIMIT_MS = 200;
const CHECKMATE_SCORE = 100000;
const STALEMATE_SCORE = 0;

export class ChessAI {
  constructor() {
    this.nodesEvaluated = 0;
  }

  getBestMove(engine) {
    const moves = engine.allLegalMoves(BLACK);
    if (moves.length === 0) return null;

    this.nodesEvaluated = 0;
    const startTime = Date.now();
    let bestMove = moves[0];
    let bestScore = Infinity;

    for (const move of moves) {
      const snap = engine.applyMove(move);
      const score = this.alphaBeta(engine, MAX_DEPTH - 1, -Infinity, Infinity, true);
      engine.revertMove(snap);

      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (Date.now() - startTime > TIME_LIMIT_MS) break;
    }
    return bestMove;
  }

  alphaBeta(engine, depth, alpha, beta, maximizing) {
    this.nodesEvaluated++;

    if (depth === 0) return engine.evaluate();

    const color = maximizing ? BLACK : WHITE;
    const moves = engine.allLegalMoves(color);

    if (moves.length === 0) {
      return engine.inCheck(color) ? (maximizing ? CHECKMATE_SCORE : -CHECKMATE_SCORE) : STALEMATE_SCORE;
    }

    this.sortMoves(moves, engine);

    if (maximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const snap = engine.applyMove(move);
        const evalScore = this.alphaBeta(engine, depth - 1, alpha, beta, false);
        engine.revertMove(snap);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    }

    let minEval = Infinity;
    for (const move of moves) {
      const snap = engine.applyMove(move);
      const evalScore = this.alphaBeta(engine, depth - 1, alpha, beta, true);
      engine.revertMove(snap);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }

  sortMoves(moves, engine) {
    moves.sort((a, b) => {
      const aCapture = engine.board[a.to[0]][a.to[1]] ? PIECE_VALUES[engine.typeOf(engine.board[a.to[0]][a.to[1]])] || 0 : 0;
      const bCapture = engine.board[b.to[0]][b.to[1]] ? PIECE_VALUES[engine.typeOf(engine.board[b.to[0]][b.to[1]])] || 0 : 0;
      return bCapture - aCapture;
    });
  }
}

const BLACK = 'b';
const WHITE = 'w';
const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
