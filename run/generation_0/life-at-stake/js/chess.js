/**
 * Chess Engine - Full implementation of standard chess rules
 * No external dependencies.
 */

// Piece types
const PAWN = 'P';
const KNIGHT = 'N';
const BISHOP = 'B';
const ROOK = 'R';
const QUEEN = 'Q';
const KING = 'K';

const WHITE = 'white';
const BLACK = 'black';

const PIECE_UNICODE = {
  'white': { 'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙' },
  'black': { 'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟' }
};

function createPiece(type, color) {
  return { type, color, unicode: PIECE_UNICODE[color][type] };
}

function isColor(piece, color) {
  return piece !== null && piece.color === color;
}

function cloneBoard(board) {
  return board.map(row => row.map(p => p ? { ...p } : null));
}

function createInitialBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // White pieces
  board[7][0] = createPiece(ROOK, WHITE);
  board[7][1] = createPiece(KNIGHT, WHITE);
  board[7][2] = createPiece(BISHOP, WHITE);
  board[7][3] = createPiece(QUEEN, WHITE);
  board[7][4] = createPiece(KING, WHITE);
  board[7][5] = createPiece(BISHOP, WHITE);
  board[7][6] = createPiece(KNIGHT, WHITE);
  board[7][7] = createPiece(ROOK, WHITE);
  for (let c = 0; c < 8; c++) board[6][c] = createPiece(PAWN, WHITE);
  
  // Black pieces
  board[0][0] = createPiece(ROOK, BLACK);
  board[0][1] = createPiece(KNIGHT, BLACK);
  board[0][2] = createPiece(BISHOP, BLACK);
  board[0][3] = createPiece(QUEEN, BLACK);
  board[0][4] = createPiece(KING, BLACK);
  board[0][5] = createPiece(BISHOP, BLACK);
  board[0][6] = createPiece(KNIGHT, BLACK);
  board[0][7] = createPiece(ROOK, BLACK);
  for (let c = 0; c < 8; c++) board[1][c] = createPiece(PAWN, BLACK);
  
  return board;
}

function createInitialState() {
  return {
    board: createInitialBoard(),
    turn: WHITE,
    castlingRights: { K: true, Q: true, k: true, q: true },
    enPassantTarget: null,
    moveHistory: [],
    gameOver: null, // null | 'white' | 'black' | 'draw' | 'stalemate' | 'insufficient-material'
    halfMoveClock: 0
  };
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === KING && p.color === color) return { row: r, col: c };
    }
  }
  return null;
}

// Directions for sliding pieces
const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
const QUEEN_DIRS = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
const KNIGHT_MOVES = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_MOVES = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

/**
 * Get pseudo-legal moves for a piece (doesn't check if king is left in check)
 */
function getPseudoLegalMoves(state, row, col) {
  const board = state.board;
  const piece = board[row][col];
  if (!piece) return [];
  
  const moves = [];
  const color = piece.color;
  const enemy = color === WHITE ? BLACK : WHITE;
  
  switch (piece.type) {
    case PAWN: {
      const dir = color === WHITE ? -1 : 1;
      const startRow = color === WHITE ? 6 : 1;
      const promoRow = color === WHITE ? 0 : 7;
      
      // Forward one square
      if (inBounds(row + dir, col) && !board[row + dir][col]) {
        const dest = { row: row + dir, col };
        if (row + dir === promoRow) {
          // Promotion: add 4 moves (one for each piece)
          for (const promo of [QUEEN, ROOK, BISHOP, KNIGHT]) {
            moves.push({ row: dest.row, col: dest.col, promotion: promo });
          }
        } else {
          moves.push(dest);
        }
        
        // Forward two squares from starting position
        if (row === startRow && !board[row + 2 * dir][col]) {
          moves.push({ row: row + 2 * dir, col });
        }
      }
      
      // Captures
      for (const dc of [-1, 1]) {
        const nc = col + dc;
        if (inBounds(row + dir, nc)) {
          // Normal capture
          if (board[row + dir][nc] && board[row + dir][nc].color === enemy) {
            const dest = { row: row + dir, col: nc };
            if (row + dir === promoRow) {
              for (const promo of [QUEEN, ROOK, BISHOP, KNIGHT]) {
                moves.push({ row: dest.row, col: dest.col, promotion: promo });
              }
            } else {
              moves.push(dest);
            }
          }
          // En passant
          if (state.enPassantTarget && state.enPassantTarget.row === row + dir && state.enPassantTarget.col === nc) {
            moves.push({ row: row + dir, col: nc, enPassant: true });
          }
        }
      }
      break;
    }
    
    case KNIGHT: {
      for (const [dr, dc] of KNIGHT_MOVES) {
        const nr = row + dr;
        const nc = col + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color === enemy)) {
          moves.push({ row: nr, col: nc });
        }
      }
      break;
    }
    
    case BISHOP: {
      for (const [dr, dc] of BISHOP_DIRS) {
        let nr = row + dr, nc = col + dc;
        while (inBounds(nr, nc)) {
          if (board[nr][nc]) {
            if (board[nr][nc].color === enemy) moves.push({ row: nr, col: nc });
            break;
          }
          moves.push({ row: nr, col: nc });
          nr += dr;
          nc += dc;
        }
      }
      break;
    }
    
    case ROOK: {
      for (const [dr, dc] of ROOK_DIRS) {
        let nr = row + dr, nc = col + dc;
        while (inBounds(nr, nc)) {
          if (board[nr][nc]) {
            if (board[nr][nc].color === enemy) moves.push({ row: nr, col: nc });
            break;
          }
          moves.push({ row: nr, col: nc });
          nr += dr;
          nc += dc;
        }
      }
      break;
    }
    
    case QUEEN: {
      for (const [dr, dc] of QUEEN_DIRS) {
        let nr = row + dr, nc = col + dc;
        while (inBounds(nr, nc)) {
          if (board[nr][nc]) {
            if (board[nr][nc].color === enemy) moves.push({ row: nr, col: nc });
            break;
          }
          moves.push({ row: nr, col: nc });
          nr += dr;
          nc += dc;
        }
      }
      break;
    }
    
    case KING: {
      for (const [dr, dc] of KING_MOVES) {
        const nr = row + dr;
        const nc = col + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color === enemy)) {
          moves.push({ row: nr, col: nc });
        }
      }
      
      // Castling
      if (color === WHITE && row === 7 && col === 4) {
        // Kingside
        if (state.castlingRights.K && 
            !board[7][5] && !board[7][6] && 
            board[7][7] && board[7][7].type === ROOK && board[7][7].color === WHITE) {
          // Check that king doesn't pass through check (will be validated in getLegalMoves)
          moves.push({ row: 7, col: 6, castling: 'K' });
        }
        // Queenside
        if (state.castlingRights.Q && 
            !board[7][3] && !board[7][2] && !board[7][1] && 
            board[7][0] && board[7][0].type === ROOK && board[7][0].color === WHITE) {
          moves.push({ row: 7, col: 2, castling: 'Q' });
        }
      }
      if (color === BLACK && row === 0 && col === 4) {
        // Kingside
        if (state.castlingRights.k && 
            !board[0][5] && !board[0][6] && 
            board[0][7] && board[0][7].type === ROOK && board[0][7].color === BLACK) {
          moves.push({ row: 0, col: 6, castling: 'k' });
        }
        // Queenside
        if (state.castlingRights.q && 
            !board[0][3] && !board[0][2] && !board[0][1] && 
            board[0][0] && board[0][0].type === ROOK && board[0][0].color === BLACK) {
          moves.push({ row: 0, col: 2, castling: 'q' });
        }
      }
      break;
    }
  }
  
  return moves;
}

/**
 * Check if a color is currently in check
 */
function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  
  const enemy = color === WHITE ? BLACK : WHITE;
  
  // Check if any enemy piece can capture the king
  // We can optimize by checking from king's perspective
  const kr = king.row, kc = king.col;
  
  // Knight attacks
  for (const [dr, dc] of KNIGHT_MOVES) {
    const nr = kr + dr, nc = kc + dc;
    if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].type === KNIGHT && board[nr][nc].color === enemy) {
      return true;
    }
  }
  
  // Pawn attacks
  const pawnDir = color === WHITE ? -1 : 1;
  for (const dc of [-1, 1]) {
    const nr = kr + pawnDir, nc = kc + dc;
    if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].type === PAWN && board[nr][nc].color === enemy) {
      return true;
    }
  }
  
  // King attacks
  for (const [dr, dc] of KING_MOVES) {
    const nr = kr + dr, nc = kc + dc;
    if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].type === KING && board[nr][nc].color === enemy) {
      return true;
    }
  }
  
  // Sliding pieces (rook, bishop, queen)
  // Check orthogonally for rook/queen
  for (const [dr, dc] of ROOK_DIRS) {
    let nr = kr + dr, nc = kc + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === enemy && (p.type === ROOK || p.type === QUEEN)) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  
  // Check diagonally for bishop/queen
  for (const [dr, dc] of BISHOP_DIRS) {
    let nr = kr + dr, nc = kc + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === enemy && (p.type === BISHOP || p.type === QUEEN)) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  
  return false;
}

/**
 * Check if a square is attacked by the given color
 */
function isSquareAttacked(board, row, col, attackingColor) {
  const enemy = attackingColor;
  
  // Knight attacks
  for (const [dr, dc] of KNIGHT_MOVES) {
    const nr = row + dr, nc = col + dc;
    if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].type === KNIGHT && board[nr][nc].color === enemy) {
      return true;
    }
  }
  
  // Pawn attacks
  const pawnDir = attackingColor === WHITE ? 1 : -1; // pawns attack down for white, up for black
  for (const dc of [-1, 1]) {
    const nr = row + pawnDir, nc = col + dc;
    if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].type === PAWN && board[nr][nc].color === enemy) {
      return true;
    }
  }
  
  // King attacks
  for (const [dr, dc] of KING_MOVES) {
    const nr = row + dr, nc = col + dc;
    if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].type === KING && board[nr][nc].color === enemy) {
      return true;
    }
  }
  
  // Sliding pieces
  for (const [dr, dc] of ROOK_DIRS) {
    let nr = row + dr, nc = col + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === enemy && (p.type === ROOK || p.type === QUEEN)) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  
  for (const [dr, dc] of BISHOP_DIRS) {
    let nr = row + dr, nc = col + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === enemy && (p.type === BISHOP || p.type === QUEEN)) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  
  return false;
}

/**
 * Apply a move and return new state (does not mutate original)
 */
function applyMove(state, from, to) {
  const newBoard = cloneBoard(state.board);
  const piece = newBoard[from.row][from.col];
  if (!piece) return null;
  
  const newState = {
    board: newBoard,
    turn: state.turn === WHITE ? BLACK : WHITE,
    castlingRights: { ...state.castlingRights },
    enPassantTarget: null,
    moveHistory: [...state.moveHistory, { from, to, captured: state.board[to.row][to.col] ? { ...state.board[to.row][to.col] } : null }],
    gameOver: null,
    halfMoveClock: state.halfMoveClock
  };
  
  // Move the piece
  newBoard[to.row][to.col] = piece;
  newBoard[from.row][from.col] = null;
  
  // En passant capture
  if (to.enPassant) {
    const capturedPawnRow = from.row; // the en passant captured pawn is on the same row as the moving pawn
    newBoard[capturedPawnRow][to.col] = null;
    newState.moveHistory[newState.moveHistory.length - 1].captured = { type: PAWN, color: state.turn === WHITE ? BLACK : WHITE };
  }
  
  // Pawn promotion
  if (to.promotion) {
    newBoard[to.row][to.col] = createPiece(to.promotion, piece.color);
  }
  
  // En passant target for next move
  if (piece.type === PAWN && Math.abs(to.row - from.row) === 2) {
    newState.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
  }
  
  // Castling - move the rook
  if (to.castling) {
    if (to.castling === 'K') {
      newBoard[7][5] = newBoard[7][7];
      newBoard[7][7] = null;
    } else if (to.castling === 'Q') {
      newBoard[7][3] = newBoard[7][0];
      newBoard[7][0] = null;
    } else if (to.castling === 'k') {
      newBoard[0][5] = newBoard[0][7];
      newBoard[0][7] = null;
    } else if (to.castling === 'q') {
      newBoard[0][3] = newBoard[0][0];
      newBoard[0][0] = null;
    }
  }
  
  // Update castling rights
  // King moved
  if (piece.type === KING) {
    if (piece.color === WHITE) {
      newState.castlingRights.K = false;
      newState.castlingRights.Q = false;
    } else {
      newState.castlingRights.k = false;
      newState.castlingRights.q = false;
    }
  }
  // Rook moved or captured
  if (from.row === 7 && from.col === 7) newState.castlingRights.K = false;
  if (from.row === 7 && from.col === 0) newState.castlingRights.Q = false;
  if (from.row === 0 && from.col === 7) newState.castlingRights.k = false;
  if (from.row === 0 && from.col === 0) newState.castlingRights.q = false;
  if (to.row === 7 && to.col === 7) newState.castlingRights.K = false;
  if (to.row === 7 && to.col === 0) newState.castlingRights.Q = false;
  if (to.row === 0 && to.col === 7) newState.castlingRights.k = false;
  if (to.row === 0 && to.col === 0) newState.castlingRights.q = false;
  
  // Half move clock (for 50-move rule - not fully implemented but tracked)
  if (piece.type === PAWN || newState.moveHistory[newState.moveHistory.length - 1].captured) {
    newState.halfMoveClock = 0;
  } else {
    newState.halfMoveClock++;
  }
  
  // Check game state
  const currentColor = state.turn; // the color that just moved
  const opponentColor = newState.turn;
  
  if (isInCheck(newBoard, opponentColor)) {
    newState.gameOver = 'check';
  }
  
  // Check for checkmate
  if (isCheckmate(newState, opponentColor)) {
    newState.gameOver = currentColor; // currentColor wins
  }
  
  // Check for stalemate
  if (isStalemate(newState, opponentColor)) {
    newState.gameOver = 'draw-stalemate';
  }
  
  // Check for insufficient material
  if (isInsufficientMaterial(newBoard)) {
    newState.gameOver = 'draw-insufficient-material';
  }
  
  return newState;
}

/**
 * Get all legal moves for a piece (filtering out moves that leave king in check)
 */
function getLegalMoves(state, row, col) {
  const piece = state.board[row][col];
  if (!piece) return [];
  
  const pseudoMoves = getPseudoLegalMoves(state, row, col);
  const legalMoves = [];
  
  for (const move of pseudoMoves) {
    // For castling, we need extra validation: king can't be in check, can't pass through check
    if (move.castling) {
      // King can't be in check
      if (isInCheck(state.board, piece.color)) continue;
      
      // King can't pass through check
      const dir = move.col - col > 0 ? 1 : -1;
      let inCheck = false;
      for (let c = col; c !== move.col + dir; c += dir) {
        // Check if the square is attacked
        if (c !== col && isSquareAttacked(state.board, row, c, piece.color === WHITE ? BLACK : WHITE)) {
          inCheck = true;
          break;
        }
      }
      if (inCheck) continue;
    }
    
    // Apply the move and check if own king is in check
    const newState = applyMove(state, { row, col }, move);
    if (newState) {
      const opponent = piece.color;
      if (!isInCheck(newState.board, opponent)) {
        legalMoves.push(move);
      }
    }
  }
  
  return legalMoves;
}

/**
 * Check if the given color is in checkmate
 */
function isCheckmate(state, color) {
  // Must be in check and have no legal moves
  if (!isInCheck(state.board, color)) return false;
  return !hasLegalMoves(state, color);
}

/**
 * Check if the given color is in stalemate
 */
function isStalemate(state, color) {
  // Must NOT be in check and have no legal moves
  if (isInCheck(state.board, color)) return false;
  return !hasLegalMoves(state, color);
}

/**
 * Check if a color has any legal moves
 */
function hasLegalMoves(state, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c] && state.board[r][c].color === color) {
        const moves = getLegalMoves(state, r, c);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Check for insufficient material (draw)
 */
function isInsufficientMaterial(board) {
  const pieces = { white: [], black: [] };
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        pieces[p.color].push({ ...p, row: r, col: c });
      }
    }
  }
  
  const allPieces = [...pieces.white, ...pieces.black];
  
  // King vs King
  if (allPieces.length === 2) return true;
  
  // King + minor piece vs King
  if (allPieces.length === 3) {
    const whitePieces = pieces.white.length;
    const blackPieces = pieces.black.length;
    
    // One side has a king only, the other has king + bishop or king + knight
    if (whitePieces === 1 || blackPieces === 1) {
      const sideWithPiece = whitePieces > 1 ? pieces.white : pieces.black;
      const extraPiece = sideWithPiece.find(p => p.type !== KING);
      if (extraPiece && (extraPiece.type === BISHOP || extraPiece.type === KNIGHT)) {
        return true;
      }
    }
    
    // King + bishop vs King + bishop (same color bishops) - but checking bishop color is complex
    // For simplicity, we'll just check the most common insufficient material cases
  }
  
  return false;
}

/**
 * Get all legal moves for a color
 */
function getAllLegalMoves(state, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.board[r][c] && state.board[r][c].color === color) {
        const pieceMoves = getLegalMoves(state, r, c);
        for (const move of pieceMoves) {
          moves.push({ from: { row: r, col: c }, to: move });
        }
      }
    }
  }
  return moves;
}

/**
 * Get the opponent color
 */
function getOpponent(color) {
  return color === WHITE ? BLACK : WHITE;
}

/**
 * Get the initial state
 */
function getInitialState() {
  return createInitialState();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, WHITE, BLACK, PIECE_UNICODE,
    createPiece, cloneBoard, createInitialBoard, createInitialState,
    findKing, getPseudoLegalMoves, getLegalMoves, getAllLegalMoves,
    isInCheck, isCheckmate, isStalemate, hasLegalMoves,
    isInsufficientMaterial, isSquareAttacked, applyMove, getOpponent,
    inBounds
  };
}
