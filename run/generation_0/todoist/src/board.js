import {
  PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  WHITE, BLACK, BOARD_SIZE, FILES
} from './constants.js';

/**
 * Represents the chess board and provides move generation/validation.
 */
export class Board {
  constructor() {
    this.reset();
  }

  reset() {
    this.grid = this.createInitialPosition();
    this.turn = WHITE;
    this.moveCount = 1;
    this.halfMoveClock = 0;
    this.castlingRights = {
      [WHITE]: { kingside: true, queenside: true },
      [BLACK]: { kingside: true, queenside: true }
    };
    this.enPassantTarget = null; // { row, col } or null
    this.lastMove = null; // { from, to, piece, captured, castling, enPassant }
    this.positionHistory = [];
    this.gameOver = false;
    this.gameResult = null; // '1-0', '0-1', '1/2-1/2'
    this.inCheck = false;
  }

  createInitialPosition() {
    const grid = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

    const backRank = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];

    for (let col = 0; col < BOARD_SIZE; col++) {
      grid[0][col] = { type: backRank[col], color: BLACK };
      grid[1][col] = { type: PAWN, color: BLACK };
      grid[6][col] = { type: PAWN, color: WHITE };
      grid[7][col] = { type: backRank[col], color: WHITE };
    }

    return grid;
  }

  clone() {
    const board = new Board();
    board.grid = this.grid.map(row => row.map(cell => cell ? { ...cell } : null));
    board.turn = this.turn;
    board.moveCount = this.moveCount;
    board.halfMoveClock = this.halfMoveClock;
    board.castlingRights = {
      [WHITE]: { ...this.castlingRights[WHITE] },
      [BLACK]: { ...this.castlingRights[BLACK] }
    };
    board.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    board.lastMove = this.lastMove ? { ...this.lastMove } : null;
    board.positionHistory = [...this.positionHistory];
    board.gameOver = this.gameOver;
    board.gameResult = this.gameResult;
    board.inCheck = this.inCheck;
    return board;
  }

  getPiece(row, col) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return undefined;
    return this.grid[row][col];
  }

  setPiece(row, col, piece) {
    this.grid[row][col] = piece;
  }

  isInBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  isEmpty(row, col) {
    return this.isInBounds(row, col) && this.grid[row][col] === null;
  }

  isEnemy(row, col, color) {
    const piece = this.getPiece(row, col);
    return piece && piece.color !== color;
  }

  findKing(color) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = this.grid[r][c];
        if (p && p.type === KING && p.color === color) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  isUnderAttack(row, col, byColor) {
    // Check if any piece of `byColor` attacks (row, col)
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = this.grid[r][c];
        if (!piece || piece.color !== byColor) continue;
        const attacks = this.getPseudoLegalMoves(r, c, false);
        for (const attack of attacks) {
          if (attack.row === row && attack.col === col) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isInCheck(color) {
    const king = this.findKing(color);
    if (!king) return false;
    const enemyColor = color === WHITE ? BLACK : WHITE;
    return this.isUnderAttack(king.row, king.col, enemyColor);
  }

  // Get pseudo-legal moves (doesn't check if own king is in check after)
  getPseudoLegalMoves(row, col, checkKingSafety = false) {
    const piece = this.getPiece(row, col);
    if (!piece) return [];
    const moves = [];
    const { type, color } = piece;

    switch (type) {
      case PAWN:
        this.getPawnMoves(row, col, color, moves);
        break;
      case KNIGHT:
        this.getKnightMoves(row, col, color, moves);
        break;
      case BISHOP:
        this.getSlidingMoves(row, col, color, moves, [[1,1],[1,-1],[-1,1],[-1,-1]]);
        break;
      case ROOK:
        this.getSlidingMoves(row, col, color, moves, [[1,0],[-1,0],[0,1],[0,-1]]);
        break;
      case QUEEN:
        this.getSlidingMoves(row, col, color, moves, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
        break;
      case KING:
        this.getKingMoves(row, col, color, moves);
        break;
    }

    if (checkKingSafety) {
      return moves.filter(m => {
        // Simulate the move
        const boardCopy = this.clone();
        boardCopy.applyMove({ from: { row, col }, to: m }, true);
        return !boardCopy.isInCheck(color);
      });
    }

    return moves;
  }

  getPawnMoves(row, col, color, moves) {
    const dir = color === WHITE ? -1 : 1;
    const startRow = color === WHITE ? 6 : 1;
    const enemyColor = color === WHITE ? BLACK : WHITE;

    // Forward one
    const fwdRow = row + dir;
    if (this.isInBounds(fwdRow, col) && this.isEmpty(fwdRow, col)) {
      moves.push({ row: fwdRow, col });
      // Forward two from start
      const fwd2Row = row + 2 * dir;
      if (row === startRow && this.isEmpty(fwd2Row, col)) {
        moves.push({ row: fwd2Row, col, isDoublePawnPush: true });
      }
    }

    // Captures
    for (const dc of [-1, 1]) {
      const cCol = col + dc;
      if (!this.isInBounds(fwdRow, cCol)) continue;
      // Normal capture
      if (this.isEnemy(fwdRow, cCol, color)) {
        moves.push({ row: fwdRow, col: cCol });
      }
      // En passant
      if (this.enPassantTarget &&
          this.enPassantTarget.row === fwdRow &&
          this.enPassantTarget.col === cCol) {
        moves.push({ row: fwdRow, col: cCol, isEnPassant: true });
      }
    }
  }

  getKnightMoves(row, col, color, moves) {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (this.isInBounds(nr, nc) && (this.isEmpty(nr, nc) || this.isEnemy(nr, nc, color))) {
        moves.push({ row: nr, col: nc });
      }
    }
  }

  getSlidingMoves(row, col, color, moves, directions) {
    for (const [dr, dc] of directions) {
      let nr = row + dr;
      let nc = col + dc;
      while (this.isInBounds(nr, nc)) {
        if (this.isEmpty(nr, nc)) {
          moves.push({ row: nr, col: nc });
        } else {
          if (this.isEnemy(nr, nc, color)) {
            moves.push({ row: nr, col: nc });
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }

  getKingMoves(row, col, color, moves) {
    const offsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (this.isInBounds(nr, nc) && (this.isEmpty(nr, nc) || this.isEnemy(nr, nc, color))) {
        moves.push({ row: nr, col: nc });
      }
    }

    // Castling
    const enemyColor = color === WHITE ? BLACK : WHITE;
    if (this.isInCheck(color)) return; // Can't castle out of check

    const rowKing = row;
    // Kingside
    if (this.castlingRights[color].kingside) {
      const rookCol = 7;
      const rook = this.getPiece(rowKing, rookCol);
      if (rook && rook.type === ROOK && rook.color === color) {
        if (this.isEmpty(rowKing, 5) && this.isEmpty(rowKing, 6)) {
          // Check that king doesn't pass through check
          if (!this.isUnderAttack(rowKing, 4, enemyColor) &&
              !this.isUnderAttack(rowKing, 5, enemyColor) &&
              !this.isUnderAttack(rowKing, 6, enemyColor)) {
            moves.push({ row: rowKing, col: 6, isCastling: 'kingside' });
          }
        }
      }
    }
    // Queenside
    if (this.castlingRights[color].queenside) {
      const rookCol = 0;
      const rook = this.getPiece(rowKing, rookCol);
      if (rook && rook.type === ROOK && rook.color === color) {
        if (this.isEmpty(rowKing, 3) && this.isEmpty(rowKing, 2) && this.isEmpty(rowKing, 1)) {
          if (!this.isUnderAttack(rowKing, 4, enemyColor) &&
              !this.isUnderAttack(rowKing, 3, enemyColor) &&
              !this.isUnderAttack(rowKing, 2, enemyColor)) {
            moves.push({ row: rowKing, col: 2, isCastling: 'queenside' });
          }
        }
      }
    }
  }

  // Get all legal moves for a color
  getAllLegalMoves(color) {
    const moves = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = this.grid[r][c];
        if (piece && piece.color === color) {
          const pieceMoves = this.getPseudoLegalMoves(r, c, true);
          for (const target of pieceMoves) {
            moves.push({
              from: { row: r, col: c },
              to: target,
              piece
            });
          }
        }
      }
    }
    return moves;
  }

  // Apply a move to the board (mutates this board)
  applyMove(move, isSimulation = false) {
    const { from, to } = move;
    const piece = this.getPiece(from.row, from.col);
    if (!piece) return;

    const captured = this.getPiece(to.row, to.col);
    let isEnPassant = false;
    let isCastling = false;
    let castlingType = null;

    // Save state for undo
    const prevCastling = {
      [WHITE]: { ...this.castlingRights[WHITE] },
      [BLACK]: { ...this.castlingRights[BLACK] }
    };
    const prevEnPassant = this.enPassantTarget;
    const prevHalfMove = this.halfMoveClock;

    // En passant capture
    if (to.isEnPassant) {
      isEnPassant = true;
      const capturedPawnRow = from.row; // the captured pawn is on the same row as the moving pawn
      this.setPiece(capturedPawnRow, to.col, null);
    }

    // Castling
    if (to.isCastling) {
      isCastling = true;
      castlingType = to.isCastling;
      const row = from.row;
      if (to.isCastling === 'kingside') {
        // Move rook from h-file to f-file
        this.setPiece(row, 5, this.getPiece(row, 7));
        this.setPiece(row, 7, null);
      } else {
        // Move rook from a-file to d-file
        this.setPiece(row, 3, this.getPiece(row, 0));
        this.setPiece(row, 0, null);
      }
    }

    // Move the piece
    this.setPiece(to.row, to.col, piece);
    this.setPiece(from.row, from.col, null);

    // Pawn promotion
    let promotionPiece = null;
    if (piece.type === PAWN && (to.row === 0 || to.row === 7)) {
      promotionPiece = to.promotion || QUEEN; // default to queen
      this.setPiece(to.row, to.col, { type: promotionPiece, color: piece.color });
    }

    // Update en passant target
    this.enPassantTarget = null;
    if (to.isDoublePawnPush) {
      this.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
    }

    // Update castling rights
    if (piece.type === KING) {
      this.castlingRights[piece.color].kingside = false;
      this.castlingRights[piece.color].queenside = false;
    }
    if (piece.type === ROOK) {
      if (from.col === 0) this.castlingRights[piece.color].queenside = false;
      if (from.col === 7) this.castlingRights[piece.color].kingside = false;
    }
    // If a rook is captured
    if (captured && captured.type === ROOK) {
      if (to.col === 0) this.castlingRights[captured.color].queenside = false;
      if (to.col === 7) this.castlingRights[captured.color].kingside = false;
    }

    // Half-move clock
    if (piece.type === PAWN || captured) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }

    // Switch turn
    if (!isSimulation) {
      this.lastMove = {
        from: { ...from },
        to: { ...to },
        piece: { ...piece },
        captured: captured ? { ...captured } : null,
        isEnPassant,
        isCastling,
        castlingType,
        promotion: promotionPiece
      };

      // Store position for repetition detection
      this.positionHistory.push(this.getPositionKey());

      if (this.turn === BLACK) {
        this.moveCount++;
      }
    }

    this.turn = this.turn === WHITE ? BLACK : WHITE;
    this.inCheck = this.isInCheck(this.turn);

    return {
      captured,
      isEnPassant,
      isCastling,
      promotion: promotionPiece,
      prevCastling,
      prevEnPassant,
      prevHalfMove
    };
  }

  // Reverse a move (for undo/AI search)
  undoMove(move, undoInfo) {
    const { from, to } = move;
    const piece = this.getPiece(to.row, to.col);

    // Restore the moved piece
    this.setPiece(from.row, from.col, piece);
    this.setPiece(to.row, to.col, null);

    // Restore captured piece
    if (undoInfo.captured) {
      if (undoInfo.isEnPassant) {
        // En passant: captured pawn is on from.row, to.col
        this.setPiece(from.row, to.col, undoInfo.captured);
      } else {
        this.setPiece(to.row, to.col, undoInfo.captured);
      }
    }

    // Restore castling rook
    if (undoInfo.isCastling) {
      const row = from.row;
      if (move.to.isCastling === 'kingside') {
        this.setPiece(row, 7, this.getPiece(row, 5));
        this.setPiece(row, 5, null);
      } else {
        this.setPiece(row, 0, this.getPiece(row, 3));
        this.setPiece(row, 3, null);
      }
    }

    // Restore castling rights, en passant, half-move
    this.castlingRights = undoInfo.prevCastling;
    this.enPassantTarget = undoInfo.prevEnPassant;
    this.halfMoveClock = undoInfo.prevHalfMove;

    // Switch turn back
    this.turn = this.turn === WHITE ? BLACK : WHITE;
    this.inCheck = this.isInCheck(this.turn);
  }

  getPositionKey() {
    // Simple string representation for repetition detection
    let key = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = this.grid[r][c];
        if (!p) {
          key += '.';
        } else {
          key += p.color + p.type;
        }
      }
    }
    key += this.turn;
    key += this.castlingRights[WHITE].kingside ? 'K' : '';
    key += this.castlingRights[WHITE].queenside ? 'Q' : '';
    key += this.castlingRights[BLACK].kingside ? 'k' : '';
    key += this.castlingRights[BLACK].queenside ? 'q' : '';
    key += this.enPassantTarget ? `${this.enPassantTarget.row}${this.enPassantTarget.col}` : '-';
    return key;
  }

  isThreefoldRepetition() {
    const key = this.getPositionKey();
    let count = 0;
    for (const k of this.positionHistory) {
      if (k === key) count++;
    }
    return count >= 3;
  }

  isInsufficientMaterial() {
    const pieces = { w: [], b: [] };
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = this.grid[r][c];
        if (p) {
          pieces[p.color].push({ ...p, row: r, col: c });
        }
      }
    }

    const allPieces = [...pieces.w, ...pieces.b];

    // King vs King
    if (allPieces.length === 2) return true;

    // King + minor piece vs King
    if (allPieces.length === 3) {
      const minorPieces = allPieces.filter(p => p.type === BISHOP || p.type === KNIGHT);
      if (minorPieces.length === 1) return true;
    }

    // King + Bishop vs King + Bishop (same color bishops)
    if (allPieces.length === 4) {
      const bishops = allPieces.filter(p => p.type === BISHOP);
      if (bishops.length === 2) {
        // Check if both bishops are on the same color
        const b1Color = (bishops[0].row + bishops[0].col) % 2;
        const b2Color = (bishops[1].row + bishops[1].col) % 2;
        if (b1Color === b2Color) return true;
      }
    }

    return false;
  }

  getGameState() {
    if (this.gameOver) return this.gameResult;

    const legalMoves = this.getAllLegalMoves(this.turn);
    const inCheck = this.isInCheck(this.turn);

    if (legalMoves.length === 0) {
      if (inCheck) {
        // Checkmate
        this.gameOver = true;
        this.gameResult = this.turn === WHITE ? '0-1' : '1-0';
        return this.gameResult;
      } else {
        // Stalemate
        this.gameOver = true;
        this.gameResult = '1/2-1/2';
        return this.gameResult;
      }
    }

    // Fifty-move rule
    if (this.halfMoveClock >= 100) {
      this.gameOver = true;
      this.gameResult = '1/2-1/2';
      return this.gameResult;
    }

    // Threefold repetition
    if (this.isThreefoldRepetition()) {
      this.gameOver = true;
      this.gameResult = '1/2-1/2';
      return this.gameResult;
    }

    // Insufficient material
    if (this.isInsufficientMaterial()) {
      this.gameOver = true;
      this.gameResult = '1/2-1/2';
      return this.gameResult;
    }

    return null; // game ongoing
  }
}
