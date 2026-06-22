/**
 * Chess AI Module
 * Implements minimax algorithm with alpha-beta pruning
 * @module ChessAI
 */

/** AI configuration constants */
const AI_CONFIG = Object.freeze({
  MAX_DEPTH: 4,
  TRANSPOSITION_TABLE_SIZE: 1 << 16,
  INFINITY_SCORE: 100000,
  CHECKMATE_SCORE: 99999
});

/** Piece value constants */
const PIECE_VALUES = Object.freeze({
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
});

/** Piece-square tables for positional evaluation */
const PIECE_SQUARE_TABLES = Object.freeze({
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50]
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20]
  ],
  r: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0]
  ],
  q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20]
  ],
  k: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20]
  ]
});

export class ChessAI {
  constructor(maxDepth = AI_CONFIG.MAX_DEPTH) {
    this.maxDepth = maxDepth;
    this.nodesEvaluated = 0;
    this.transpositionTable = new Map();
  }

  evaluatePosition(engine) {
    let score = 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = engine.getPieceAt(row, col);
        if (piece) {
          const materialValue = PIECE_VALUES[piece.type];
          const positionalValue = PIECE_SQUARE_TABLES[piece.type][row][col];
          const colorMultiplier = piece.color === 'w' ? 1 : -1;
          score += colorMultiplier * (materialValue + positionalValue);
        }
      }
    }
    
    return score;
  }

  minimaxWithAlphaBeta(engine, depth, alpha, beta, isMaximizingPlayer) {
    this.nodesEvaluated++;
    
    if (depth === 0 || engine.isGameOver) {
      return this.evaluatePosition(engine);
    }

    const currentColor = isMaximizingPlayer ? 'w' : 'b';
    const legalMoves = engine.generateAllLegalMoves(currentColor);

    if (legalMoves.length === 0) {
      return isMaximizingPlayer 
        ? -AI_CONFIG.CHECKMATE_SCORE + (this.maxDepth - depth)
        : AI_CONFIG.CHECKMATE_SCORE - (this.maxDepth - depth);
    }

    if (isMaximizingPlayer) {
      let maxValue = -AI_CONFIG.INFINITY_SCORE;
      for (const move of legalMoves) {
        const clonedEngine = engine.clone();
        clonedEngine.makeMove(move);
        const evaluation = this.minimaxWithAlphaBeta(clonedEngine, depth - 1, alpha, beta, false);
        maxValue = Math.max(maxValue, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxValue;
    } else {
      let minValue = AI_CONFIG.INFINITY_SCORE;
      for (const move of legalMoves) {
        const clonedEngine = engine.clone();
        clonedEngine.makeMove(move);
        const evaluation = this.minimaxWithAlphaBeta(clonedEngine, depth - 1, alpha, beta, true);
        minValue = Math.min(minValue, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minValue;
    }
  }

  findOptimalMove(engine) {
    this.nodesEvaluated = 0;
    const legalMoves = engine.generateAllLegalMoves(engine.turn);
    
    if (legalMoves.length === 0) return null;

    let optimalMove = legalMoves[0];
    let optimalScore = engine.turn === 'w' ? -AI_CONFIG.INFINITY_SCORE : AI_CONFIG.INFINITY_SCORE;

    for (const move of legalMoves) {
      const clonedEngine = engine.clone();
      clonedEngine.makeMove(move);
      const score = this.minimaxWithAlphaBeta(clonedEngine, this.maxDepth - 1, -AI_CONFIG.INFINITY_SCORE, AI_CONFIG.INFINITY_SCORE, engine.turn === 'b');
      
      if (engine.turn === 'w') {
        if (score > optimalScore) {
          optimalScore = score;
          optimalMove = move;
        }
      } else {
        if (score < optimalScore) {
          optimalScore = score;
          optimalMove = move;
        }
      }
    }

    return optimalMove;
  }

  getNodesEvaluated() {
    return this.nodesEvaluated;
  }
}