/**
 * AI Module
 * =========
 * Minimax with Alpha-Beta Pruning for chess AI.
 * 
 * @module ChessAI
 */

const MAX_SEARCH_DEPTH = 4;
const TIME_LIMIT_MS = 200;
const CHECKMATE_SCORE = 100000;
const BLACK = 'b';

export class ChessAI {
  constructor() {
    this.nodesEvaluated = 0;
  }

  /**
   * Find the best move for the AI player.
   * @param {ChessEngine} engine - Current game state
   * @returns {object|null} Best move or null if no moves available
   */
  findBestMove(engine) {
    const legalMoves = engine.getAllLegalMoves(BLACK);
    if (!legalMoves.length) return null;

    const startTime = Date.now();
    let bestMove = legalMoves[0];
    let bestScore = Infinity;
    this.nodesEvaluated = 0;

    for (const move of legalMoves) {
      const snapshot = engine.executeMove(move);
      const score = this.alphaBetaSearch(engine, MAX_SEARCH_DEPTH - 1, -Infinity, Infinity, true);
      engine.revertMove(snapshot);

      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (Date.now() - startTime > TIME_LIMIT_MS) break;
    }

    return bestMove;
  }

  /**
   * Alpha-Beta search algorithm.
   */
  alphaBetaSearch(engine, depth, alpha, beta, isMaximizing) {
    this.nodesEvaluated++;
    if (depth === 0) return engine.evaluate();

    const color = isMaximizing ? BLACK : 'w';
    const moves = engine.getAllLegalMoves(color);

    if (!moves.length) {
      return engine.isKingInCheck(color) ? (isMaximizing ? CHECKMATE_SCORE : -CHECKMATE_SCORE) : 0;
    }

    this.orderMoves(moves, engine);

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        const snapshot = engine.executeMove(move);
        const score = this.alphaBetaSearch(engine, depth - 1, alpha, beta, false);
        engine.revertMove(snapshot);
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return maxScore;
    }

    let minScore = Infinity;
    for (const move of moves) {
      const snapshot = engine.executeMove(move);
      const score = this.alphaBetaSearch(engine, depth - 1, alpha, beta, true);
      engine.revertMove(snapshot);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }

  /**
   * Order moves for better alpha-beta pruning.
   */
  orderMoves(moves, engine) {
    moves.sort((a, b) => {
      const aScore = engine.board[a.to[0]][a.to[1]] ? 1 : 0;
      const bScore = engine.board[b.to[0]][b.to[1]] ? 1 : 0;
      return bScore - aScore;
    });
  }
}
