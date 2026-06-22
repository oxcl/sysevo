// Chess Engine - Board representation, move generation, validation
export class ChessEngine {
  constructor() {
    this.board = this.createInitialBoard();
    this.turn = 'w';
    this.castlingRights = { w: { king: true, queen: true }, b: { king: true, queen: true } };
    this.enPassantTarget = null;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.moveHistory = [];
    this.gameOver = false;
    this.result = null;
  }

  createInitialBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let col = 0; col < 8; col++) {
      board[0][col] = { type: backRank[col], color: 'b' };
      board[1][col] = { type: 'p', color: 'b' };
      board[6][col] = { type: 'p', color: 'w' };
      board[7][col] = { type: backRank[col], color: 'w' };
    }
    return board;
  }

  getPiece(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.board[row][col];
  }

  findKing(color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === 'k' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  isSquareAttacked(row, col, byColor) {
    const directions = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
      { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
    ];

    for (const { dr, dc } of directions) {
      const r = row + dr, c = col + dc;
      const piece = this.getPiece(r, c);
      if (piece && piece.color === byColor) {
        if (piece.type === 'q') return true;
        if (piece.type === 'r' && (dr === 0 || dc === 0)) return true;
        if (piece.type === 'b' && dr !== 0 && dc !== 0) return true;
      }
    }

    const knightMoves = [
      { dr: -2, dc: -1 }, { dr: -2, dc: 1 }, { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
      { dr: 1, dc: -2 }, { dr: 1, dc: 2 }, { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
    ];
    for (const { dr, dc } of knightMoves) {
      const piece = this.getPiece(row + dr, col + dc);
      if (piece && piece.color === byColor && piece.type === 'n') return true;
    }

    const pawnDir = byColor === 'w' ? 1 : -1;
    for (const dc of [-1, 1]) {
      const piece = this.getPiece(row + pawnDir, col + dc);
      if (piece && piece.color === byColor && piece.type === 'p') return true;
    }

    for (const { dr, dc } of directions) {
      const piece = this.getPiece(row + dr, col + dc);
      if (piece && piece.color === byColor && piece.type === 'k') return true;
    }

    return false;
  }

  isInCheck(color) {
    const king = this.findKing(color);
    if (!king) return false;
    return this.isSquareAttacked(king.row, king.col, color === 'w' ? 'b' : 'w');
  }

  generatePseudoLegalMoves(row, col) {
    const piece = this.getPiece(row, col);
    if (!piece) return [];
    const moves = [];
    const color = piece.color;
    const enemy = color === 'w' ? 'b' : 'w';

    const addMove = (toRow, toCol, special = null) => {
      const target = this.getPiece(toRow, toCol);
      if (!target || target.color === enemy) {
        moves.push({ from: { row, col }, to: { row: toRow, col: toCol }, piece, special });
      }
    };

    const addSlide = (dr, dc) => {
      for (let i = 1; i < 8; i++) {
        const r = row + dr * i, c = col + dc * i;
        const target = this.getPiece(r, c);
        if (!target) {
          moves.push({ from: { row, col }, to: { row: r, col: c }, piece });
        } else {
          if (target.color === enemy) {
            moves.push({ from: { row, col }, to: { row: r, col: c }, piece });
          }
          break;
        }
      }
    };

    switch (piece.type) {
      case 'p': {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        const promoRow = color === 'w' ? 0 : 7;

        if (!this.getPiece(row + dir, col)) {
          if (row + dir === promoRow) {
            for (const promo of ['q', 'r', 'b', 'n']) {
              moves.push({ from: { row, col }, to: { row: row + dir, col }, piece, special: 'promotion', promotion: promo });
            }
          } else {
            moves.push({ from: { row, col }, to: { row: row + dir, col }, piece });
          }
          if (row === startRow && !this.getPiece(row + 2 * dir, col)) {
            moves.push({ from: { row, col }, to: { row: row + 2 * dir, col }, piece, special: 'pawnDouble' });
          }
        }

        for (const dc of [-1, 1]) {
          const target = this.getPiece(row + dir, col + dc);
          if (target && target.color === enemy) {
            if (row + dir === promoRow) {
              for (const promo of ['q', 'r', 'b', 'n']) {
                moves.push({ from: { row, col }, to: { row: row + dir, col: col + dc }, piece, special: 'promotion', promotion: promo });
              }
            } else {
              moves.push({ from: { row, col }, to: { row: row + dir, col: col + dc }, piece });
            }
          }
          if (this.enPassantTarget && this.enPassantTarget.row === row + dir && this.enPassantTarget.col === col + dc) {
            moves.push({ from: { row, col }, to: { row: row + dir, col: col + dc }, piece, special: 'enPassant' });
          }
        }
        break;
      }
      case 'n':
        for (const { dr, dc } of [
          { dr: -2, dc: -1 }, { dr: -2, dc: 1 }, { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
          { dr: 1, dc: -2 }, { dr: 1, dc: 2 }, { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
        ]) {
          addMove(row + dr, col + dc);
        }
        break;
      case 'b':
        for (const { dr, dc } of [{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }]) {
          addSlide(dr, dc);
        }
        break;
      case 'r':
        for (const { dr, dc } of [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }]) {
          addSlide(dr, dc);
        }
        break;
      case 'q':
        for (const { dr, dc } of [
          { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
          { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
          { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ]) {
          addSlide(dr, dc);
        }
        break;
      case 'k':
        for (const { dr, dc } of [
          { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
          { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
          { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ]) {
          addMove(row + dr, col + dc);
        }

        if (this.castlingRights[color].king && !this.isInCheck(color)) {
          if (!this.getPiece(row, col + 1) && !this.getPiece(row, col + 2)) {
            if (!this.isSquareAttacked(row, col + 1, enemy) && !this.isSquareAttacked(row, col + 2, enemy)) {
              moves.push({ from: { row, col }, to: { row, col: col + 2 }, piece, special: 'castleKing' });
            }
          }
        }
        if (this.castlingRights[color].queen && !this.isInCheck(color)) {
          if (!this.getPiece(row, col - 1) && !this.getPiece(row, col - 2) && !this.getPiece(row, col - 3)) {
            if (!this.isSquareAttacked(row, col - 1, enemy) && !this.isSquareAttacked(row, col - 2, enemy)) {
              moves.push({ from: { row, col }, to: { row, col: col - 2 }, piece, special: 'castleQueen' });
            }
          }
        }
        break;
    }
    return moves;
  }

  generateLegalMoves(color) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.getPiece(row, col);
        if (piece && piece.color === color) {
          for (const move of this.generatePseudoLegalMoves(row, col)) {
            if (this.isLegalMove(move)) {
              moves.push(move);
            }
          }
        }
      }
    }
    return moves;
  }

  isLegalMove(move) {
    const savedBoard = this.board.map(r => r.map(c => c ? { ...c } : null));
    const savedCastling = JSON.parse(JSON.stringify(this.castlingRights));
    const savedEnPassant = this.enPassantTarget;

    this.applyMoveToBoard(move);
    const inCheck = this.isInCheck(move.piece.color);

    this.board = savedBoard;
    this.castlingRights = savedCastling;
    this.enPassantTarget = savedEnPassant;

    return !inCheck;
  }

  applyMoveToBoard(move) {
    const { from, to, special } = move;
    const piece = this.board[from.row][from.col];

    if (special === 'enPassant') {
      this.board[from.row][to.col] = null;
    }

    this.board[to.row][to.col] = piece;
    this.board[from.row][from.col] = null;

    if (special === 'promotion') {
      this.board[to.row][to.col] = { type: move.promotion, color: piece.color };
    }

    if (special === 'castleKing') {
      this.board[from.row][from.col + 1] = this.board[from.row][from.col + 3];
      this.board[from.row][from.col + 3] = null;
    }
    if (special === 'castleQueen') {
      this.board[from.row][from.col - 1] = this.board[from.row][from.col - 4];
      this.board[from.row][from.col - 4] = null;
    }
  }

  makeMove(move) {
    if (this.gameOver) return false;
    if (move.piece.color !== this.turn) return false;

    const savedState = {
      board: this.board.map(r => r.map(c => c ? { ...c } : null)),
      castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
      enPassantTarget: this.enPassantTarget,
      halfMoveClock: this.halfMoveClock,
      fullMoveNumber: this.fullMoveNumber
    };

    this.applyMoveToBoard(move);

    if (move.piece.type === 'p' || move.special === 'enPassant') {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }

    if (move.piece.type === 'k') {
      this.castlingRights[move.piece.color].king = false;
      this.castlingRights[move.piece.color].queen = false;
    }
    if (move.piece.type === 'r') {
      if (move.from.col === 0) this.castlingRights[move.piece.color].queen = false;
      if (move.from.col === 7) this.castlingRights[move.piece.color].king = false;
    }

    this.enPassantTarget = move.special === 'pawnDouble' ?
      { row: (move.from.row + move.to.row) / 2, col: move.from.col } : null;

    this.turn = this.turn === 'w' ? 'b' : 'w';
    if (this.turn === 'w') this.fullMoveNumber++;

    this.moveHistory.push({ move, savedState });

    const legalMoves = this.generateLegalMoves(this.turn);
    if (legalMoves.length === 0) {
      this.gameOver = true;
      this.result = this.isInCheck(this.turn) ?
        (this.turn === 'w' ? '0-1' : '1-0') : '1/2-1/2';
    } else if (this.halfMoveClock >= 100) {
      this.gameOver = true;
      this.result = '1/2-1/2';
    }

    return true;
  }

  undoMove() {
    if (this.moveHistory.length === 0) return false;
    const { savedState } = this.moveHistory.pop();
    this.board = savedState.board;
    this.castlingRights = savedState.castlingRights;
    this.enPassantTarget = savedState.enPassantTarget;
    this.halfMoveClock = savedState.halfMoveClock;
    this.fullMoveNumber = savedState.fullMoveNumber;
    this.turn = this.turn === 'w' ? 'b' : 'w';
    this.gameOver = false;
    this.result = null;
    return true;
  }

  clone() {
    const engine = new ChessEngine();
    engine.board = this.board.map(r => r.map(c => c ? { ...c } : null));
    engine.turn = this.turn;
    engine.castlingRights = JSON.parse(JSON.stringify(this.castlingRights));
    engine.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    engine.halfMoveClock = this.halfMoveClock;
    engine.fullMoveNumber = this.fullMoveNumber;
    engine.gameOver = this.gameOver;
    engine.result = this.result;
    return engine;
  }
}