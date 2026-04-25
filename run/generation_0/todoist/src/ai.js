import {
  PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  WHITE, BLACK, BOARD_SIZE,
  PAWN_VALUE, KNIGHT_VALUE, BISHOP_VALUE, ROOK_VALUE, QUEEN_VALUE, KING_VALUE,
  PAWN_TABLE, KNIGHT_TABLE, BISHOP_TABLE, ROOK_TABLE, QUEEN_TABLE,
  KING_TABLE_MIDDLE, KING_TABLE_END
} from './constants.js';

/**
 * AI opponent using Minimax with Alpha-Beta pruning.
 * Uses iterative deepening and plays as Black by default.
 */
export class AI {
  constructor(depth = 3) {
    this.maxDepth = depth;
    this.nodesSearched = 0;
    this.timeLimit = 200; // ms
  }

  /**
   * Get the best move for the current position within time limit.
   */
  getBestMove(board) {
    this.nodesSearched = 0;
    const startTime = performance.now();
    const color = board.turn;
    const moves = board.getAllLegalMoves(color);

    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    // Score moves for ordering (captures first, then by MVV-LVA)
    const scoredMoves = moves.map(m => ({
      move: m,
      score: this.scoreMove(board, m)
    }));
    scoredMoves.sort((a, b) => b.score - a.score);

    let bestMove = scoredMoves[0].move;
    let bestScore = -Infinity;
    const alphaStart = -Infinity;
    const betaStart = Infinity;

    // Iterative deepening
    let currentDepth = 1;
    const maxDepthLimit = 6;

    while (currentDepth <= maxDepthLimit) {
      let currentBestMove = bestMove;
      let currentBestScore = -Infinity;
      let alpha = alphaStart;
      let beta = betaStart;

      let completed = true;

      for (const { move } of scoredMoves) {
        // Check time limit
        if (performance.now() - startTime > this.timeLimit) {
          completed = false;
          break;
        }

        // Apply move directly on the board (no clone)
        const undoInfo = board.applyMove(move, true);
        const evalScore = -this.alphaBeta(board, currentDepth - 1, -beta, -alpha, color === WHITE ? BLACK : WHITE, startTime);
        board.undoMove(move, undoInfo);

        if (evalScore > currentBestScore) {
          currentBestScore = evalScore;
          currentBestMove = move;
        }

        if (evalScore > alpha) {
          alpha = evalScore;
        }
      }

      if (completed) {
        bestMove = currentBestMove;
        bestScore = currentBestScore;
      }

      currentDepth++;

      // If we have a winning move and time is limited, stop
      if (bestScore > 5000 && performance.now() - startTime > 100) break;
    }

    // console.log(`AI: depth=${currentDepth-1}, nodes=${this.nodesSearched}, time=${Math.round(performance.now() - startTime)}ms`);
    return bestMove;
  }

  /**
   * Alpha-Beta search with iterative deepening helper.
   * Uses make/unmake on the board directly (no cloning).
   */
  alphaBeta(board, depth, alpha, beta, color, startTime) {
    this.nodesSearched++;

    // Check time limit
    if (performance.now() - startTime > this.timeLimit) {
      return this.evaluate(board, color);
    }

    if (depth === 0) {
      return this.evaluate(board, color);
    }

    // Generate all legal moves
    const moves = board.getAllLegalMoves(color);

    if (moves.length === 0) {
      if (board.isInCheck(color)) {
        // Checkmate - worst possible score (penalize slower mates with depth)
        return -100000 + (this.maxDepth - depth) * 100;
      } else {
        // Stalemate
        return 0;
      }
    }

    // Move ordering for better pruning
    const scoredMoves = moves.map(m => ({
      move: m,
      score: this.scoreMove(board, m)
    }));
    scoredMoves.sort((a, b) => b.score - a.score);

    let bestEval = -Infinity;

    for (const { move } of scoredMoves) {
      if (performance.now() - startTime > this.timeLimit) {
        return bestEval;
      }

      // Make move
      const undoInfo = board.applyMove(move, true);
      const evalScore = -this.alphaBeta(board, depth - 1, -beta, -alpha, color === WHITE ? BLACK : WHITE, startTime);
      // Unmake move
      board.undoMove(move, undoInfo);

      bestEval = Math.max(bestEval, evalScore);

      alpha = Math.max(alpha, evalScore);
      if (alpha >= beta) {
        break; // Beta cutoff
      }
    }

    return bestEval;
  }

  /**
   * Score a move for ordering (higher = search first).
   * MVV-LVA: Most Valuable Victim - Least Valuable Attacker
   */
  scoreMove(board, move) {
    let score = 0;
    const target = board.getPiece(move.to.row, move.to.col);
    const attacker = move.piece;

    // Captures: MVV-LVA
    if (target) {
      score += this.getPieceValue(target.type) * 10 - this.getPieceValue(attacker.type);
    }

    // Promote
    if (move.to.promotion) {
      score += QUEEN_VALUE;
    }

    // En passant
    if (move.to.isEnPassant) {
      score += PAWN_VALUE * 10;
    }

    // Castling
    if (move.to.isCastling) {
      score += 50;
    }

    // Position-based bonus (go toward center)
    const centerDist = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
    if (target) {
      score += (7 - centerDist) * 2;
    } else {
      score += (7 - centerDist);
    }

    // Killer move heuristic (simplified)
    return score;
  }

  getPieceValue(type) {
    switch (type) {
      case PAWN: return PAWN_VALUE;
      case KNIGHT: return KNIGHT_VALUE;
      case BISHOP: return BISHOP_VALUE;
      case ROOK: return ROOK_VALUE;
      case QUEEN: return QUEEN_VALUE;
      case KING: return KING_VALUE;
      default: return 0;
    }
  }

  /**
   * Evaluate the board position from the perspective of the given color.
   * Includes material, piece-square tables, mobility, and king safety.
   */
  evaluate(board, color) {
    let score = 0;
    let whiteMaterial = 0;
    let blackMaterial = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board.grid[r][c];
        if (!piece) continue;

        const absIdx = r * 8 + c;
        const value = this.getPieceValue(piece.type);

        if (piece.color === color) {
          // Material
          score += value;
          // Piece-square tables
          if (piece.type === PAWN) score += PAWN_TABLE[absIdx];
          else if (piece.type === KNIGHT) score += KNIGHT_TABLE[absIdx];
          else if (piece.type === BISHOP) score += BISHOP_TABLE[absIdx];
          else if (piece.type === ROOK) score += ROOK_TABLE[absIdx];
          else if (piece.type === QUEEN) score += QUEEN_TABLE[absIdx];
          else if (piece.type === KING) {
            score += KING_TABLE_MIDDLE[absIdx];
          }

          if (piece.type !== KING) {
            whiteMaterial += value;
          }
        } else {
          // Negative for opponent
          score -= value;
          if (piece.type === PAWN) score -= PAWN_TABLE[absIdx];
          else if (piece.type === KNIGHT) score -= KNIGHT_TABLE[absIdx];
          else if (piece.type === BISHOP) score -= BISHOP_TABLE[absIdx];
          else if (piece.type === ROOK) score -= ROOK_TABLE[absIdx];
          else if (piece.type === QUEEN) score -= QUEEN_TABLE[absIdx];
          else if (piece.type === KING) {
            score -= KING_TABLE_MIDDLE[absIdx];
          }

          if (piece.type !== KING) {
            blackMaterial += value;
          }
        }
      }
    }

    // Mobility bonus
    const moves = board.getAllLegalMoves(color);
    const opponentMoves = board.getAllLegalMoves(color === WHITE ? BLACK : WHITE);
    score += moves.length * 5;
    score -= opponentMoves.length * 5;

    // King safety / endgame activation
    const totalMaterial = whiteMaterial + blackMaterial;
    if (totalMaterial < 1500) {
      // Endgame: activate king
      const myKing = board.findKing(color);
      const oppKing = board.findKing(color === WHITE ? BLACK : WHITE);
      if (myKing && oppKing) {
        const kingDist = Math.abs(myKing.row - oppKing.row) + Math.abs(myKing.col - oppKing.col);
        score += (14 - kingDist) * 10;
      }
    }

    // Bonus for checking opponent
    if (board.isInCheck(color === WHITE ? BLACK : WHITE)) {
      score += 50;
    }

    return score;
  }
}
