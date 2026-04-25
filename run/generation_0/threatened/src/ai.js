/**
 * Chess AI using Minimax with Alpha-Beta pruning.
 * Plays as Black by default.
 */

import { ChessGame, WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, PIECE_VALUES, PIECE_SYMBOLS } from './chess.js';

// Move ordering scores for better pruning
const CAPTURE_BONUS = 1000;
const PROMOTION_BONUS = 800;
const CASTLING_BONUS = 500;
const CHECK_BONUS = 300;

// Order moves to improve alpha-beta pruning efficiency
function orderMoves(game, moves) {
  return moves.map(move => {
    let score = 0;
    const piece = game.board[move.from.row][move.from.col];
    const target = game.board[move.to.row][move.to.col];

    // Captures: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if (target) {
      score += CAPTURE_BONUS + PIECE_VALUES[target.type] - PIECE_VALUES[piece.type];
    }

    // En passant capture
    if (move.enPassant) {
      score += CAPTURE_BONUS + PIECE_VALUES[PAWN];
    }

    // Promotions
    if (move.promotion) {
      score += PROMOTION_BONUS + PIECE_VALUES[move.promotion] - PIECE_VALUES[PAWN];
    }

    // Castling
    if (move.castling) {
      score += CASTLING_BONUS;
    }

    // History heuristic bonus (simplified)
    return { move, score };
  }).sort((a, b) => b.score - a.score)
    .map(item => item.move);
}

/**
 * AI class with configurable depth.
 */
export class ChessAI {
  constructor(difficulty = 'medium') {
    this.nodesSearched = 0;
    this.timeLimit = 200; // ms - must stay under 250ms
    this.setDifficulty(difficulty);
  }

  setDifficulty(difficulty) {
    switch (difficulty) {
      case 'easy':
        this.maxDepth = 2;
        break;
      case 'medium':
        this.maxDepth = 3;
        break;
      case 'hard':
        this.maxDepth = 4;
        break;
      default:
        this.maxDepth = 3;
    }
  }

  /**
   * Get the best move for the current game state.
   * AI always plays as Black.
   */
  getBestMove(game) {
    this.nodesSearched = 0;
    const startTime = performance.now();

    // Ensure game.turn is BLACK for the AI to move
    if (game.turn !== BLACK) {
      console.warn('AI: It is not Black\'s turn');
      return null;
    }

    const legalMoves = game.getLegalMoves();
    if (legalMoves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;
    const alpha = -Infinity;
    const beta = Infinity;

    // Iterative deepening to maximize use of time budget
    let depth = 1;
    const maxDepth = this.maxDepth;

    for (let d = 1; d <= maxDepth; d++) {
      const startSearch = performance.now();
      let currentBestMove = null;
      let currentBestScore = -Infinity;
      let currentAlpha = -Infinity;

      const orderedMoves = orderMoves(game, legalMoves);

      for (const move of orderedMoves) {
        if (performance.now() - startTime > this.timeLimit - 20) {
          // Time's almost up, use previous best
          if (bestMove) break;
        }

        const gameCopy = game.clone();
        gameCopy._applyMove(move, true);
        const score = -this._alphaBeta(gameCopy, d - 1, -beta, -currentAlpha, BLACK, startTime);

        if (score > currentBestScore) {
          currentBestScore = score;
          currentBestMove = move;
        }

        currentAlpha = Math.max(currentAlpha, score);
        if (performance.now() - startTime > this.timeLimit - 10) {
          break;
        }
      }

      // Update best move if we completed this depth
      if (currentBestMove) {
        bestMove = currentBestMove;
        bestScore = currentBestScore;
      }

      depth = d;

      if (performance.now() - startTime > this.timeLimit - 20) {
        break;
      }
    }

    const elapsed = performance.now() - startTime;
    console.log(`AI: depth=${depth}, nodes=${this.nodesSearched}, time=${elapsed.toFixed(0)}ms`);

    return bestMove;
  }

  /**
   * Alpha-Beta search.
   */
  _alphaBeta(game, depth, alpha, beta, maximizingColor, startTime) {
    this.nodesSearched++;

    // Check time limit
    if (this.nodesSearched % 1000 === 0) {
      if (performance.now() - startTime > this.timeLimit - 10) {
        // Return evaluation if we're out of time
        return game.evaluate() * (maximizingColor === WHITE ? 1 : -1);
      }
    }

    // Terminal node
    if (depth === 0) {
      return this._quiescenceSearch(game, alpha, beta, maximizingColor, startTime);
    }

    const legalMoves = game.getLegalMoves();
    if (legalMoves.length === 0) {
      // Checkmate or stalemate
      if (game.isInCheck(game.turn)) {
        // Checkmate - worst for current player
        return -100000 + (this.maxDepth - depth) * 100; // Prefer faster checkmates
      }
      // Stalemate
      return 0;
    }

    // Check for threefold repetition or insufficient material (draw)
    if (game._isInsufficientMaterial()) return 0;

    // Check for 50-move rule
    if (game.halfMoveClock >= 100) return 0;

    const orderedMoves = orderMoves(game, legalMoves);
    let bestScore = -Infinity;

    for (const move of orderedMoves) {
      const gameCopy = game.clone();
      gameCopy._applyMove(move, true);

      const score = -this._alphaBeta(
        gameCopy,
        depth - 1,
        -beta,
        -alpha,
        maximizingColor === WHITE ? BLACK : WHITE,
        startTime
      );

      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);

      if (alpha >= beta) {
        break; // Beta cutoff
      }

      if (performance.now() - startTime > this.timeLimit - 10) {
        break;
      }
    }

    return bestScore;
  }

  /**
   * Quiescence search to handle capture sequences at leaf nodes.
   * Reduces the horizon effect.
   */
  _quiescenceSearch(game, alpha, beta, maximizingColor, startTime) {
    this.nodesSearched++;

    if (performance.now() - startTime > this.timeLimit - 5) {
      return game.evaluate() * (maximizingColor === WHITE ? 1 : -1);
    }

    const standPat = game.evaluate() * (maximizingColor === WHITE ? 1 : -1);

    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;

    // Generate only capture moves
    const allMoves = game._generatePseudoMoves(game.turn);
    const captureMoves = allMoves.filter(m => {
      if (m.enPassant) return true;
      const target = game.board[m.to.row][m.to.col];
      return target !== null;
    });

    if (captureMoves.length === 0) return standPat;

    // Order captures by MVV-LVA
    const orderedCaptures = captureMoves.map(m => {
      let score = 0;
      const piece = game.board[m.from.row][m.from.col];
      let target = game.board[m.to.row][m.to.col];
      if (m.enPassant) {
        target = { type: PAWN };
      }
      if (target) {
        score = PIECE_VALUES[target.type] - PIECE_VALUES[piece.type];
      }
      return { move: m, score };
    }).sort((a, b) => b.score - a.score).map(item => item.move);

    for (const move of orderedCaptures) {
      const gameCopy = game.clone();

      // Check if the move is legal
      gameCopy._applyMove(move, true);
      if (gameCopy.isInCheck(gameCopy.turn === WHITE ? BLACK : WHITE)) {
        continue; // This move leaves our king in check, skip
      }

      const score = -this._quiescenceSearch(
        gameCopy,
        -beta,
        -alpha,
        maximizingColor === WHITE ? BLACK : WHITE,
        startTime
      );

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;

      if (performance.now() - startTime > this.timeLimit - 5) {
        break;
      }
    }

    return alpha;
  }
}
