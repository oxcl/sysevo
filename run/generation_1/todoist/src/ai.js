/**
 * TODOIST CHESS AI
 * ================
 * Section: Algorithm Configuration
 * Section: Move Search
 * Section: Alpha-Beta Pruning
 * Section: Move Ordering
 */

// --- Section: Algorithm Configuration ---
const MAX_DEPTH = 4;
const TIME_LIMIT_MS = 200;
const CHECKMATE_SCORE = 100000;
const BLACK = 'b';

// --- Section: AI Class ---
export class ChessAI {
  constructor() {
    this.nodesEvaluated = 0;
  }

  // --- Section: Main Search Entry Point ---
  getBestMove(engine) {
    if (!engine) return null;
    const moves = engine.allLegalMoves(BLACK);
    if (!moves || !moves.length) return null;

    const startTime = Date.now();
    let bestMove = moves[0];
    let bestScore = Infinity;
    this.nodesEvaluated = 0;

    // Order moves for better pruning
    this.orderMoves(moves, engine);

    for (const move of moves) {
      const snapshot = engine.executeMove(move);
      const score = this.alphaBetaSearch(engine, MAX_DEPTH - 1, -Infinity, Infinity, true);
      engine.revertMove(snapshot);

      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }

      // Respect time limit
      if (Date.now() - startTime > TIME_LIMIT_MS) break;
    }

    return bestMove;
  }

  // --- Section: Alpha-Beta Pruning ---
  alphaBetaSearch(engine, depth, alpha, beta, isMaximizing) {
    this.nodesEvaluated++;

    // Base case: evaluate position
    if (depth === 0) return engine.evaluate();

    const color = isMaximizing ? BLACK : 'w';
    let moves;
    try {
      moves = engine.allLegalMoves(color);
    } catch (e) {
      return 0;
    }

    // Terminal node: checkmate or stalemate
    if (!moves || !moves.length) {
      try {
        return engine.inCheck(color) ? (isMaximizing ? CHECKMATE_SCORE : -CHECKMATE_SCORE) : 0;
      } catch (e) {
        return 0;
      }
    }

    // Order moves for better pruning
    this.orderMoves(moves, engine);

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        const snapshot = engine.executeMove(move);
        const score = this.alphaBetaSearch(engine, depth - 1, alpha, beta, false);
        engine.revertMove(snapshot);
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // Alpha-beta cutoff
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
      if (beta <= alpha) break; // Alpha-beta cutoff
    }
    return minScore;
  }

  // --- Section: Move Ordering ---
  orderMoves(moves, engine) {
    moves.sort((a, b) => {
      let aScore = 0, bScore = 0;

      // Prioritize captures
      const aTarget = engine.board[a.to[0]][a.to[1]];
      const bTarget = engine.board[b.to[0]][b.to[1]];
      if (aTarget) aScore += ({ P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 })[aTarget[1]] || 0;
      if (bTarget) bScore += ({ P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 })[bTarget[1]] || 0;

      // Prioritize promotions
      if (a.promotion) aScore += 8;
      if (b.promotion) bScore += 8;

      return bScore - aScore;
    });
  }
}
