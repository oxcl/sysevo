import { ChessEngine } from './chess.js';

export class ChessAI {
  constructor(depth = 4) {
    this.maxDepth = depth;
    this.nodesEvaluated = 0;
  }

  getBestMove(engine) {
    const moves = engine.getAllLegalMoves('b');
    if (moves.length === 0) return null;
    let bestMove = null;
    let bestScore = Infinity;
    this.nodesEvaluated = 0;
    const startTime = Date.now();

    for (const move of moves) {
      const undo = engine.makeMove(move);
      const score = this.alphabeta(engine, this.maxDepth - 1, -Infinity, Infinity, true);
      engine.undoMove(undo);
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (Date.now() - startTime > 200) break;
    }
    return bestMove;
  }

  alphabeta(engine, depth, alpha, beta, maximizing) {
    this.nodesEvaluated++;
    if (depth === 0) return engine.evaluate();

    const color = maximizing ? 'b' : 'w';
    const moves = engine.getAllLegalMoves(color);
    if (moves.length === 0) {
      if (engine.isInCheck(color)) return maximizing ? 100000 : -100000;
      return 0;
    }

    moves.sort((a, b) => {
      const aCapture = engine.board[a.to[0]][a.to[1]] ? 1 : 0;
      const bCapture = engine.board[b.to[0]][b.to[1]] ? 1 : 0;
      return bCapture - aCapture;
    });

    if (maximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const undo = engine.makeMove(move);
        const evalScore = this.alphabeta(engine, depth - 1, alpha, beta, false);
        engine.undoMove(undo);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const undo = engine.makeMove(move);
        const evalScore = this.alphabeta(engine, depth - 1, alpha, beta, true);
        engine.undoMove(undo);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
