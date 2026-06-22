import { ChessEngine } from '../src/chess.js';
import { ChessAI } from '../src/ai.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('ChessEngine', () => {
  it('should initialize with correct starting position', () => {
    const e = new ChessEngine();
    assert.equal(e.board[0][0], 'bR');
    assert.equal(e.board[7][4], 'wK');
    assert.equal(e.turn, 'w');
  });

  it('should have 20 legal moves for white at start', () => {
    const e = new ChessEngine();
    const moves = e.allLegal('w');
    assert.equal(moves.length, 20);
  });

  it('should detect no check at start', () => {
    const e = new ChessEngine();
    assert.equal(e.inC('w'), false);
    assert.equal(e.inC('b'), false);
  });

  it('should not allow moving opponent pieces', () => {
    const e = new ChessEngine();
    const moves = e.legal(0, 0);
    assert.equal(moves.length, 0);
  });

  it('should allow white pawn to move forward', () => {
    const e = new ChessEngine();
    const moves = e.legal(6, 4);
    assert.equal(moves.length, 2);
  });

  it('should apply and undo a move', () => {
    const e = new ChessEngine();
    const snap = e.doMove({ from: [6, 4], to: [4, 4], doublePush: 1 });
    assert.equal(e.board[4][4], 'wP');
    assert.equal(e.board[6][4], null);
    e.undo(snap);
    assert.equal(e.board[6][4], 'wP');
    assert.equal(e.board[4][4], null);
  });

  it('should switch turns after move', () => {
    const e = new ChessEngine();
    e.doMove({ from: [6, 4], to: [4, 4], doublePush: 1 });
    assert.equal(e.turn, 'b');
  });

  it('should detect check', () => {
    const e = new ChessEngine();
    e.board = [
      [null,null,null,null,'bK',null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      ['wR',null,null,null,null,null,null,null]
    ];
    e.turn = 'b';
    assert.equal(e.inC('b'), true);
  });

  it('should detect checkmate', () => {
    const e = new ChessEngine();
    e.board = [
      [null,null,null,null,'bK',null,null,null],
      [null,null,null,'bR',null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null]
    ];
    e.board[2][4] = 'wQ';
    e.turn = 'b';
    assert.equal(e.isCheckmate(), true);
  });

  it('should generate knight moves', () => {
    const e = new ChessEngine();
    const moves = e.legal(7, 1);
    assert.equal(moves.length, 2);
  });

  it('should detect stalemate', () => {
    const e = new ChessEngine();
    e.board = [
      [null,null,null,null,'bK',null,null,null],
      [null,null,null,'bP',null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,'wK',null,null,null]
    ];
    e.turn = 'b';
    e.cast = { wK:1,wQ:1,bK:0,bQ:0 };
    assert.equal(e.isStalemate(), true);
  });
});

describe('ChessAI', () => {
  it('should return a move', () => {
    const e = new ChessEngine();
    const ai = new ChessAI();
    const move = ai.getBestMove(e);
    assert.ok(move);
    assert.ok(move.from);
    assert.ok(move.to);
  });

  it('should return null for no legal moves', () => {
    const e = new ChessEngine();
    const ai = new ChessAI();
    e.board = [
      [null,null,null,null,'bK',null,null,null],
      [null,null,null,'bR',null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null]
    ];
    e.board[2][4] = 'wQ';
    e.turn = 'b';
    const move = ai.getBestMove(e);
    assert.equal(move, null);
  });
});
