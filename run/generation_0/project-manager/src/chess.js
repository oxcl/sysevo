/**
 * Chess Engine
 * Vanilla JavaScript implementation of standard chess rules.
 */

// ── Constants ──

export const PIECE = {
  KING: 'k',
  QUEEN: 'q',
  ROOK: 'r',
  BISHOP: 'b',
  KNIGHT: 'n',
  PAWN: 'p'
};

export const COLOR = {
  WHITE: 'w',
  BLACK: 'b'
};

export const PIECE_SYMBOLS = {
  'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
  'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
};

export function getSymbol(piece) {
  if (!piece) return '';
  return PIECE_SYMBOLS[piece.color + piece.type] || '';
}

export function opponentColor(color) {
  return color === COLOR.WHITE ? COLOR.BLACK : COLOR.WHITE;
}

// ── Board Creation ──

export function createInitialBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRank = [PIECE.ROOK, PIECE.KNIGHT, PIECE.BISHOP, PIECE.QUEEN,
                    PIECE.KING, PIECE.BISHOP, PIECE.KNIGHT, PIECE.ROOK];

  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRank[col], color: COLOR.BLACK };
    board[1][col] = { type: PIECE.PAWN, color: COLOR.BLACK };
    board[6][col] = { type: PIECE.PAWN, color: COLOR.WHITE };
    board[7][col] = { type: backRank[col], color: COLOR.WHITE };
  }

  return board;
}

export function cloneBoard(board) {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

// ── In-Bounds Check ──

function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// ── Direction Helpers ──

const DIR = {
  N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1],
  NE: [-1, 1], NW: [-1, -1], SE: [1, 1], SW: [1, -1]
};

function addDirection(row, col, dir) {
  return [row + dir[0], col + dir[1]];
}

// ── Generate Pseudo-Legal Moves (no check validation) ──

export function getPseudoLegalMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];

  switch (piece.type) {
    case PIECE.PAWN: return getPawnMoves(board, row, col, piece.color);
    case PIECE.KNIGHT: return getKnightMoves(board, row, col, piece.color);
    case PIECE.BISHOP: return getSlidingMoves(board, row, col, piece.color, [DIR.NE, DIR.NW, DIR.SE, DIR.SW]);
    case PIECE.ROOK: return getSlidingMoves(board, row, col, piece.color, [DIR.N, DIR.S, DIR.E, DIR.W]);
    case PIECE.QUEEN: return getSlidingMoves(board, row, col, piece.color, [DIR.N, DIR.S, DIR.E, DIR.W, DIR.NE, DIR.NW, DIR.SE, DIR.SW]);
    case PIECE.KING: return getKingMoves(board, row, col, piece.color);
    default: return [];
  }
}

// ── Pawn Moves ──

function getPawnMoves(board, row, col, color) {
  const moves = [];
  const forward = color === COLOR.WHITE ? -1 : 1;
  const startRow = color === COLOR.WHITE ? 6 : 1;
  const promoRow = color === COLOR.WHITE ? 0 : 7;

  // Forward one
  const [nr] = addDirection(row, col, [forward, 0]);
  if (inBounds(nr, col) && !board[nr][col]) {
    moves.push({ row: nr, col });
    // Forward two from start
    const [nr2] = addDirection(nr, col, [forward, 0]);
    if (row === startRow && !board[nr2][col]) {
      moves.push({ row: nr2, col });
    }
  }

  // Captures
  for (const dc of [-1, 1]) {
    const [cr, cc] = addDirection(row, col, [forward, dc]);
    if (inBounds(cr, cc)) {
      const target = board[cr][cc];
      if (target && target.color !== color) {
        moves.push({ row: cr, col: cc });
      }
    }
  }

  return moves;
}

// ── Knight Moves ──

function getKnightMoves(board, row, col, color) {
  const moves = [];
  const offsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];
  for (const [dr, dc] of offsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc)) {
      const target = board[nr][nc];
      if (!target || target.color !== color) {
        moves.push({ row: nr, col: nc });
      }
    }
  }
  return moves;
}

// ── Sliding Moves (Bishop, Rook, Queen) ──

function getSlidingMoves(board, row, col, color, directions) {
  const moves = [];
  for (const dir of directions) {
    let [cr, cc] = [row + dir[0], col + dir[1]];
    while (inBounds(cr, cc)) {
      const target = board[cr][cc];
      if (!target) {
        moves.push({ row: cr, col: cc });
      } else {
        if (target.color !== color) {
          moves.push({ row: cr, col: cc });
        }
        break;
      }
      cr += dir[0];
      cc += dir[1];
    }
  }
  return moves;
}

// ── King Moves ──

function getKingMoves(board, row, col, color) {
  const moves = [];
  for (const dir of Object.values(DIR)) {
    const [nr, nc] = addDirection(row, col, dir);
    if (inBounds(nr, nc)) {
      const target = board[nr][nc];
      if (!target || target.color !== color) {
        moves.push({ row: nr, col: nc });
      }
    }
  }
  return moves;
}

// ── Check Detection ──

/**
 * Find the king position for a given color.
 */
export function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === PIECE.KING && p.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * Check if the given color's king is in check.
 */
export function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return true; // king captured (shouldn't happen in legal play)

  const enemyColor = opponentColor(color);

  // Check if any enemy piece attacks the king's square
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === enemyColor) {
        const moves = getPseudoLegalMoves(board, r, c);
        for (const m of moves) {
          if (m.row === king.row && m.col === king.col) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Check if a given square is under attack by the enemy color.
 */
export function isSquareAttacked(board, row, col, byColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === byColor) {
        const moves = getPseudoLegalMoves(board, r, c);
        for (const m of moves) {
          if (m.row === row && m.col === col) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Get all legal moves for a piece at (row, col).
 * Filters pseudo-legal moves by removing those that leave own king in check.
 */
export function getLegalMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];

  const pseudo = getPseudoLegalMoves(board, row, col);
  const legal = [];

  for (const move of pseudo) {
    // Try the move on a cloned board
    const newBoard = cloneBoard(board);
    newBoard[move.row][move.col] = newBoard[row][col];
    newBoard[row][col] = null;

    // En passant capture - remove captured pawn
    // (handled in special moves but for basic moves this is fine)

    if (!isInCheck(newBoard, piece.color)) {
      legal.push(move);
    }
  }

  return legal;
}

/**
 * Get all legal moves for a given color.
 */
export function getAllLegalMoves(board, color) {
  const allMoves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const moves = getLegalMoves(board, r, c);
        for (const m of moves) {
          allMoves.push({ from: { row: r, col: c }, to: m });
        }
      }
    }
  }
  return allMoves;
}

// ── Simple Debug Print ──

export function printBoard(board) {
  const symbols = { 'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
                    'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟' };
  console.log('  a b c d e f g h');
  for (let r = 0; r < 8; r++) {
    let line = (8 - r) + ' ';
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      line += (p ? symbols[p.color + p.type] || '?' : '·') + ' ';
    }
    console.log(line);
  }
  console.log('  a b c d e f g h');
}
