/**
 * Flamboyent Chess AI
 * Minimax with Alpha-Beta Pruning
 * Targeted response time: < 250ms
 */

import { Chess, COLORS, PIECES, PIECE_VALUES } from './chess.js';

// Piece-square tables (from white's perspective, flip for black)
// Values from https://www.chessprogramming.org/Simplified_Evaluation_Function

const PST = {
  [PIECES.PAWN]: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
  ],
  [PIECES.KNIGHT]: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  [PIECES.BISHOP]: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  [PIECES.ROOK]: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0]
  ],
  [PIECES.QUEEN]: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  [PIECES.KING]: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

// King safety table for endgame
const PST_KING_ENDGAME = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50]
];

class AIConfig {
  constructor() {
    this.maxDepth = 4;
    this.timeLimit = 220; // ms (slightly under 250 to be safe)
    this.nodesSearched = 0;
    this.startTime = 0;
    this.stopSearch = false;
  }
}

/**
 * Evaluate the board position from white's perspective.
 * Positive = good for white, negative = good for black.
 */
function evaluate(chess) {
  let score = 0;
  const isEndgame = isEndgamePosition(chess);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = chess.board[row][col];
      if (!piece) continue;

      const value = PIECE_VALUES[piece.type];
      let pstRow = piece.color === COLORS.WHITE ? row : 7 - row;
      let pstCol = piece.color === COLORS.WHITE ? col : 7 - col;

      let positionBonus = 0;
      if (piece.type === PIECES.KING && isEndgame) {
        positionBonus = PST_KING_ENDGAME[pstRow][pstCol];
      } else if (PST[piece.type]) {
        positionBonus = PST[piece.type][pstRow][pstCol];
      }

      const pieceScore = value + positionBonus;
      score += piece.color === COLORS.WHITE ? pieceScore : -pieceScore;
    }
  }

  // Mobility bonus (number of legal moves)
  // Only compute if we have time - approximate with pseudo-legal moves for speed
  // Actually, mobility is expensive. Let's skip it for performance.

  return score;
}

/**
 * Determine if the position is likely an endgame.
 */
function isEndgamePosition(chess) {
  let pieceCount = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = chess.board[row][col];
      if (piece && piece.type !== PIECES.PAWN && piece.type !== PIECES.KING) {
        pieceCount++;
      }
    }
  }
  return pieceCount <= 6; // Queens, rooks, bishops, knights ≤ 6 is endgame-ish
}

/**
 * Score a move for ordering (higher = search first).
 * MVV-LVA: Most Valuable Victim - Least Valuable Attacker
 */
function scoreMove(move, chess) {
  let score = 0;

  // Captures: prioritize by MVV-LVA
  if (move.captured) {
    // Value of captured piece * 100 - value of attacking piece + 10000
    score = 10000 + PIECE_VALUES[move.captured.type] * 10 - PIECE_VALUES[move.piece.type];
  }

  // En passant capture
  if (move.enPassant) {
    score = 10000 + PIECE_VALUES[PIECES.PAWN] * 10 - PIECE_VALUES[PIECES.PAWN];
  }

  // Promotions
  if (move.promotion) {
    score += 8000 + PIECE_VALUES[move.promotion];
  }

  // Castling
  if (move.castling) {
    score += 5000;
  }

  // Center control bonus for non-captures
  if (!move.captured && !move.enPassant) {
    const centerDist = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
    score += (7 - centerDist) * 10;
  }

  return score;
}

/**
 * Order moves for better alpha-beta pruning.
 */
function orderMoves(moves, chess) {
  const scored = moves.map(move => ({
    move,
    score: scoreMove(move, chess)
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.move);
}

/**
 * Minimax with Alpha-Beta Pruning.
 */
function alphaBeta(chess, depth, alpha, beta, maximizing, config) {
  config.nodesSearched++;

  // Time check (every 1000 nodes)
  if (config.nodesSearched % 1000 === 0) {
    const elapsed = performance.now() - config.startTime;
    if (elapsed >= config.timeLimit) {
      config.stopSearch = true;
      return 0; // Return neutral score when stopping
    }
  }

  // Check for game over
  if (chess.gameOver) {
    if (chess.gameResult === '1-0') return 100000 - (config.maxDepth - depth);
    if (chess.gameResult === '0-1') return -100000 + (config.maxDepth - depth);
    return 0; // Draw
  }

  // Leaf node - evaluate
  if (depth === 0) {
    return evaluate(chess);
  }

  // Generate all legal moves
  const moves = chess.getAllLegalMoves();
  if (moves.length === 0) {
    // This shouldn't happen if gameOver is set correctly, but just in case
    if (chess.isInCheck(chess.turn)) {
      return maximizing ? -100000 + (config.maxDepth - depth) : 100000 - (config.maxDepth - depth);
    }
    return 0;
  }

  // Order moves for better pruning
  const orderedMoves = orderMoves(moves, chess);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of orderedMoves) {
      chess.makeMoveDirect(move);
      const eval_ = alphaBeta(chess, depth - 1, alpha, beta, false, config);
      chess.undoMove();

      if (config.stopSearch) return 0;

      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of orderedMoves) {
      chess.makeMoveDirect(move);
      const eval_ = alphaBeta(chess, depth - 1, alpha, beta, true, config);
      chess.undoMove();

      if (config.stopSearch) return 0;

      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

/**
 * Get the best move for the current position.
 * Uses iterative deepening with a time limit.
 */
export function getBestMove(chess, timeLimit = 220) {
  const config = new AIConfig();
  config.timeLimit = timeLimit;

  const moves = chess.getAllLegalMoves();
  if (moves.length === 0) return null;

  // If only one move, return it immediately
  if (moves.length === 1) return moves[0];

  // Order moves for the initial search
  let orderedMoves = orderMoves(moves, chess);

  let bestMove = orderedMoves[0];
  let bestScore = -Infinity;

  const isMaximizing = chess.turn === COLORS.WHITE;

  config.startTime = performance.now();
  config.stopSearch = false;
  config.nodesSearched = 0;

  // Iterative deepening
  for (let depth = 1; depth <= config.maxDepth; depth++) {
    config.nodesSearched = 0;
    let currentBestMove = orderedMoves[0];
    let currentBestScore = isMaximizing ? -Infinity : Infinity;

    let alpha = -Infinity;
    let beta = Infinity;

    let foundMoving = false;

    for (const move of orderedMoves) {
      chess.makeMoveDirect(move);

      let score;
      if (isMaximizing) {
        score = alphaBeta(chess, depth - 1, alpha, beta, false, config);
      } else {
        score = alphaBeta(chess, depth - 1, alpha, beta, true, config);
      }

      chess.undoMove();

      if (config.stopSearch) {
        // Time ran out; use results from previous depth
        return bestMove;
      }

      if (isMaximizing) {
        if (score > currentBestScore) {
          currentBestScore = score;
          currentBestMove = move;
          foundMoving = true;
        }
        alpha = Math.max(alpha, score);
      } else {
        if (score < currentBestScore) {
          currentBestScore = score;
          currentBestMove = move;
          foundMoving = true;
        }
        beta = Math.min(beta, score);
      }
    }

    // Update best move if we found a better one at this depth
    if (foundMoving) {
      bestMove = currentBestMove;
      bestScore = currentBestScore;
    }

    // Reorder moves based on search results for next iteration
    orderedMoves = reorderMoves(orderedMoves, currentBestMove);
  }

  return bestMove;
}

/**
 * Reorder moves to put the best move first for iterative deepening.
 */
function reorderMoves(moves, bestMove) {
  const bestIndex = moves.findIndex(m =>
    m.from.row === bestMove.from.row &&
    m.from.col === bestMove.from.col &&
    m.to.row === bestMove.to.row &&
    m.to.col === bestMove.to.col
  );

  if (bestIndex > 0) {
    const newMoves = [...moves];
    [newMoves[0], newMoves[bestIndex]] = [newMoves[bestIndex], newMoves[0]];
    return newMoves;
  }
  return moves;
}

/**
 * Simple evaluation for the AI difficulty levels (optional).
 * For now, we just use the full strength.
 */
export function getMoveWithDepth(chess, depth = 3) {
  const config = new AIConfig();
  config.maxDepth = depth;
  config.timeLimit = 500; // More time for deeper search

  const moves = chess.getAllLegalMoves();
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  let orderedMoves = orderMoves(moves, chess);
  let bestMove = orderedMoves[0];
  const isMaximizing = chess.turn === COLORS.WHITE;

  config.startTime = performance.now();
  config.stopSearch = false;
  config.nodesSearched = 0;

  let alpha = -Infinity;
  let beta = Infinity;
  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (const move of orderedMoves) {
    chess.makeMoveDirect(move);
    let score;
    if (isMaximizing) {
      score = alphaBeta(chess, depth - 1, alpha, beta, false, config);
    } else {
      score = alphaBeta(chess, depth - 1, alpha, beta, true, config);
    }
    chess.undoMove();

    if (config.stopSearch) return bestMove;

    if (isMaximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
    }
  }

  return bestMove;
}
