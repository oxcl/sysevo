/**
 * Chess AI - Minimax with Alpha-Beta Pruning.
 * Plays as Black.
 */
import Chess, {
  WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  PIECE_VALUES,
} from './chess.js';

// Piece-square tables for positional evaluation
// Values from classic chess programming resources
// Index is row (0-7) from white's perspective (0=rank 8, 7=rank 1)

const PAWN_TABLE = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [ 5,  5, 10, 25, 25, 10,  5,  5],
  [ 0,  0,  0, 20, 20,  0,  0,  0],
  [ 5, -5,-10,  0,  0,-10, -5,  5],
  [ 5, 10, 10,-20,-20, 10, 10,  5],
  [ 0,  0,  0,  0,  0,  0,  0,  0],
];

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

const ROOK_TABLE = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [ 5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [ 0,  0,  0,  5,  5,  0,  0,  0],
];

const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];

const KING_TABLE_MIDDLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20],
];

const KING_TABLE_ENDGAME = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50],
];

const PIECE_TABLES = {
  [PAWN]: PAWN_TABLE,
  [KNIGHT]: KNIGHT_TABLE,
  [BISHOP]: BISHOP_TABLE,
  [ROOK]: ROOK_TABLE,
  [QUEEN]: QUEEN_TABLE,
  [KING]: KING_TABLE_MIDDLE,
};

/**
 * Evaluate the board position from White's perspective.
 * Positive = good for White, negative = good for Black.
 */
function evaluate(game) {
  let score = 0;
  let whiteMaterial = 0;
  let blackMaterial = 0;
  let totalMaterial = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = game.board[r][c];
      if (!p) continue;

      const value = PIECE_VALUES[p.type];
      let table = PIECE_TABLES[p.type];

      // For black, flip the row index
      const tableRow = p.color === WHITE ? r : 7 - r;
      const posValue = table ? table[tableRow][c] : 0;

      if (p.color === WHITE) {
        score += value + posValue;
        whiteMaterial += value;
      } else {
        score -= value + posValue;
        blackMaterial += value;
      }
      totalMaterial += value;
    }
  }

  // Use endgame king table if material is low
  if (totalMaterial <= PIECE_VALUES[ROOK] * 2 + PIECE_VALUES[BISHOP] + PIECE_VALUES[KNIGHT]) {
    // Re-evaluate king positions with endgame table
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = game.board[r][c];
        if (!p || p.type !== KING) continue;
        const tableRow = p.color === WHITE ? r : 7 - r;
        const oldPosValue = PIECE_TABLES[KING][tableRow][c];
        const newPosValue = KING_TABLE_ENDGAME[tableRow][c];
        const delta = newPosValue - oldPosValue;
        if (p.color === WHITE) {
          score += delta;
        } else {
          score -= delta;
        }
      }
    }
  }

  // Bonus for mobility (number of legal moves)
  // This is expensive to compute for full search, so we skip it here
  // and rely on piece-square tables for positional play.

  // Bonus for bishop pair
  const whiteBishops = [];
  const blackBishops = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = game.board[r][c];
      if (p && p.type === BISHOP) {
        if (p.color === WHITE) whiteBishops.push(p);
        else blackBishops.push(p);
      }
    }
  }
  if (whiteBishops.length >= 2) score += 30;
  if (blackBishops.length >= 2) score -= 30;

  // Bonus for rook on open file
  for (let c = 0; c < 8; c++) {
    let hasPawn = false;
    for (let r = 0; r < 8; r++) {
      const p = game.board[r][c];
      if (p && p.type === PAWN) { hasPawn = true; break; }
    }
    if (!hasPawn) {
      for (let r = 0; r < 8; r++) {
        const p = game.board[r][c];
        if (p && p.type === ROOK) {
          if (p.color === WHITE) score += 20;
          else score -= 20;
        }
      }
    }
  }

  // Bonus for knight outpost (knight on 6th/7th rank for white, 2nd/1st for black)
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = game.board[r][c];
      if (!p || p.type !== KNIGHT) continue;
      if (p.color === WHITE && r <= 2) score += 15;
      if (p.color === BLACK && r >= 5) score -= 15;
    }
  }

  // Bonus for central pawns
  const centralSquares = [[3,3],[3,4],[4,3],[4,4]];
  for (const [r, c] of centralSquares) {
    const p = game.board[r][c];
    if (p && p.type === PAWN) {
      if (p.color === WHITE) score += 10;
      else score -= 10;
    }
  }

  return score;
}

/**
 * Order moves for better alpha-beta pruning.
 * Captures first (ordered by MVV-LVA), then non-captures.
 */
function orderMoves(game, moves) {
  const scored = moves.map(move => {
    let score = 0;

    // Priority 1: Captures (MVV-LVA)
    if (move.captured) {
      // Victim value minus attacker value (Most Valuable Victim - Least Valuable Attacker)
      score = 10 * (PIECE_VALUES[move.captured.type] || 0) - (PIECE_VALUES[move.piece.type] || 0);
    }

    // Priority 2: Promotions
    if (move.promotion) {
      score += PIECE_VALUES[move.promotion] || 0;
    }

    // Priority 3: Castling (encourage king safety)
    if (move.castling) {
      score += 50;
    }

    // Priority 4: Center control
    const centerDist = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
    score -= centerDist;

    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.move);
}

/**
 * Minimax with Alpha-Beta Pruning.
 * Returns { score, move }.
 */
function minimax(game, depth, alpha, beta, isMaximizing, startTime, maxTimeMs) {
  // Check time limit
  if (Date.now() - startTime > maxTimeMs) {
    return { score: evaluate(game), move: null };
  }

  // Terminal node
  if (depth === 0) {
    return { score: quiescenceSearch(game, alpha, beta, isMaximizing, startTime, maxTimeMs), move: null };
  }

  // Game over check
  if (game.isGameOver()) {
    if (game.inCheckmate()) {
      // The current player (whose turn it is) is checkmated
      return { score: isMaximizing ? -99999 + (3 - depth) : 99999 - (3 - depth), move: null };
    }
    return { score: 0, move: null }; // draw
  }

  const moves = game.moves();
  if (moves.length === 0) {
    if (game.inCheck()) {
      return { score: isMaximizing ? -99999 + (3 - depth) : 99999 - (3 - depth), move: null };
    }
    return { score: 0, move: null };
  }

  const orderedMoves = orderMoves(game, moves);
  let bestMove = orderedMoves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of orderedMoves) {
      const g = game.clone();
      g.move(move);
      const result = minimax(g, depth - 1, alpha, beta, false, startTime, maxTimeMs);
      const evalScore = result.score;

      if (evalScore > maxEval) {
        maxEval = evalScore;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of orderedMoves) {
      const g = game.clone();
      g.move(move);
      const result = minimax(g, depth - 1, alpha, beta, true, startTime, maxTimeMs);
      const evalScore = result.score;

      if (evalScore < minEval) {
        minEval = evalScore;
        bestMove = move;
      }
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

/**
 * Quiescence search - capture only search to handle the horizon effect.
 */
function quiescenceSearch(game, alpha, beta, isMaximizing, startTime, maxTimeMs) {
  if (Date.now() - startTime > maxTimeMs) {
    return evaluate(game);
  }

  const standPat = evaluate(game);

  if (isMaximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  // Generate only capture moves
  const allMoves = game.moves();
  const captures = allMoves.filter(m => m.captured);
  const orderedCaptures = orderMoves(game, captures);

  if (isMaximizing) {
    let best = standPat;
    for (const move of orderedCaptures) {
      const g = game.clone();
      g.move(move);
      const score = quiescenceSearch(g, alpha, beta, false, startTime, maxTimeMs);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = standPat;
    for (const move of orderedCaptures) {
      const g = game.clone();
      g.move(move);
      const score = quiescenceSearch(g, alpha, beta, true, startTime, maxTimeMs);
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

/**
 * Find the best move for the current player.
 * Uses iterative deepening with time limit.
 * @param {Chess} game - The current game state.
 * @param {number} maxTimeMs - Maximum time in milliseconds (default 200).
 * @returns {Object|null} The best move, or null if no moves available.
 */
export function findBestMove(game, maxTimeMs = 200) {
  const moves = game.moves();
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const startTime = Date.now();
  const isMaximizing = game.turn === WHITE;

  let bestMove = moves[0];
  let bestScore = isMaximizing ? -Infinity : Infinity;

  // Iterative deepening
  const maxDepth = 4; // Maximum search depth

  for (let depth = 1; depth <= maxDepth; depth++) {
    // Check time
    if (Date.now() - startTime > maxTimeMs * 0.8) break;

    const result = minimax(game, depth, -Infinity, Infinity, isMaximizing, startTime, maxTimeMs);
    
    if (result.move && Date.now() - startTime < maxTimeMs) {
      bestMove = result.move;
      bestScore = result.score;
    }

    // If we found a forced mate, no need to go deeper
    if (Math.abs(result.score) > 90000) break;
  }

  return bestMove;
}

export { evaluate };
