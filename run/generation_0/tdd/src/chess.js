/**
 * Chess Engine - Pure logic, no UI dependencies
 */

export class ChessEngine {
  constructor() {
    this.board = this.createInitialBoard();
    this.turn = 'white';
    this.moveHistory = [];
    this.castlingRights = {
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true }
    };
    this.enPassantTarget = null; // { row, col } or null
  }

  createInitialBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));

    const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

    // Black pieces (row 0)
    for (let c = 0; c < 8; c++) {
      board[0][c] = { type: backRank[c], color: 'black' };
    }
    // Black pawns (row 1)
    for (let c = 0; c < 8; c++) {
      board[1][c] = { type: 'pawn', color: 'black' };
    }
    // White pawns (row 6)
    for (let c = 0; c < 8; c++) {
      board[6][c] = { type: 'pawn', color: 'white' };
    }
    // White pieces (row 7)
    for (let c = 0; c < 8; c++) {
      board[7][c] = { type: backRank[c], color: 'white' };
    }

    return board;
  }

  getBoard() {
    return this.board;
  }

  getTurn() {
    return this.turn;
  }

  setTurn(color) {
    this.turn = color;
  }

  clearBoard() {
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
  }

  placePiece(pos, piece) {
    this.board[pos.row][pos.col] = piece;
  }

  getPiece(pos) {
    return this.board[pos.row][pos.col];
  }

  isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  isOpponentPiece(pos, color) {
    const piece = this.getPiece(pos);
    return piece !== null && piece.color !== color;
  }

  isOwnPiece(pos, color) {
    const piece = this.getPiece(pos);
    return piece !== null && piece.color === color;
  }

  getValidMoves(pos) {
    const piece = this.getPiece(pos);
    if (!piece) return [];
    if (piece.color !== this.turn) return [];

    const moves = this.getRawMoves(pos);
    // Filter out moves that would leave king in check
    return moves.filter(to => {
      const simBoard = this.simulateMove(pos, to);
      return !this.isInCheck(piece.color, simBoard);
    });
  }

  getRawMoves(pos) {
    const piece = this.getPiece(pos);
    if (!piece) return [];

    switch (piece.type) {
      case 'pawn': return this.getPawnMoves(pos);
      case 'rook': return this.getSlidingMoves(pos, [[0,1],[0,-1],[1,0],[-1,0]]);
      case 'knight': return this.getKnightMoves(pos);
      case 'bishop': return this.getSlidingMoves(pos, [[1,1],[1,-1],[-1,1],[-1,-1]]);
      case 'queen': return this.getSlidingMoves(pos, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);
      case 'king': return this.getKingMoves(pos);
      default: return [];
    }
  }

  getPawnMoves(pos) {
    const { row, col } = pos;
    const piece = this.getPiece(pos);
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;
    const moves = [];

    // Forward one square
    const forwardRow = row + direction;
    if (this.isInBounds(forwardRow, col) && !this.getPiece({ row: forwardRow, col })) {
      moves.push({ row: forwardRow, col });
      // Forward two squares from start
      const twoForwardRow = row + 2 * direction;
      if (row === startRow && !this.getPiece({ row: twoForwardRow, col })) {
        moves.push({ row: twoForwardRow, col });
      }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
      const captureCol = col + dc;
      if (this.isInBounds(forwardRow, captureCol)) {
        const target = this.getPiece({ row: forwardRow, col: captureCol });
        if (target && target.color !== piece.color) {
          moves.push({ row: forwardRow, col: captureCol });
        }
        // En passant
        if (this.enPassantTarget &&
            this.enPassantTarget.row === forwardRow &&
            this.enPassantTarget.col === captureCol) {
          moves.push({ row: forwardRow, col: captureCol });
        }
      }
    }

    return moves;
  }

  getKnightMoves(pos) {
    const { row, col } = pos;
    const piece = this.getPiece(pos);
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    const moves = [];
    for (const [dr, dc] of offsets) {
      const r = row + dr;
      const c = col + dc;
      if (this.isInBounds(r, c)) {
        const target = this.board[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ row: r, col: c });
        }
      }
    }
    return moves;
  }

  getSlidingMoves(pos, directions) {
    const { row, col } = pos;
    const piece = this.getPiece(pos);
    const moves = [];
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (this.isInBounds(r, c)) {
        const target = this.board[r][c];
        if (!target) {
          moves.push({ row: r, col: c });
        } else {
          if (target.color !== piece.color) {
            moves.push({ row: r, col: c });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return moves;
  }

  getKingMoves(pos) {
    const { row, col } = pos;
    const piece = this.getPiece(pos);
    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (this.isInBounds(r, c)) {
          const target = this.board[r][c];
          if (!target || target.color !== piece.color) {
            moves.push({ row: r, col: c });
          }
        }
      }
    }

    // Castling
    if (!this.isInCheck(piece.color)) {
      const row = piece.color === 'white' ? 7 : 0;
      const kingPos = { row, col: 4 };
      const king = this.board[row][4];
      if (king && king.type === 'king' && king.color === piece.color) {
        // King-side castling
        if (this.castlingRights[piece.color].kingSide) {
          if (!this.board[row][5] && !this.board[row][6] && this.board[row][7] &&
              this.board[row][7].type === 'rook' && this.board[row][7].color === piece.color) {
            // Check that king doesn't pass through check
            if (!this.isSquareAttacked({ row, col: 5 }, piece.color) &&
                !this.isSquareAttacked({ row, col: 6 }, piece.color)) {
              moves.push({ row, col: 6 });
            }
          }
        }
        // Queen-side castling
        if (this.castlingRights[piece.color].queenSide) {
          if (!this.board[row][3] && !this.board[row][2] && !this.board[row][1] &&
              this.board[row][0] && this.board[row][0].type === 'rook' && this.board[row][0].color === piece.color) {
            if (!this.isSquareAttacked({ row, col: 3 }, piece.color) &&
                !this.isSquareAttacked({ row, col: 2 }, piece.color)) {
              moves.push({ row, col: 2 });
            }
          }
        }
      }
    }

    return moves;
  }

  isSquareAttacked(pos, defendingColor) {
    const attackingColor = defendingColor === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color === attackingColor) {
          const attacks = this.getAttackSquares({ row: r, col: c });
          if (attacks.some(a => a.row === pos.row && a.col === pos.col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getAttackSquares(pos) {
    const piece = this.getPiece(pos);
    if (!piece) return [];

    switch (piece.type) {
      case 'pawn': return this.getPawnAttacks(pos);
      case 'rook': return this.getSlidingMoves(pos, [[0,1],[0,-1],[1,0],[-1,0]]);
      case 'knight': return this.getKnightMoves(pos);
      case 'bishop': return this.getSlidingMoves(pos, [[1,1],[1,-1],[-1,1],[-1,-1]]);
      case 'queen': return this.getSlidingMoves(pos, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]);
      case 'king': return this.getKingMoves(pos);
      default: return [];
    }
  }

  getPawnAttacks(pos) {
    const { row, col } = pos;
    const piece = this.getPiece(pos);
    const direction = piece.color === 'white' ? -1 : 1;
    const attacks = [];
    for (const dc of [-1, 1]) {
      const r = row + direction;
      const c = col + dc;
      if (this.isInBounds(r, c)) {
        attacks.push({ row: r, col: c });
      }
    }
    return attacks;
  }

  isInCheck(color, board) {
    const boardToUse = board || this.board;
    // Find king position
    let kingPos = null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = boardToUse[r][c];
        if (p && p.type === 'king' && p.color === color) {
          kingPos = { row: r, col: c };
          break;
        }
      }
      if (kingPos) break;
    }
    if (!kingPos) return true; // king captured (shouldn't happen in valid game)

    const opponentColor = color === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = boardToUse[r][c];
        if (p && p.color === opponentColor) {
          const attacks = this.getAttackSquaresForBoard({ row: r, col: c }, boardToUse);
          if (attacks.some(a => a.row === kingPos.row && a.col === kingPos.col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getAttackSquaresForBoard(pos, board) {
    const piece = board[pos.row][pos.col];
    if (!piece) return [];

    switch (piece.type) {
      case 'pawn': return this.getPawnAttacksForBoard(pos, board);
      case 'rook': return this.getSlidingMovesForBoard(pos, [[0,1],[0,-1],[1,0],[-1,0]], board);
      case 'knight': return this.getKnightMovesForBoard(pos, board);
      case 'bishop': return this.getSlidingMovesForBoard(pos, [[1,1],[1,-1],[-1,1],[-1,-1]], board);
      case 'queen': return this.getSlidingMovesForBoard(pos, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]], board);
      case 'king': return this.getKingMovesForBoard(pos, board);
      default: return [];
    }
  }

  getPawnAttacksForBoard(pos, board) {
    const { row, col } = pos;
    const piece = board[row][col];
    const direction = piece.color === 'white' ? -1 : 1;
    const attacks = [];
    for (const dc of [-1, 1]) {
      const r = row + direction;
      const c = col + dc;
      if (this.isInBounds(r, c)) {
        attacks.push({ row: r, col: c });
      }
    }
    return attacks;
  }

  getSlidingMovesForBoard(pos, directions, board) {
    const { row, col } = pos;
    const piece = board[row][col];
    const moves = [];
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (this.isInBounds(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push({ row: r, col: c });
        } else {
          if (target.color !== piece.color) {
            moves.push({ row: r, col: c });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return moves;
  }

  getKnightMovesForBoard(pos, board) {
    const { row, col } = pos;
    const piece = board[row][col];
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    const moves = [];
    for (const [dr, dc] of offsets) {
      const r = row + dr;
      const c = col + dc;
      if (this.isInBounds(r, c)) {
        const target = board[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ row: r, col: c });
        }
      }
    }
    return moves;
  }

  getKingMovesForBoard(pos, board) {
    const { row, col } = pos;
    const piece = board[row][col];
    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (this.isInBounds(r, c)) {
          const target = board[r][c];
          if (!target || target.color !== piece.color) {
            moves.push({ row: r, col: c });
          }
        }
      }
    }
    return moves;
  }

  simulateMove(from, to) {
    const newBoard = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
    newBoard[to.row][to.col] = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = null;

    // Handle en passant capture
    const piece = this.board[from.row][from.col];
    if (piece && piece.type === 'pawn') {
      if (this.enPassantTarget &&
          this.enPassantTarget.row === to.row &&
          this.enPassantTarget.col === to.col) {
        const capturedPawnRow = from.row;
        newBoard[capturedPawnRow][to.col] = null;
      }
    }

    return newBoard;
  }

  makeMove(move) {
    const { from, to, promotion } = move;
    const piece = this.getPiece(from);

    if (!piece) throw new Error('No piece at source square');
    if (piece.color !== this.turn) throw new Error('Not your turn');
    if (piece.color !== this.turn) throw new Error('Cannot move opponent piece');

    // Check if move is valid
    const validMoves = this.getValidMoves(from);
    const isValid = validMoves.some(m => m.row === to.row && m.col === to.col);
    if (!isValid) throw new Error('Invalid move');

    // Store en passant target before making move
    let newEnPassantTarget = null;
    if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
      newEnPassantTarget = {
        row: (from.row + to.row) / 2,
        col: from.col
      };
    }

    // Track rooks for castling rights
    if (piece.type === 'king') {
      this.castlingRights[piece.color].kingSide = false;
      this.castlingRights[piece.color].queenSide = false;
    }
    if (piece.type === 'rook') {
      const side = from.col === 0 ? 'queenSide' : 'kingSide';
      this.castlingRights[piece.color][side] = false;
    }

    // Handle castling - move rook
    if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
      const row = from.row;
      if (to.col === 6) {
        // King-side: rook from h to f
        this.board[row][5] = this.board[row][7];
        this.board[row][7] = null;
      } else if (to.col === 2) {
        // Queen-side: rook from a to d
        this.board[row][3] = this.board[row][0];
        this.board[row][0] = null;
      }
    }

    // Handle en passant capture
    if (piece.type === 'pawn' && this.enPassantTarget &&
        to.row === this.enPassantTarget.row && to.col === this.enPassantTarget.col) {
      this.board[from.row][to.col] = null;
    }

    // Execute the move
    this.board[to.row][to.col] = piece;
    this.board[from.row][from.col] = null;

    // Handle pawn promotion
    if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
      const promoType = promotion || 'queen'; // default to queen
      this.board[to.row][to.col] = { type: promoType, color: piece.color };
    }

    // Update en passant target
    this.enPassantTarget = newEnPassantTarget;

    // Record move
    this.moveHistory.push({
      from, to,
      piece: { ...piece },
      captured: this.getPiece(to), // will be null since we already moved
      enPassant: newEnPassantTarget,
      castlingRights: { ...this.castlingRights }
    });

    // Switch turn
    this.turn = this.turn === 'white' ? 'black' : 'white';
  }

  isCheckmate() {
    const color = this.turn;
    return this.isInCheck(color) && this.hasNoValidMoves(color);
  }

  isStalemate() {
    const color = this.turn;
    return !this.isInCheck(color) && this.hasNoValidMoves(color);
  }

  hasNoValidMoves(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color === color) {
          const moves = this.getValidMoves({ row: r, col: c });
          if (moves.length > 0) return false;
        }
      }
    }
    return true;
  }

  isInsufficientMaterial() {
    const pieces = { white: [], black: [] };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p) {
          pieces[p.color].push(p);
        }
      }
    }

    const allPieces = [...pieces.white, ...pieces.black];
    if (allPieces.length === 2) return true; // Only two kings

    // King vs king + bishop
    // King vs king + knight
    // King + bishop vs king + bishop (same color)
    const nonKingPieces = allPieces.filter(p => p.type !== 'king');
    if (nonKingPieces.length === 0) return true;
    if (nonKingPieces.length === 1 && (nonKingPieces[0].type === 'bishop' || nonKingPieces[0].type === 'knight')) {
      return true;
    }
    // King + bishop vs king + bishop, both bishops on same color
    if (nonKingPieces.length === 2 &&
        nonKingPieces[0].type === 'bishop' && nonKingPieces[1].type === 'bishop' &&
        nonKingPieces[0].color !== nonKingPieces[1].color) {
      // Check if both bishops are on same colored squares
      const pos1 = this.findPiece(nonKingPieces[0]);
      const pos2 = this.findPiece(nonKingPieces[1]);
      if (pos1 && pos2) {
        const color1 = (pos1.row + pos1.col) % 2;
        const color2 = (pos2.row + pos2.col) % 2;
        if (color1 === color2) return true;
      }
    }

    return false;
  }

  findPiece(targetPiece) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p === targetPiece) return { row: r, col: c };
      }
    }
    return null;
  }

  getGameState() {
    if (this.isCheckmate()) return { state: 'checkmate', winner: this.turn === 'white' ? 'black' : 'white' };
    if (this.isStalemate()) return { state: 'stalemate' };
    if (this.isInsufficientMaterial()) return { state: 'draw', reason: 'insufficient material' };
    if (this.isInCheck(this.turn)) return { state: 'check', turn: this.turn };
    return { state: 'playing', turn: this.turn };
  }

  getAllValidMoves(color) {
    const moves = [];
    const c = color || this.turn;
    for (let r = 0; r < 8; r++) {
      for (let c2 = 0; c2 < 8; c2++) {
        const piece = this.board[r][c2];
        if (piece && piece.color === c) {
          const pieceMoves = this.getValidMoves({ row: r, col: c2 });
          pieceMoves.forEach(to => {
            moves.push({ from: { row: r, col: c2 }, to });
          });
        }
      }
    }
    return moves;
  }

  clone() {
    const cloned = new ChessEngine();
    cloned.board = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
    cloned.turn = this.turn;
    cloned.moveHistory = [...this.moveHistory];
    cloned.castlingRights = {
      white: { ...this.castlingRights.white },
      black: { ...this.castlingRights.black }
    };
    cloned.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    return cloned;
  }
}
