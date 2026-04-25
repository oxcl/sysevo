// Chess Engine - Model
// Represents the full state of a chess game with all rules implemented.

// ============================================================
// Constants
// ============================================================

export const PIECE_TYPES = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
export const COLORS = ['white', 'black'];

export const PIECE_SYMBOLS = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};

export const PIECE_VALUES = {
  king: 0,
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
};

export const PIECE_UNICODE = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};

// ============================================================
// Board Utilities
// ============================================================

export function createBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));

  // Place pawns
  for (let c = 0; c < 8; c++) {
    board[1][c] = { type: 'pawn', color: 'black' };
    board[6][c] = { type: 'pawn', color: 'white' };
  }

  // Place back ranks
  const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRank[c], color: 'black' };
    board[7][c] = { type: backRank[c], color: 'white' };
  }

  return board;
}

export function cloneBoard(board) {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

export function isOnBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function opponentColor(color) {
  return color === 'white' ? 'black' : 'white';
}

export function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

// ============================================================
// Initial Game State
// ============================================================

export function createInitialGameState() {
  return {
    board: createBoard(),
    turn: 'white',
    moveHistory: [],
    castlingRights: {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    },
    enPassantTarget: null, // { row, col } or null
    kings: {
      white: { row: 7, col: 4 },
      black: { row: 0, col: 4 },
    },
    gameOver: false,
    winner: null, // 'white', 'black', or null (draw)
    drawReason: null,
    lastMove: null, // { from, to } for highlighting
  };
}

// ============================================================
// Move Generation
// ============================================================

/**
 * Generate all pseudo-legal moves for a piece at (row, col).
 * Does NOT filter for leaving own king in check (that's done by getLegalMoves).
 */
function getPseudoLegalMoves(board, row, col, castlingRights, enPassantTarget, moveHistory) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const { type, color } = piece;

  switch (type) {
    case 'pawn':
      generatePawnMoves(board, row, col, color, enPassantTarget, moves, moveHistory);
      break;
    case 'knight':
      generateKnightMoves(board, row, col, color, moves);
      break;
    case 'bishop':
      generateSlidingMoves(board, row, col, color, moves, [[-1,-1],[-1,1],[1,-1],[1,1]]);
      break;
    case 'rook':
      generateSlidingMoves(board, row, col, color, moves, [[-1,0],[1,0],[0,-1],[0,1]]);
      break;
    case 'queen':
      generateSlidingMoves(board, row, col, color, moves, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
      break;
    case 'king':
      generateKingMoves(board, row, col, color, moves, castlingRights);
      break;
  }

  return moves;
}

function generatePawnMoves(board, row, col, color, enPassantTarget, moves, moveHistory) {
  const dir = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;
  const promoRow = color === 'white' ? 0 : 7;

  // Forward one
  const fRow = row + dir;
  if (isOnBoard(fRow, col) && !board[fRow][col]) {
    if (fRow === promoRow) {
      // Promotion
      for (const promoType of ['queen', 'rook', 'bishop', 'knight']) {
        moves.push({ from: { row, col }, to: { row: fRow, col }, promotion: promoType });
      }
    } else {
      moves.push({ from: { row, col }, to: { row: fRow, col }, promotion: null });
    }

    // Forward two (only from start row and if one square is clear)
    if (row === startRow) {
      const f2Row = row + 2 * dir;
      if (!board[f2Row][col]) {
        moves.push({ from: { row, col }, to: { row: f2Row, col }, promotion: null });
      }
    }
  }

  // Captures
  for (const dc of [-1, 1]) {
    const nc = col + dc;
    const nr = row + dir;
    if (isOnBoard(nr, nc)) {
      const target = board[nr][nc];
      if (target && target.color !== color) {
        if (nr === promoRow) {
          for (const promoType of ['queen', 'rook', 'bishop', 'knight']) {
            moves.push({ from: { row, col }, to: { row: nr, col: nc }, promotion: promoType, captured: target });
          }
        } else {
          moves.push({ from: { row, col }, to: { row: nr, col: nc }, promotion: null, captured: target });
        }
      }

      // En passant
      if (enPassantTarget && enPassantTarget.row === nr && enPassantTarget.col === nc) {
        moves.push({
          from: { row, col },
          to: { row: nr, col: nc },
          promotion: null,
          enPassant: true,
          captured: board[row][nc], // captured pawn is beside
        });
      }
    }
  }
}

function generateKnightMoves(board, row, col, color, moves) {
  const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of offsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (isOnBoard(nr, nc)) {
      const target = board[nr][nc];
      if (!target || target.color !== color) {
        moves.push({ from: { row, col }, to: { row: nr, col: nc }, promotion: null, captured: target || undefined });
      }
    }
  }
}

function generateSlidingMoves(board, row, col, color, moves, directions) {
  for (const [dr, dc] of directions) {
    let nr = row + dr;
    let nc = col + dc;
    while (isOnBoard(nr, nc)) {
      const target = board[nr][nc];
      if (!target) {
        moves.push({ from: { row, col }, to: { row: nr, col: nc }, promotion: null });
      } else {
        if (target.color !== color) {
          moves.push({ from: { row, col }, to: { row: nr, col: nc }, promotion: null, captured: target });
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
}

function generateKingMoves(board, row, col, color, moves, castlingRights) {
  const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (const [dr, dc] of offsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (isOnBoard(nr, nc)) {
      const target = board[nr][nc];
      if (!target || target.color !== color) {
        moves.push({ from: { row, col }, to: { row: nr, col: nc }, promotion: null, captured: target || undefined });
      }
    }
  }

  // Castling
  if (color === 'white' && row === 7 && col === 4) {
    // Kingside
    if (castlingRights.whiteKingside &&
        !board[7][5] && !board[7][6] &&
        board[7][7] && board[7][7].type === 'rook' && board[7][7].color === 'white') {
      moves.push({
        from: { row: 7, col: 4 },
        to: { row: 7, col: 6 },
        promotion: null,
        castling: 'kingside',
      });
    }
    // Queenside
    if (castlingRights.whiteQueenside &&
        !board[7][3] && !board[7][2] && !board[7][1] &&
        board[7][0] && board[7][0].type === 'rook' && board[7][0].color === 'white') {
      moves.push({
        from: { row: 7, col: 4 },
        to: { row: 7, col: 2 },
        promotion: null,
        castling: 'queenside',
      });
    }
  }
  if (color === 'black' && row === 0 && col === 4) {
    // Kingside
    if (castlingRights.blackKingside &&
        !board[0][5] && !board[0][6] &&
        board[0][7] && board[0][7].type === 'rook' && board[0][7].color === 'black') {
      moves.push({
        from: { row: 0, col: 4 },
        to: { row: 0, col: 6 },
        promotion: null,
        castling: 'kingside',
      });
    }
    // Queenside
    if (castlingRights.blackQueenside &&
        !board[0][3] && !board[0][2] && !board[0][1] &&
        board[0][0] && board[0][0].type === 'rook' && board[0][0].color === 'black') {
      moves.push({
        from: { row: 0, col: 4 },
        to: { row: 0, col: 2 },
        promotion: null,
        castling: 'queenside',
      });
    }
  }
}

// ============================================================
// Check and Legal Move Filtering
// ============================================================

/**
 * Check if the given color's king is in check.
 */
export function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;

  const opp = opponentColor(color);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === opp) {
        // We need to check if this piece attacks the king.
        // We'll use a simplified attack check without generating all moves.
        if (attacks(board, r, c, king.row, king.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if piece at (row, col) attacks square (targetRow, targetCol).
 * This is used for check detection (no need to generate full moves).
 */
function attacks(board, row, col, targetRow, targetCol) {
  const piece = board[row][col];
  if (!piece) return false;

  const dr = targetRow - row;
  const dc = targetCol - col;
  const adr = Math.abs(dr);
  const adc = Math.abs(dc);

  switch (piece.type) {
    case 'pawn': {
      const dir = piece.color === 'white' ? -1 : 1;
      return dr === dir && adc === 1;
    }
    case 'knight':
      return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
    case 'bishop':
      if (adr !== adc || adr === 0) return false;
      return isPathClear(board, row, col, targetRow, targetCol);
    case 'rook':
      if (dr !== 0 && dc !== 0) return false;
      return isPathClear(board, row, col, targetRow, targetCol);
    case 'queen':
      if (dr === 0 || dc === 0 || adr === adc) {
        return isPathClear(board, row, col, targetRow, targetCol);
      }
      return false;
    case 'king':
      return adr <= 1 && adc <= 1;
    default:
      return false;
  }
}

function isPathClear(board, fromRow, fromCol, toRow, toCol) {
  const dr = Math.sign(toRow - fromRow);
  const dc = Math.sign(toCol - fromCol);
  let r = fromRow + dr;
  let c = fromCol + dc;
  while (r !== toRow || c !== toCol) {
    if (board[r][c]) return false;
    r += dr;
    c += dc;
  }
  return true;
}

/**
 * Check if a player is in checkmate.
 */
export function isCheckmate(board, color) {
  const hasLegal = hasLegalMove(board, color);
  return isInCheck(board, color) && !hasLegal;
}

/**
 * Check if a player is in stalemate.
 */
export function isStalemate(board, color) {
  const hasLegal = hasLegalMove(board, color);
  return !isInCheck(board, color) && !hasLegal;
}

function hasLegalMove(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const moves = getPseudoLegalMoves(board, r, c, getDefaultCastlingRights(board), null, []);
        for (const move of moves) {
          const newState = applyMove(board, move);
          if (!isInCheck(newState.board, color)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function getDefaultCastlingRights(board) {
  // Simplified - used in hasLegalMove for quick checking
  return {
    whiteKingside: true,
    whiteQueenside: true,
    blackKingside: true,
    blackQueenside: true,
  };
}

/**
 * Get all legal moves for a color, filtered for check safety.
 */
export function getLegalMovesForColor(board, color, castlingRights, enPassantTarget, moveHistory) {
  const allMoves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const moves = getPseudoLegalMoves(board, r, c, castlingRights, enPassantTarget, moveHistory);
        for (const move of moves) {
          // Filter: applying the move must not leave own king in check
          const newState = applyMove(board, move);
          if (newState && !isInCheck(newState.board, color)) {
            // For castling, also verify king doesn't pass through check
            if (move.castling) {
              // Already verified in the filter above, but also check the intermediate square
              if (move.castling === 'kingside') {
                const throughCol = color === 'white' ? 5 : 5;
                if (isSquareAttacked(board, move.from.row, throughCol, opponentColor(color))) continue;
              } else {
                const throughCol = color === 'white' ? 3 : 3;
                if (isSquareAttacked(board, move.from.row, throughCol, opponentColor(color))) continue;
              }
            }
            allMoves.push(move);
          }
        }
      }
    }
  }
  return allMoves;
}

/**
 * Check if a square is attacked by any piece of the given color.
 */
export function isSquareAttacked(board, row, col, byColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === byColor) {
        if (attacks(board, r, c, row, col)) {
          return true;
        }
      }
    }
  }
  return false;
}

// ============================================================
// Applying Moves
// ============================================================

/**
 * Apply a move to the board, returning a new state (or null if invalid).
 */
export function applyMove(board, move) {
  const newBoard = cloneBoard(board);
  const { from, to } = move;
  const piece = newBoard[from.row][from.col];
  if (!piece) return null;

  const captured = newBoard[to.row][to.col] || null;

  // Move the piece
  newBoard[to.row][to.col] = piece;
  newBoard[from.row][from.col] = null;

  // En passant capture
  if (move.enPassant) {
    // The captured pawn is on the same column as 'from', on the row of 'to'
    newBoard[from.row][to.col] = null;
  }

  // Castling - move the rook
  if (move.castling === 'kingside') {
    const row = from.row;
    newBoard[row][5] = newBoard[row][7];
    newBoard[row][7] = null;
  } else if (move.castling === 'queenside') {
    const row = from.row;
    newBoard[row][3] = newBoard[row][0];
    newBoard[row][0] = null;
  }

  // Promotion
  if (move.promotion) {
    newBoard[to.row][to.col] = { type: move.promotion, color: piece.color };
  }

  return { board: newBoard, captured: move.captured || captured || null };
}

/**
 * Make a move on the full game state, returning a new game state.
 */
export function makeMove(state, move) {
  const { board, turn, castlingRights, enPassantTarget, moveHistory, kings } = state;
  const { from, to } = move;
  const piece = board[from.row][from.col];
  if (!piece || piece.color !== turn) return null;

  const result = applyMove(board, move);
  if (!result) return null;

  const newBoard = result.board;
  const color = turn;
  const opp = opponentColor(color);

  // Check if the move left the current player in check (illegal)
  if (isInCheck(newBoard, color)) return null;

  // Update castling rights
  const newCastlingRights = { ...castlingRights };

  // King moved
  if (piece.type === 'king') {
    if (color === 'white') {
      newCastlingRights.whiteKingside = false;
      newCastlingRights.whiteQueenside = false;
    } else {
      newCastlingRights.blackKingside = false;
      newCastlingRights.blackQueenside = false;
    }
  }

  // Rook moved or captured
  if (from.row === 7 && from.col === 0) newCastlingRights.whiteQueenside = false;
  if (from.row === 7 && from.col === 7) newCastlingRights.whiteKingside = false;
  if (to.row === 7 && to.col === 0) newCastlingRights.whiteQueenside = false;
  if (to.row === 7 && to.col === 7) newCastlingRights.whiteKingside = false;
  if (from.row === 0 && from.col === 0) newCastlingRights.blackQueenside = false;
  if (from.row === 0 && from.col === 7) newCastlingRights.blackKingside = false;
  if (to.row === 0 && to.col === 0) newCastlingRights.blackQueenside = false;
  if (to.row === 0 && to.col === 7) newCastlingRights.blackKingside = false;

  // Update en passant target
  let newEnPassant = null;
  if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
    newEnPassant = { row: (from.row + to.row) / 2, col: from.col };
  }

  // Update king positions
  const newKings = { ...kings };
  if (piece.type === 'king') {
    newKings[color] = { row: to.row, col: to.col };
  }
  // If a king was captured (shouldn't happen in legal chess, but safety)
  if (result.captured && result.captured.type === 'king') {
    newKings[opp] = null;
  }

  const newMoveHistory = [...moveHistory, { ...move, piece: { ...piece }, captured: result.captured }];

  const newState = {
    board: newBoard,
    turn: opp,
    moveHistory: newMoveHistory,
    castlingRights: newCastlingRights,
    enPassantTarget: newEnPassant,
    kings: newKings,
    gameOver: false,
    winner: null,
    drawReason: null,
    lastMove: { from, to },
  };

  // Check game over conditions for the opponent (who is now to move)
  const check = isInCheck(newBoard, opp);
  const checkmate = check && !hasLegalMove(newBoard, opp);
  const stalemate = !check && !hasLegalMove(newBoard, opp);

  if (checkmate) {
    newState.gameOver = true;
    newState.winner = color; // The player who just moved wins
  } else if (stalemate) {
    newState.gameOver = true;
    newState.winner = null;
    newState.drawReason = 'stalemate';
  } else if (isInsufficientMaterial(newBoard)) {
    newState.gameOver = true;
    newState.winner = null;
    newState.drawReason = 'insufficient material';
  }

  return newState;
}

// ============================================================
// Draw Detection
// ============================================================

export function isInsufficientMaterial(board) {
  const pieces = { white: [], black: [] };
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) pieces[p.color].push({ ...p, row: r, col: c });
    }
  }

  const all = [...pieces.white, ...pieces.black];

  // King vs King
  if (all.length === 2) return true;

  // King + minor piece vs King
  if (all.length === 3) {
    const hasMinor = all.some(p => p.type === 'bishop' || p.type === 'knight');
    const hasKing = all.filter(p => p.type === 'king');
    if (hasMinor && hasKing.length === 2) return true;
  }

  // King + bishop vs King + bishop (same color)
  if (all.length === 4) {
    const bishops = all.filter(p => p.type === 'bishop');
    if (bishops.length === 2) {
      const colors = bishops.map(b => (b.row + b.col) % 2);
      if (colors[0] === colors[1]) return true;
    }
  }

  return false;
}

// ============================================================
// Helper: Get pseudo-legal moves for UI highlighting
// ============================================================

export function getLegalMovesForPiece(board, row, col, castlingRights, enPassantTarget, moveHistory) {
  const piece = board[row][col];
  if (!piece) return [];

  const pseudoMoves = getPseudoLegalMoves(board, row, col, castlingRights, enPassantTarget, moveHistory);
  return pseudoMoves.filter(move => {
    const result = applyMove(board, move);
    return result && !isInCheck(result.board, piece.color);
  });
}

// ============================================================
// Export for AI
// ============================================================

export { getPseudoLegalMoves, generateSlidingMoves, generateKnightMoves, generatePawnMoves, generateKingMoves };
