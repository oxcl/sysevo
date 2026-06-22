/**
 * Chess Engine Module
 * Implements full standard chess rules with efficient board representation
 * @module ChessEngine
 */

/** Piece types enum */
const PieceType = Object.freeze({
  PAWN: 'p',
  KNIGHT: 'n',
  BISHOP: 'b',
  ROOK: 'r',
  QUEEN: 'q',
  KING: 'k'
});

/** Player colors enum */
const Color = Object.freeze({
  WHITE: 'w',
  BLACK: 'b'
});

/** Chess game state tracker */
export class ChessEngine {
  constructor() {
    this.board = this.initializeBoard();
    this.currentTurn = Color.WHITE;
    this.castlingRights = this.initializeCastlingRights();
    this.enPassantTarget = null;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.moveHistory = [];
    this.isGameOver = false;
    this.gameResult = null;
  }

  initializeBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const backRankPieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    
    for (let col = 0; col < 8; col++) {
      board[0][col] = { type: backRankPieces[col], color: Color.BLACK };
      board[1][col] = { type: PieceType.PAWN, color: Color.BLACK };
      board[6][col] = { type: PieceType.PAWN, color: Color.WHITE };
      board[7][col] = { type: backRankPieces[col], color: Color.WHITE };
    }
    
    return board;
  }

  initializeCastlingRights() {
    return {
      [Color.WHITE]: { kingSide: true, queenSide: true },
      [Color.BLACK]: { kingSide: true, queenSide: true }
    };
  }

  getPieceAt(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.board[row][col];
  }

  locateKing(color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === PieceType.KING && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  isSquareUnderAttack(row, col, attackerColor) {
    const slidingDirections = [
      { rowDelta: -1, colDelta: 0 },
      { rowDelta: 1, colDelta: 0 },
      { rowDelta: 0, colDelta: -1 },
      { rowDelta: 0, colDelta: 1 },
      { rowDelta: -1, colDelta: -1 },
      { rowDelta: -1, colDelta: 1 },
      { rowDelta: 1, colDelta: -1 },
      { rowDelta: 1, colDelta: 1 }
    ];

    for (const { rowDelta, colDelta } of slidingDirections) {
      const piece = this.getPieceAt(row + rowDelta, col + colDelta);
      if (piece && piece.color === attackerColor) {
        if (piece.type === PieceType.QUEEN) return true;
        if (piece.type === PieceType.ROOK && (rowDelta === 0 || colDelta === 0)) return true;
        if (piece.type === PieceType.BISHOP && rowDelta !== 0 && colDelta !== 0) return true;
      }
    }

    const knightOffsets = [
      { rowDelta: -2, colDelta: -1 }, { rowDelta: -2, colDelta: 1 },
      { rowDelta: -1, colDelta: -2 }, { rowDelta: -1, colDelta: 2 },
      { rowDelta: 1, colDelta: -2 }, { rowDelta: 1, colDelta: 2 },
      { rowDelta: 2, colDelta: -1 }, { rowDelta: 2, colDelta: 1 }
    ];
    
    for (const { rowDelta, colDelta } of knightOffsets) {
      const piece = this.getPieceAt(row + rowDelta, col + colDelta);
      if (piece && piece.color === attackerColor && piece.type === PieceType.KNIGHT) return true;
    }

    const pawnDirection = attackerColor === Color.WHITE ? 1 : -1;
    for (const colOffset of [-1, 1]) {
      const piece = this.getPieceAt(row + pawnDirection, col + colOffset);
      if (piece && piece.color === attackerColor && piece.type === PieceType.PAWN) return true;
    }

    for (const { rowDelta, colDelta } of slidingDirections) {
      const piece = this.getPieceAt(row + rowDelta, col + colDelta);
      if (piece && piece.color === attackerColor && piece.type === PieceType.KING) return true;
    }

    return false;
  }

  isKingInCheck(color) {
    const kingPosition = this.locateKing(color);
    if (!kingPosition) return false;
    const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
    return this.isSquareUnderAttack(kingPosition.row, kingPosition.col, opponentColor);
  }

  generatePseudoLegalMoves(row, col) {
    const piece = this.getPieceAt(row, col);
    if (!piece) return [];
    
    const moves = [];
    const opponentColor = piece.color === Color.WHITE ? Color.BLACK : Color.WHITE;

    const addValidMove = (toRow, toCol, special = null) => {
      const targetPiece = this.getPieceAt(toRow, toCol);
      if (!targetPiece || targetPiece.color === opponentColor) {
        moves.push({
          from: { row, col },
          to: { row: toRow, col: toCol },
          piece,
          special
        });
      }
    };

    const addSlidingMoves = (rowDelta, colDelta) => {
      for (let distance = 1; distance < 8; distance++) {
        const targetRow = row + rowDelta * distance;
        const targetCol = col + colDelta * distance;
        const targetPiece = this.getPieceAt(targetRow, targetCol);
        
        if (!targetPiece) {
          moves.push({
            from: { row, col },
            to: { row: targetRow, col: targetCol },
            piece
          });
        } else {
          if (targetPiece.color === opponentColor) {
            moves.push({
              from: { row, col },
              to: { row: targetRow, col: targetCol },
              piece
            });
          }
          break;
        }
      }
    };

    switch (piece.type) {
      case PieceType.PAWN:
        this.generatePawnMoves(row, col, piece, moves, opponentColor);
        break;
      case PieceType.KNIGHT:
        this.generateKnightMoves(row, col, addValidMove);
        break;
      case PieceType.BISHOP:
        for (const { rowDelta, colDelta } of [
          { rowDelta: -1, colDelta: -1 }, { rowDelta: -1, colDelta: 1 },
          { rowDelta: 1, colDelta: -1 }, { rowDelta: 1, colDelta: 1 }
        ]) {
          addSlidingMoves(rowDelta, colDelta);
        }
        break;
      case PieceType.ROOK:
        for (const { rowDelta, colDelta } of [
          { rowDelta: -1, colDelta: 0 }, { rowDelta: 1, colDelta: 0 },
          { rowDelta: 0, colDelta: -1 }, { rowDelta: 0, colDelta: 1 }
        ]) {
          addSlidingMoves(rowDelta, colDelta);
        }
        break;
      case PieceType.QUEEN:
        for (const { rowDelta, colDelta } of [
          { rowDelta: -1, colDelta: -1 }, { rowDelta: -1, colDelta: 0 },
          { rowDelta: -1, colDelta: 1 }, { rowDelta: 0, colDelta: -1 },
          { rowDelta: 0, colDelta: 1 }, { rowDelta: 1, colDelta: -1 },
          { rowDelta: 1, colDelta: 0 }, { rowDelta: 1, colDelta: 1 }
        ]) {
          addSlidingMoves(rowDelta, colDelta);
        }
        break;
      case PieceType.KING:
        this.generateKingMoves(row, col, piece, moves, opponentColor);
        break;
    }

    return moves;
  }

  generatePawnMoves(row, col, piece, moves, opponentColor) {
    const direction = piece.color === Color.WHITE ? -1 : 1;
    const startRow = piece.color === Color.WHITE ? 6 : 1;
    const promotionRow = piece.color === Color.WHITE ? 0 : 7;

    if (!this.getPieceAt(row + direction, col)) {
      if (row + direction === promotionRow) {
        for (const promotionPiece of ['q', 'r', 'b', 'n']) {
          moves.push({
            from: { row, col },
            to: { row: row + direction, col },
            piece,
            special: 'promotion',
            promotion: promotionPiece
          });
        }
      } else {
        moves.push({
          from: { row, col },
          to: { row: row + direction, col },
          piece
        });
      }
      
      if (row === startRow && !this.getPieceAt(row + 2 * direction, col)) {
        moves.push({
          from: { row, col },
          to: { row: row + 2 * direction, col },
          piece,
          special: 'doublePawnPush'
        });
      }
    }

    for (const colOffset of [-1, 1]) {
      const targetPiece = this.getPieceAt(row + direction, col + colOffset);
      if (targetPiece && targetPiece.color === opponentColor) {
        if (row + direction === promotionRow) {
          for (const promotionPiece of ['q', 'r', 'b', 'n']) {
            moves.push({
              from: { row, col },
              to: { row: row + direction, col: col + colOffset },
              piece,
              special: 'promotion',
              promotion: promotionPiece
            });
          }
        } else {
          moves.push({
            from: { row, col },
            to: { row: row + direction, col: col + colOffset },
            piece
          });
        }
      }
      
      if (this.enPassantTarget && 
          this.enPassantTarget.row === row + direction && 
          this.enPassantTarget.col === col + colOffset) {
        moves.push({
          from: { row, col },
          to: { row: row + direction, col: col + colOffset },
          piece,
          special: 'enPassant'
        });
      }
    }
  }

  generateKnightMoves(row, col, addValidMove) {
    const knightOffsets = [
      { rowDelta: -2, colDelta: -1 }, { rowDelta: -2, colDelta: 1 },
      { rowDelta: -1, colDelta: -2 }, { rowDelta: -1, colDelta: 2 },
      { rowDelta: 1, colDelta: -2 }, { rowDelta: 1, colDelta: 2 },
      { rowDelta: 2, colDelta: -1 }, { rowDelta: 2, colDelta: 1 }
    ];
    
    for (const { rowDelta, colDelta } of knightOffsets) {
      addValidMove(row + rowDelta, col + colDelta);
    }
  }

  generateKingMoves(row, col, piece, moves, opponentColor) {
    const kingDirections = [
      { rowDelta: -1, colDelta: -1 }, { rowDelta: -1, colDelta: 0 },
      { rowDelta: -1, colDelta: 1 }, { rowDelta: 0, colDelta: -1 },
      { rowDelta: 0, colDelta: 1 }, { rowDelta: 1, colDelta: -1 },
      { rowDelta: 1, colDelta: 0 }, { rowDelta: 1, colDelta: 1 }
    ];

    for (const { rowDelta, colDelta } of kingDirections) {
      const targetPiece = this.getPieceAt(row + rowDelta, col + colDelta);
      if (!targetPiece || targetPiece.color === opponentColor) {
        moves.push({
          from: { row, col },
          to: { row: row + rowDelta, col: col + colDelta },
          piece
        });
      }
    }

    if (this.castlingRights[piece.color].kingSide && !this.isKingInCheck(piece.color)) {
      if (!this.getPieceAt(row, col + 1) && !this.getPieceAt(row, col + 2)) {
        if (!this.isSquareUnderAttack(row, col + 1, opponentColor) && 
            !this.isSquareUnderAttack(row, col + 2, opponentColor)) {
          moves.push({
            from: { row, col },
            to: { row, col: col + 2 },
            piece,
            special: 'castleKingSide'
          });
        }
      }
    }

    if (this.castlingRights[piece.color].queenSide && !this.isKingInCheck(piece.color)) {
      if (!this.getPieceAt(row, col - 1) && !this.getPieceAt(row, col - 2) && !this.getPieceAt(row, col - 3)) {
        if (!this.isSquareUnderAttack(row, col - 1, opponentColor) && 
            !this.isSquareUnderAttack(row, col - 2, opponentColor)) {
          moves.push({
            from: { row, col },
            to: { row, col: col - 2 },
            piece,
            special: 'castleQueenSide'
          });
        }
      }
    }
  }

  generateAllLegalMoves(color) {
    const legalMoves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.getPieceAt(row, col);
        if (piece && piece.color === color) {
          for (const move of this.generatePseudoLegalMoves(row, col)) {
            if (this.isMoveLegal(move)) {
              legalMoves.push(move);
            }
          }
        }
      }
    }
    return legalMoves;
  }

  isMoveLegal(move) {
    const savedState = this.saveState();
    this.executeMoveOnBoard(move);
    const inCheck = this.isKingInCheck(move.piece.color);
    this.restoreState(savedState);
    return !inCheck;
  }

  executeMoveOnBoard(move) {
    const { from, to, special } = move;
    const movingPiece = this.board[from.row][from.col];

    if (special === 'enPassant') {
      this.board[from.row][to.col] = null;
    }

    this.board[to.row][to.col] = movingPiece;
    this.board[from.row][from.col] = null;

    if (special === 'promotion') {
      this.board[to.row][to.col] = { type: move.promotion, color: movingPiece.color };
    }

    if (special === 'castleKingSide') {
      this.board[from.row][from.col + 1] = this.board[from.row][from.col + 3];
      this.board[from.row][from.col + 3] = null;
    }
    
    if (special === 'castleQueenSide') {
      this.board[from.row][from.col - 1] = this.board[from.row][from.col - 4];
      this.board[from.row][from.col - 4] = null;
    }
  }

  saveState() {
    return {
      board: this.board.map(row => row.map(cell => cell ? { ...cell } : null)),
      castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
      enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
      halfMoveClock: this.halfMoveClock,
      fullMoveNumber: this.fullMoveNumber
    };
  }

  restoreState(state) {
    this.board = state.board;
    this.castlingRights = state.castlingRights;
    this.enPassantTarget = state.enPassantTarget;
    this.halfMoveClock = state.halfMoveClock;
    this.fullMoveNumber = state.fullMoveNumber;
  }

  makeMove(move) {
    if (this.isGameOver || move.piece.color !== this.currentTurn) return false;

    const savedState = this.saveState();
    this.executeMoveOnBoard(move);

    this.updateMoveCounters(move);
    this.updateCastlingRights(move);
    this.updateEnPassantTarget(move);

    this.currentTurn = this.currentTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
    if (this.currentTurn === Color.WHITE) this.fullMoveNumber++;

    this.moveHistory.push({ move, savedState });
    this.checkGameEnd();

    return true;
  }

  updateMoveCounters(move) {
    if (move.piece.type === PieceType.PAWN || move.special === 'enPassant') {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }
  }

  updateCastlingRights(move) {
    if (move.piece.type === PieceType.KING) {
      this.castlingRights[move.piece.color].kingSide = false;
      this.castlingRights[move.piece.color].queenSide = false;
    }
    
    if (move.piece.type === PieceType.ROOK) {
      if (move.from.col === 0) this.castlingRights[move.piece.color].queenSide = false;
      if (move.from.col === 7) this.castlingRights[move.piece.color].kingSide = false;
    }
  }

  updateEnPassantTarget(move) {
    this.enPassantTarget = move.special === 'doublePawnPush' 
      ? { row: (move.from.row + move.to.row) / 2, col: move.from.col } 
      : null;
  }

  checkGameEnd() {
    const legalMoves = this.generateAllLegalMoves(this.currentTurn);
    
    if (legalMoves.length === 0) {
      this.isGameOver = true;
      this.gameResult = this.isKingInCheck(this.currentTurn)
        ? (this.currentTurn === Color.WHITE ? '0-1' : '1-0')
        : '1/2-1/2';
    } else if (this.halfMoveClock >= 100) {
      this.isGameOver = true;
      this.gameResult = '1/2-1/2';
    }
  }

  undoLastMove() {
    if (this.moveHistory.length === 0) return false;
    
    const { savedState } = this.moveHistory.pop();
    this.restoreState(savedState);
    this.currentTurn = this.currentTurn === Color.WHITE ? Color.BLACK : Color.WHITE;
    this.isGameOver = false;
    this.gameResult = null;
    
    return true;
  }

  clone() {
    const clonedEngine = new ChessEngine();
    clonedEngine.board = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
    clonedEngine.currentTurn = this.currentTurn;
    clonedEngine.castlingRights = JSON.parse(JSON.stringify(this.castlingRights));
    clonedEngine.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    clonedEngine.halfMoveClock = this.halfMoveClock;
    clonedEngine.fullMoveNumber = this.fullMoveNumber;
    clonedEngine.isGameOver = this.isGameOver;
    clonedEngine.gameResult = this.gameResult;
    return clonedEngine;
  }
}