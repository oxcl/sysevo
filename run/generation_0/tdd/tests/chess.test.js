import { describe, it, expect, beforeEach } from 'vitest';
import { ChessEngine } from '../src/chess.js';

describe('Chess Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new ChessEngine();
  });

  describe('Board Initialization', () => {
    it('should create a standard 8x8 board', () => {
      const board = engine.getBoard();
      expect(board.length).toBe(8);
      board.forEach(row => expect(row.length).toBe(8));
    });

    it('should place white back rank pieces correctly', () => {
      const board = engine.getBoard();
      const backRank = board[7];
      expect(backRank[0].type).toBe('rook'); expect(backRank[0].color).toBe('white');
      expect(backRank[1].type).toBe('knight'); expect(backRank[1].color).toBe('white');
      expect(backRank[2].type).toBe('bishop'); expect(backRank[2].color).toBe('white');
      expect(backRank[3].type).toBe('queen'); expect(backRank[3].color).toBe('white');
      expect(backRank[4].type).toBe('king'); expect(backRank[4].color).toBe('white');
      expect(backRank[5].type).toBe('bishop'); expect(backRank[5].color).toBe('white');
      expect(backRank[6].type).toBe('knight'); expect(backRank[6].color).toBe('white');
      expect(backRank[7].type).toBe('rook'); expect(backRank[7].color).toBe('white');
    });

    it('should place white pawns on row 6', () => {
      const board = engine.getBoard();
      board[6].forEach(piece => {
        expect(piece.type).toBe('pawn');
        expect(piece.color).toBe('white');
      });
    });

    it('should place black back rank pieces correctly', () => {
      const board = engine.getBoard();
      const backRank = board[0];
      expect(backRank[0].type).toBe('rook'); expect(backRank[0].color).toBe('black');
      expect(backRank[1].type).toBe('knight'); expect(backRank[1].color).toBe('black');
      expect(backRank[2].type).toBe('bishop'); expect(backRank[2].color).toBe('black');
      expect(backRank[3].type).toBe('queen'); expect(backRank[3].color).toBe('black');
      expect(backRank[4].type).toBe('king'); expect(backRank[4].color).toBe('black');
      expect(backRank[5].type).toBe('bishop'); expect(backRank[5].color).toBe('black');
      expect(backRank[6].type).toBe('knight'); expect(backRank[6].color).toBe('black');
      expect(backRank[7].type).toBe('rook'); expect(backRank[7].color).toBe('black');
    });

    it('should place black pawns on row 1', () => {
      const board = engine.getBoard();
      board[1].forEach(piece => {
        expect(piece.type).toBe('pawn');
        expect(piece.color).toBe('black');
      });
    });

    it('should have empty squares rows 2-5', () => {
      const board = engine.getBoard();
      for (let r = 2; r <= 5; r++) {
        for (let c = 0; c < 8; c++) {
          expect(board[r][c]).toBeNull();
        }
      }
    });
  });

  describe('Turn Management', () => {
    it('should start with white to move', () => {
      expect(engine.getTurn()).toBe('white');
    });

    it('should switch turn after a move', () => {
      engine.makeMove({ from: { row: 6, col: 4 }, to: { row: 5, col: 4 } });
      expect(engine.getTurn()).toBe('black');
    });

    it('should not allow moving opponent pieces', () => {
      expect(() => {
        engine.makeMove({ from: { row: 1, col: 0 }, to: { row: 2, col: 0 } });
      }).toThrow();
    });

    it('should not allow moving when not your turn', () => {
      engine.makeMove({ from: { row: 6, col: 4 }, to: { row: 5, col: 4 } });
      expect(() => {
        engine.makeMove({ from: { row: 6, col: 0 }, to: { row: 5, col: 0 } });
      }).toThrow();
    });
  });

  describe('Pawn Movement', () => {
    it('should allow white pawn to move forward one square', () => {
      engine.makeMove({ from: { row: 6, col: 4 }, to: { row: 5, col: 4 } });
      const board = engine.getBoard();
      expect(board[5][4].type).toBe('pawn');
      expect(board[5][4].color).toBe('white');
      expect(board[6][4]).toBeNull();
    });

    it('should allow white pawn to move forward two squares from starting position', () => {
      engine.makeMove({ from: { row: 6, col: 4 }, to: { row: 4, col: 4 } });
      const board = engine.getBoard();
      expect(board[4][4].type).toBe('pawn');
      expect(board[4][4].color).toBe('white');
    });

    it('should not allow white pawn to move forward two squares after already moved', () => {
      engine.makeMove({ from: { row: 6, col: 4 }, to: { row: 5, col: 4 } });
      engine.makeMove({ from: { row: 1, col: 4 }, to: { row: 2, col: 4 } });
      // White's turn again
      expect(() => {
        engine.makeMove({ from: { row: 5, col: 4 }, to: { row: 3, col: 4 } });
      }).toThrow();
    });

    it('should allow pawn to capture diagonally', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 6, col: 4 }, { type: 'pawn', color: 'white' });
      engine.placePiece({ row: 5, col: 3 }, { type: 'pawn', color: 'black' });
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 0, col: 3 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      engine.makeMove({ from: { row: 6, col: 4 }, to: { row: 5, col: 3 } });
      const board = engine.getBoard();
      expect(board[5][3].type).toBe('pawn');
      expect(board[5][3].color).toBe('white');
      expect(board[6][4]).toBeNull();
    });

    it('should not allow pawn to move forward into occupied square', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 6, col: 4 }, { type: 'pawn', color: 'white' });
      engine.placePiece({ row: 5, col: 4 }, { type: 'pawn', color: 'black' });
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 0, col: 3 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      expect(() => {
        engine.makeMove({ from: { row: 6, col: 4 }, to: { row: 5, col: 4 } });
      }).toThrow();
    });

    it('should allow black pawn to move forward one square', () => {
      engine.makeMove({ from: { row: 6, col: 0 }, to: { row: 5, col: 0 } }); // white pawn a3
      engine.makeMove({ from: { row: 1, col: 4 }, to: { row: 2, col: 4 } }); // black pawn e6
      const board = engine.getBoard();
      expect(board[2][4].type).toBe('pawn');
      expect(board[2][4].color).toBe('black');
      expect(board[1][4]).toBeNull();
    });
  });

  describe('Knight Movement', () => {
    it('should allow knight to move in L-shape', () => {
      engine.makeMove({ from: { row: 7, col: 1 }, to: { row: 5, col: 2 } });
      const board = engine.getBoard();
      expect(board[5][2].type).toBe('knight');
      expect(board[5][2].color).toBe('white');
      expect(board[7][1]).toBeNull();
    });

    it('should allow knight to jump over pieces', () => {
      engine.makeMove({ from: { row: 7, col: 6 }, to: { row: 5, col: 5 } });
      const board = engine.getBoard();
      expect(board[5][5].type).toBe('knight');
      expect(board[5][5].color).toBe('white');
    });
  });

  describe('Bishop Movement', () => {
    it('should allow bishop to move diagonally after pawn moves', () => {
      // Clear pawn at d2 to open diagonal
      engine.makeMove({ from: { row: 6, col: 3 }, to: { row: 5, col: 3 } }); // white d4
      engine.makeMove({ from: { row: 1, col: 3 }, to: { row: 2, col: 3 } }); // black d6
      // Now it's white's turn, bishop at c1 should have moves
      const moves = engine.getValidMoves({ row: 7, col: 2 });
      expect(moves.length).toBeGreaterThan(0);
      // After d4, bishop can go to d2, e3, f4, g5, h6
      expect(moves.some(m => m.row === 5 && m.col === 5)).toBe(true); // f4
    });
  });

  describe('Rook Movement', () => {
    it('should allow rook to move horizontally and vertically', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 4, col: 4 }, { type: 'rook', color: 'white' });
      engine.placePiece({ row: 7, col: 3 }, { type: 'king', color: 'white' }); // king away from rook's lines
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      const moves = engine.getValidMoves({ row: 4, col: 4 });
      expect(moves.length).toBeGreaterThan(0);
      // Can move horizontally to col 7
      expect(moves.some(m => m.row === 4 && m.col === 7)).toBe(true);
      // Cannot move to king's square (7, 3) - blocked by own king
      expect(moves.some(m => m.row === 7 && m.col === 3)).toBe(false);
    });
  });

  describe('Queen Movement', () => {
    it('should allow queen to move in all directions', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 4, col: 4 }, { type: 'queen', color: 'white' });
      engine.placePiece({ row: 7, col: 3 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 0, col: 3 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      const moves = engine.getValidMoves({ row: 4, col: 4 });
      // Queen should have diagonal + straight moves
      expect(moves.some(m => m.row === 4 && m.col === 7)).toBe(true); // horizontal
      expect(moves.some(m => m.row === 7 && m.col === 7)).toBe(true); // diagonal
    });
  });

  describe('King Movement', () => {
    it('should allow king to move one square in any direction', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 4, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      const moves = engine.getValidMoves({ row: 4, col: 4 });
      expect(moves.length).toBe(8);
      expect(moves.some(m => m.row === 3 && m.col === 3)).toBe(true);
      expect(moves.some(m => m.row === 5 && m.col === 5)).toBe(true);
    });

    it('should not allow king to move into check', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 4, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 4, col: 7 }, { type: 'rook', color: 'black' }); // attacks along row 4
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      const moves = engine.getValidMoves({ row: 4, col: 4 });
      // King cannot move to (4,5) because rook attacks that square
      expect(moves.some(m => m.row === 4 && m.col === 5)).toBe(false);
      // King can capture the rook at (4,7)
      expect(moves.some(m => m.row === 4 && m.col === 7)).toBe(true);
    });
  });

  describe('Check Detection', () => {
    it('should detect when king is in check by rook', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 4, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 4, col: 7 }, { type: 'rook', color: 'black' });
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      expect(engine.isInCheck('white')).toBe(true);
    });

    it('should detect when king is not in check', () => {
      expect(engine.isInCheck('white')).toBe(false);
    });

    it('should detect check by knight', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 4, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 6, col: 5 }, { type: 'knight', color: 'black' });
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      expect(engine.isInCheck('white')).toBe(true);
    });

    it('should detect check by bishop', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 4, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 1, col: 1 }, { type: 'bishop', color: 'black' }); // attacks (4,4) diagonally
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      expect(engine.isInCheck('white')).toBe(true);
    });

    it('should detect check by pawn', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 3, col: 3 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 2, col: 4 }, { type: 'pawn', color: 'black' }); // attacks (3,3)
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      expect(engine.isInCheck('white')).toBe(true);
    });
  });

  describe('Checkmate Detection', () => {
    it('should detect checkmate with queen and king', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'white' }); // a1
      engine.placePiece({ row: 1, col: 1 }, { type: 'queen', color: 'black' }); // b2 - attacks a1
      engine.placePiece({ row: 2, col: 0 }, { type: 'king', color: 'black' }); // a3 - blocks a2
      engine.setTurn('white');
      expect(engine.isCheckmate()).toBe(true);
      expect(engine.getGameState().state).toBe('checkmate');
    });

    it('should not detect checkmate when king can escape', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 1, col: 2 }, { type: 'queen', color: 'black' }); // doesn't attack (0,0) directly
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      expect(engine.isCheckmate()).toBe(false);
    });

    it('should detect back rank checkmate', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      // White king on h1 (7,7), pawns on g2 (6,6) and h2 (6,7) blocking escape
      engine.placePiece({ row: 7, col: 7 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 6, col: 6 }, { type: 'pawn', color: 'white' }); // g2
      engine.placePiece({ row: 6, col: 7 }, { type: 'pawn', color: 'white' }); // h2
      engine.placePiece({ row: 0, col: 6 }, { type: 'rook', color: 'black' }); // g8 - attacks g-file
      engine.placePiece({ row: 5, col: 5 }, { type: 'king', color: 'black' }); // f6
      engine.setTurn('white');
      // King on h1, rook on g8 checks via g-file. King can't go to g1 (7,6) because rook attacks it,
      // can't go to g2 (6,6) because pawn, can't go to h2 (6,7) because pawn.
      expect(engine.isCheckmate()).toBe(true);
    });
  });

  describe('Stalemate Detection', () => {
    it('should detect stalemate', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 7, col: 0 }, { type: 'king', color: 'white' }); // a1
      engine.placePiece({ row: 6, col: 2 }, { type: 'queen', color: 'black' }); // c2
      engine.placePiece({ row: 5, col: 1 }, { type: 'queen', color: 'black' }); // b3
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      expect(engine.isStalemate()).toBe(true);
      expect(engine.getGameState().state).toBe('stalemate');
    });
  });

  describe('Castling', () => {
    it('should allow king-side castling for white', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 7 }, { type: 'rook', color: 'white' });
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      const moves = engine.getValidMoves({ row: 7, col: 4 });
      expect(moves.some(m => m.row === 7 && m.col === 6)).toBe(true);
    });

    it('should allow queen-side castling for white', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 0 }, { type: 'rook', color: 'white' });
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      const moves = engine.getValidMoves({ row: 7, col: 4 });
      expect(moves.some(m => m.row === 7 && m.col === 2)).toBe(true);
    });

    it('should not allow castling through check', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 7 }, { type: 'rook', color: 'white' });
      engine.placePiece({ row: 4, col: 5 }, { type: 'rook', color: 'black' }); // attacks f1 (7,5)
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      const moves = engine.getValidMoves({ row: 7, col: 4 });
      expect(moves.some(m => m.row === 7 && m.col === 6)).toBe(false);
    });

    it('should not allow castling when king has moved', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 7 }, { type: 'rook', color: 'white' });
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      // Move king away and back
      engine.makeMove({ from: { row: 7, col: 4 }, to: { row: 6, col: 4 } });
      engine.makeMove({ from: { row: 0, col: 4 }, to: { row: 1, col: 4 } });
      engine.makeMove({ from: { row: 6, col: 4 }, to: { row: 7, col: 4 } });
      engine.makeMove({ from: { row: 1, col: 4 }, to: { row: 0, col: 4 } });
      const moves = engine.getValidMoves({ row: 7, col: 4 });
      expect(moves.some(m => m.row === 7 && m.col === 6)).toBe(false);
    });

    it('should not allow castling when rook has moved', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 7 }, { type: 'rook', color: 'white' });
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      engine.makeMove({ from: { row: 7, col: 7 }, to: { row: 7, col: 6 } });
      engine.makeMove({ from: { row: 0, col: 4 }, to: { row: 1, col: 4 } });
      engine.makeMove({ from: { row: 7, col: 6 }, to: { row: 7, col: 7 } });
      engine.makeMove({ from: { row: 1, col: 4 }, to: { row: 0, col: 4 } });
      const moves = engine.getValidMoves({ row: 7, col: 4 });
      expect(moves.some(m => m.row === 7 && m.col === 6)).toBe(false);
    });

    it('should correctly move rook during castling', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 7 }, { type: 'rook', color: 'white' });
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      engine.makeMove({ from: { row: 7, col: 4 }, to: { row: 7, col: 6 } });
      const board = engine.getBoard();
      expect(board[7][5].type).toBe('rook');
      expect(board[7][5].color).toBe('white');
      expect(board[7][7]).toBeNull();
      expect(board[7][6].type).toBe('king');
    });
  });

  describe('En Passant', () => {
    it('should allow en passant capture', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      // White pawn at rank 5 (row 3), black pawn at rank 7 (row 1)
      engine.placePiece({ row: 3, col: 4 }, { type: 'pawn', color: 'white' }); // e5
      engine.placePiece({ row: 1, col: 5 }, { type: 'pawn', color: 'black' }); // f7
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 0, col: 3 }, { type: 'king', color: 'black' });
      engine.setTurn('black');
      // Black moves f7-f5 (double push)
      engine.makeMove({ from: { row: 1, col: 5 }, to: { row: 3, col: 5 } });
      // Now white can capture en passant: e5xf6
      const moves = engine.getValidMoves({ row: 3, col: 4 });
      expect(moves.some(m => m.row === 2 && m.col === 5)).toBe(true);
      engine.makeMove({ from: { row: 3, col: 4 }, to: { row: 2, col: 5 } });
      const board = engine.getBoard();
      expect(board[2][5].type).toBe('pawn');
      expect(board[2][5].color).toBe('white');
      expect(board[3][4]).toBeNull();
      expect(board[3][5]).toBeNull(); // captured pawn removed
    });

    it('should only allow en passant immediately after opponent double pawn push', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 3, col: 4 }, { type: 'pawn', color: 'white' }); // e5
      engine.placePiece({ row: 1, col: 5 }, { type: 'pawn', color: 'black' }); // f7
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 0, col: 3 }, { type: 'king', color: 'black' });
      engine.setTurn('black');
      engine.makeMove({ from: { row: 1, col: 5 }, to: { row: 3, col: 5 } }); // f7-f5
      // White does something else
      engine.makeMove({ from: { row: 7, col: 4 }, to: { row: 7, col: 3 } }); // Ke2
      engine.makeMove({ from: { row: 0, col: 3 }, to: { row: 0, col: 2 } }); // Kd8
      engine.makeMove({ from: { row: 7, col: 3 }, to: { row: 7, col: 4 } }); // Ke1
      engine.makeMove({ from: { row: 0, col: 2 }, to: { row: 0, col: 3 } }); // Kd8
      // En passant no longer available
      const moves = engine.getValidMoves({ row: 3, col: 4 });
      expect(moves.some(m => m.row === 2 && m.col === 5)).toBe(false);
    });
  });

  describe('Pawn Promotion', () => {
    it('should promote pawn to queen by default when reaching last rank', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 1, col: 4 }, { type: 'pawn', color: 'white' }); // e7
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'black' }); // a8
      engine.setTurn('white');
      engine.makeMove({ from: { row: 1, col: 4 }, to: { row: 0, col: 4 } }); // e8=Q
      const board = engine.getBoard();
      expect(board[0][4].type).toBe('queen');
      expect(board[0][4].color).toBe('white');
    });

    it('should allow promoting to specific piece', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 1, col: 4 }, { type: 'pawn', color: 'white' }); // e7
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'black' }); // a8
      engine.setTurn('white');
      engine.makeMove({ from: { row: 1, col: 4 }, to: { row: 0, col: 4 }, promotion: 'knight' });
      const board = engine.getBoard();
      expect(board[0][4].type).toBe('knight');
      expect(board[0][4].color).toBe('white');
    });

    it('should allow black pawn promotion', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 6, col: 4 }, { type: 'pawn', color: 'black' }); // e2
      engine.placePiece({ row: 7, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'black' });
      engine.setTurn('black');
      engine.makeMove({ from: { row: 6, col: 4 }, to: { row: 7, col: 4 }, promotion: 'rook' });
      const board = engine.getBoard();
      expect(board[7][4].type).toBe('rook');
      expect(board[7][4].color).toBe('black');
    });
  });

  describe('Insufficient Material', () => {
    it('should detect insufficient material with only kings', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 7 }, { type: 'king', color: 'black' });
      expect(engine.isInsufficientMaterial()).toBe(true);
    });

    it('should detect insufficient material with king and bishop vs king', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 7 }, { type: 'king', color: 'black' });
      engine.placePiece({ row: 3, col: 3 }, { type: 'bishop', color: 'white' });
      expect(engine.isInsufficientMaterial()).toBe(true);
    });

    it('should detect insufficient material with king and knight vs king', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 7 }, { type: 'king', color: 'black' });
      engine.placePiece({ row: 3, col: 3 }, { type: 'knight', color: 'white' });
      expect(engine.isInsufficientMaterial()).toBe(true);
    });

    it('should not detect insufficient material with king and rook vs king', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 7 }, { type: 'king', color: 'black' });
      engine.placePiece({ row: 3, col: 3 }, { type: 'rook', color: 'white' });
      expect(engine.isInsufficientMaterial()).toBe(false);
    });

    it('should not detect insufficient material with king and queen vs king', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 0, col: 0 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 7, col: 7 }, { type: 'king', color: 'black' });
      engine.placePiece({ row: 3, col: 3 }, { type: 'queen', color: 'white' });
      expect(engine.isInsufficientMaterial()).toBe(false);
    });
  });

  describe('Clone', () => {
    it('should create a deep copy of the engine', () => {
      const cloned = engine.clone();
      expect(cloned.getBoard()).toEqual(engine.getBoard());
      expect(cloned.getTurn()).toBe(engine.getTurn());
      
      // Modify original
      engine.makeMove({ from: { row: 6, col: 4 }, to: { row: 5, col: 4 } });
      // Clone should be unaffected
      expect(cloned.getTurn()).toBe('white');
      expect(cloned.getBoard()[6][4]).not.toBeNull();
    });
  });

  describe('Game State', () => {
    it('should return playing state initially', () => {
      const state = engine.getGameState();
      expect(state.state).toBe('playing');
      expect(state.turn).toBe('white');
    });

    it('should return check state when in check', () => {
      engine = new ChessEngine();
      engine.clearBoard();
      engine.placePiece({ row: 4, col: 4 }, { type: 'king', color: 'white' });
      engine.placePiece({ row: 4, col: 7 }, { type: 'rook', color: 'black' });
      engine.placePiece({ row: 0, col: 4 }, { type: 'king', color: 'black' });
      engine.setTurn('white');
      const state = engine.getGameState();
      expect(state.state).toBe('check');
    });
  });
});
