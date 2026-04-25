// AI Opponent - Minimax with Alpha-Beta Pruning
// Plays as Black, must respond within 250ms.

import {
  cloneBoard,
  isInCheck,
  isCheckmate,
  isStalemate,
  opponentColor,
  getLegalMovesForColor,
  applyMove,
  findKing,
  isSquareAttacked,
  PIECE_VALUES,
} from './chess.js';

// ============================================================
// Piece-Square Tables
// ============================================================

// Values are from white's perspective; flip for black.
// Rows 0-7 correspond to rank 8 down to rank 1.

const PAWN_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,   0,  5,  5,  5,  5,  0, -5],
  [0,    0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_MIDDLE_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

const KING_ENDGAME_TABLE = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50]
];

const PST = {
  pawn: PAWN_TABLE,
  knight: KNIGHT_TABLE,
  bishop: BISHOP_TABLE,
  rook: ROOK_TABLE,
  queen: QUEEN_TABLE,
  king: KING_MIDDLE_TABLE,
};

const PST_ENDGAME = {
  king: KING_ENDGAME_TABLE,
};

// ============================================================
// Evaluation
// ============================================================

function evaluate(board, color, gamePhase) {
  let score = 0;
  const opp = opponentColor(color);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let value = PIECE_VALUES[piece.type] || 0;
      
      // Positional bonus
      let pstBonus = 0;
      if (piece.type !== 'king') {
        const table = PST[piece.type];
        if (table) {
          const idx = piece.color === 'white' ? r : 7 - r;
          pstBonus = table[idx][c];
        }
      } else {
        // King positioning: use middle game table normally, endgame table for endgame
        if (gamePhase === 'endgame') {
          const idx = piece.color === 'white' ? r : 7 - r;
          pstBonus = KING_ENDGAME_TABLE[idx][c];
        } else {
          const idx = piece.color === 'white' ? r : 7 - r;
          pstBonus = KING_MIDDLE_TABLE[idx][c];
        }
      }

      if (piece.color === color) {
        score += value + pstBonus;
      } else {
        score -= value + pstBonus;
      }
    }
  }

  return score;
}

function detectGamePhase(board) {
  // Count major pieces (queens and rooks)
  let majorPieces = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && (p.type === 'queen' || p.type === 'rook')) {
        majorPieces++;
      }
    }
  }
  return majorPieces <= 2 ? 'endgame' : 'middlegame';
}

// ============================================================
// Move Ordering (for better pruning)
// ============================================================

function orderMoves(moves, board, color) {
  return moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;

    // Captures: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if (a.captured) scoreA += 10 * PIECE_VALUES[a.captured.type] - PIECE_VALUES[board[a.from.row][a.from.col].type];
    if (b.captured) scoreB += 10 * PIECE_VALUES[b.captured.type] - PIECE_VALUES[board[b.from.row][b.from.col].type];

    // Promotions
    if (a.promotion) scoreA += 800;
    if (b.promotion) scoreB += 800;

    // Castling
    if (a.castling) scoreA += 100;
    if (b.castling) scoreB += 100;

    return scoreB - scoreA;
  });
}

// ============================================================
// Minimax with Alpha-Beta Pruning
// ============================================================

let nodesSearched = 0;
let abortSearch = false;

function minimax(board, depth, alpha, beta, isMaximizing, color, castlingRights, enPassantTarget, moveHistory, startTime, timeLimit) {
  if (abortSearch) return null;

  // Check time limit
  if (Date.now() - startTime > timeLimit) {
    abortSearch = true;
    return null;
  }

  nodesSearched++;

  // Terminal checks
  const check = isInCheck(board, color);
  const opp = opponentColor(color);
  const moves = getLegalMovesForColor(board, color, castlingRights, enPassantTarget, moveHistory);

  if (moves.length === 0) {
    if (check) {
      // Checkmate - worst for the player to move
      return isMaximizing ? -100000 + (10 - depth) : 100000 - (10 - depth);
    }
    // Stalemate
    return 0;
  }

  if (depth === 0) {
    const gamePhase = detectGamePhase(board);
    return evaluate(board, color, gamePhase);
  }

  // Move ordering
  const orderedMoves = orderMoves(moves, board, color);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of orderedMoves) {
      const result = applyMove(board, move);
      if (!result) continue;

      // Update castling rights and en passant
      const newCR = updateCastlingRights(castlingRights, board, move);
      const newEP = updateEnPassant(board, move);

      const evalScore = minimax(
        result.board, depth - 1, alpha, beta, false, opp, newCR, newEP, moveHistory, startTime, timeLimit
      );
      
      if (evalScore === null) return null; // aborted
      
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of orderedMoves) {
      const result = applyMove(board, move);
      if (!result) continue;

      const newCR = updateCastlingRights(castlingRights, board, move);
      const newEP = updateEnPassant(board, move);

      const evalScore = minimax(
        result.board, depth - 1, alpha, beta, true, opp, newCR, newEP, moveHistory, startTime, timeLimit
      );
      
      if (evalScore === null) return null;
      
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function updateCastlingRights(castlingRights, board, move) {
  const newCR = { ...castlingRights };
  const { from, to } = move;
  const piece = board[from.row][from.col];
  if (!piece) return newCR;

  const color = piece.color;

  // King moved
  if (piece.type === 'king') {
    if (color === 'white') {
      newCR.whiteKingside = false;
      newCR.whiteQueenside = false;
    } else {
      newCR.blackKingside = false;
      newCR.blackQueenside = false;
    }
  }

  // Rook moved from its starting square
  if (from.row === 7 && from.col === 0) newCR.whiteQueenside = false;
  if (from.row === 7 && from.col === 7) newCR.whiteKingside = false;
  if (from.row === 0 && from.col === 0) newCR.blackQueenside = false;
  if (from.row === 0 && from.col === 7) newCR.blackKingside = false;

  // Rook captured
  if (to.row === 7 && to.col === 0) newCR.whiteQueenside = false;
  if (to.row === 7 && to.col === 7) newCR.whiteKingside = false;
  if (to.row === 0 && to.col === 0) newCR.blackQueenside = false;
  if (to.row === 0 && to.col === 7) newCR.blackKingside = false;

  return newCR;
}

function updateEnPassant(board, move) {
  const { from, to } = move;
  const piece = board[from.row][from.col];
  if (piece && piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
    return { row: (from.row + to.row) / 2, col: from.col };
  }
  return null;
}

// ============================================================
// Main AI Entry Point
// ============================================================

/**
 * Find the best move for the given color.
 * @param {Object} state - Full game state from chess engine
 * @param {number} timeLimit - Maximum time in ms (default 250)
 * @returns {Object|null} Best move found, or null if none
 */
export function findBestMove(state, timeLimit = 220) {
  const { board, turn, castlingRights, enPassantTarget, moveHistory } = state;
  const color = turn;

  const moves = getLegalMovesForColor(board, color, castlingRights, enPassantTarget, moveHistory);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const startTime = Date.now();
  abortSearch = false;
  nodesSearched = 0;

  let bestMove = moves[0];
  let bestScore = -Infinity;

  // Iterative deepening
  for (let depth = 1; depth <= 6; depth++) {
    if (Date.now() - startTime > timeLimit) break;

    let foundMove = null;
    let foundScore = -Infinity;

    const orderedMoves = orderMoves(moves, board, color);
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of orderedMoves) {
      if (Date.now() - startTime > timeLimit) break;
      if (abortSearch) break;

      const result = applyMove(board, move);
      if (!result) continue;

      const newCR = updateCastlingRights(castlingRights, board, move);
      const newEP = updateEnPassant(board, move);
      const opp = opponentColor(color);

      const score = minimax(
        result.board, depth - 1, alpha, beta, false, opp, newCR, newEP, moveHistory, startTime, timeLimit
      );

      if (score === null) break;

      if (score > foundScore) {
        foundScore = score;
        foundMove = move;
      }

      alpha = Math.max(alpha, score);
    }

    if (foundMove && !abortSearch) {
      bestMove = foundMove;
      bestScore = foundScore;
    }

    if (abortSearch) break;

    // If we found a checkmate, stop searching deeper
    if (foundScore >= 100000 - 20) break;
  }

  return bestMove;
}
