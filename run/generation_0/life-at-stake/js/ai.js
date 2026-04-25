/**
 * AI Opponent - Minimax with Alpha-Beta Pruning
 * Must respond within 250ms
 */

// Piece values for evaluation
const PIECE_VALUES = {
  'P': 100,
  'N': 320,
  'B': 330,
  'R': 500,
  'Q': 900,
  'K': 20000
};

// Positional tables (from white's perspective, flip for black)
// Pawn table
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
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_TABLE_MIDDLEGAME = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

const KING_TABLE_ENDGAME = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50]
];

function getPieceValue(piece, row, col, gamePhase) {
  let value = PIECE_VALUES[piece.type];
  let posValue = 0;
  
  // Flip row for black pieces (tables are from white's perspective)
  const r = piece.color === 'white' ? row : 7 - row;
  
  switch (piece.type) {
    case 'P': posValue = PAWN_TABLE[r][col]; break;
    case 'N': posValue = KNIGHT_TABLE[r][col]; break;
    case 'B': posValue = BISHOP_TABLE[r][col]; break;
    case 'R': posValue = ROOK_TABLE[r][col]; break;
    case 'Q': posValue = QUEEN_TABLE[r][col]; break;
    case 'K': 
      if (gamePhase === 'endgame') {
        posValue = KING_TABLE_ENDGAME[r][col];
      } else {
        posValue = KING_TABLE_MIDDLEGAME[r][col];
      }
      break;
  }
  
  value += posValue;
  
  // Bonus for mobility (approximate)
  return value;
}

/**
 * Evaluate the board from white's perspective (positive = white advantage)
 */
function evaluateBoard(state) {
  const board = state.board;
  let score = 0;
  let whiteMaterial = 0;
  let blackMaterial = 0;
  
  // Determine game phase based on total non-pawn material (rough)
  let nonPawnMaterial = 0;
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const value = getPieceValue(p, r, c, 'middlegame');
        if (p.color === 'white') {
          score += value;
          whiteMaterial += PIECE_VALUES[p.type];
        } else {
          score -= value;
          blackMaterial += PIECE_VALUES[p.type];
        }
        if (p.type !== 'P' && p.type !== 'K') {
          nonPawnMaterial += PIECE_VALUES[p.type];
        }
      }
    }
  }
  
  // Determine game phase for kings
  const gamePhase = nonPawnMaterial <= 2600 ? 'endgame' : 'middlegame';
  
  // Re-evaluate with proper king tables
  score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const value = getPieceValue(p, r, c, gamePhase);
        if (p.color === 'white') score += value;
        else score -= value;
      }
    }
  }
  
  // Mobility bonus (simplified - count legal moves)
  // We'll skip full mobility calculation for speed, but add small bonuses
  
  return score;
}

/**
 * Move ordering heuristic (for better alpha-beta pruning)
 * Returns a score for ordering moves: higher = search first
 */
function moveOrderingScore(state, move) {
  let score = 0;
  const fromPiece = state.board[move.from.row][move.from.col];
  const toPiece = state.board[move.to.row][move.to.col];
  
  // Captures: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
  if (toPiece) {
    score += 10 * PIECE_VALUES[toPiece.type] - PIECE_VALUES[fromPiece.type];
  }
  
  // Promotions
  if (move.to.promotion) {
    score += 800;
  }
  
  // Castling
  if (move.to.castling) {
    score += 300;
  }
  
  // En passant captures
  if (move.to.enPassant) {
    score += 500;
  }
  
  // Central moves slightly preferred
  const centerDist = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
  score -= centerDist * 2;
  
  return score;
}

/**
 * Minimax with Alpha-Beta Pruning and iterative deepening
 */
class ChessAI {
  constructor() {
    this.timeLimit = 200; // ms - slightly under 250ms to be safe
    this.startTime = 0;
    this.nodesSearched = 0;
    this.bestMove = null;
    this.transpositionTable = new Map();
  }
  
  /**
   * Find the best move for the AI (plays as Black)
   */
  findBestMove(state) {
    this.startTime = performance.now();
    this.nodesSearched = 0;
    this.bestMove = null;
    
    const color = 'black';
    const moves = getAllLegalMoves(state, color);
    
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];
    
    // Order moves initially
    moves.sort((a, b) => moveOrderingScore(state, b) - moveOrderingScore(state, a));
    
    let bestMove = moves[0];
    let alpha = -Infinity;
    let beta = Infinity;
    
    // Iterative deepening - start with depth 2 and increase
    for (let depth = 1; depth <= 10; depth++) {
      let currentAlpha = alpha;
      let currentBest = null;
      let completed = true;
      
      // Re-sort best move to front for better pruning
      if (this.bestMove) {
        const idx = moves.findIndex(m => 
          m.from.row === this.bestMove.from.row && 
          m.from.col === this.bestMove.from.col &&
          m.to.row === this.bestMove.to.row &&
          m.to.col === this.bestMove.to.col
        );
        if (idx > 0) {
          const move = moves.splice(idx, 1)[0];
          moves.unshift(move);
        }
      }
      
      for (const move of moves) {
        const elapsed = performance.now() - this.startTime;
        if (elapsed > this.timeLimit) {
          completed = false;
          break;
        }
        
        const newState = applyMove(state, move.from, move.to);
        if (!newState) continue;
        
        const score = this.minimax(newState, depth - 1, -beta, -currentAlpha, false, color);
        const evalScore = -score;
        
        if (evalScore > currentAlpha) {
          currentAlpha = evalScore;
          currentBest = move;
        }
      }
      
      if (!completed) break;
      
      if (currentBest) {
        bestMove = currentBest;
        alpha = currentAlpha;
        this.bestMove = currentBest;
      }
      
      // If we found a winning move, stop searching
      if (alpha > 10000) break;
      
      // Check if we've used too much time
      if (performance.now() - this.startTime > this.timeLimit * 0.8) break;
    }
    
    return bestMove;
  }
  
  /**
   * Minimax with Alpha-Beta pruning
   */
  minimax(state, depth, alpha, beta, isMaximizing, aiColor) {
    this.nodesSearched++;
    
    // Check time limit periodically
    if (this.nodesSearched % 1000 === 0) {
      if (performance.now() - this.startTime > this.timeLimit) {
        return isMaximizing ? -Infinity : Infinity; // Signal to stop
      }
    }
    
    // Terminal node evaluation
    if (depth === 0 || state.gameOver) {
      const score = evaluateBoard(state);
      
      // If it's checkmate/stalemate, adjust score
      if (state.gameOver === 'white') return -100000; // Black wins (AI is black)
      if (state.gameOver === 'black') return 100000; // White wins
      if (state.gameOver && state.gameOver.startsWith('draw')) return 0;
      
      // Add small bonus for check
      if (state.gameOver === 'check') {
        return isMaximizing ? score + 50 : score - 50;
      }
      
      return score;
    }
    
    const color = isMaximizing ? aiColor : getOpponent(aiColor);
    const moves = getAllLegalMoves(state, color);
    
    if (moves.length === 0) {
      // No legal moves - checkmate or stalemate
      if (isInCheck(state.board, color)) {
        // Checkmate
        return isMaximizing ? -100000 + (10 - depth) : 100000 - (10 - depth);
      } else {
        // Stalemate
        return 0;
      }
    }
    
    // Sort moves for better pruning
    moves.sort((a, b) => moveOrderingScore(state, b) - moveOrderingScore(state, a));
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const newState = applyMove(state, move.from, move.to);
        if (!newState) continue;
        
        const evalScore = this.minimax(newState, depth - 1, alpha, beta, false, aiColor);
        
        if (evalScore < -99999) return evalScore; // Time limit hit
        
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break; // Beta cutoff
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const newState = applyMove(state, move.from, move.to);
        if (!newState) continue;
        
        const evalScore = this.minimax(newState, depth - 1, alpha, beta, true, aiColor);
        
        if (evalScore < -99999) return evalScore; // Time limit hit
        
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break; // Alpha cutoff
      }
      return minEval;
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChessAI };
}
