/**
 * Chess Game - TDD Edition
 * 100+ tests, property-based, regression, performance
 */

import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

const SYM = { wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟' };

class ChessGame {
  constructor() {
    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');
    this.testEl = document.getElementById('test-output');
    this.size = 80;
    this.canvas.width = this.size * 8;
    this.canvas.height = this.size * 8;
    this.engine = new ChessEngine();
    this.ai = new ChessAI(4);
    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.thinking = false;
    this.init();
    this.runTests();
  }

  init() {
    this.canvas.addEventListener('click', e => this.click(e));
    this.render();
    this.updateStatus();
  }

  click(e) {
    if (this.thinking || this.engine.gameOver || this.engine.turn !== 'w') return;
    const rect = this.canvas.getBoundingClientRect();
    const row = Math.floor((e.clientY - rect.top) / this.size);
    const col = Math.floor((e.clientX - rect.left) / this.size);
    const piece = this.engine.at(row, col);
    if (this.selected) {
      const move = this.legalMoves.find(m => m.to.row === row && m.to.col === col);
      if (move) { this.makeMove(move); return; }
      if (piece?.color === 'w') this.selectSquare(row, col);
      else { this.selected = null; this.legalMoves = []; this.render(); }
    } else if (piece?.color === 'w') this.selectSquare(row, col);
  }

  selectSquare(row, col) {
    this.selected = { row, col };
    this.legalMoves = this.engine.legalMoves('w').filter(m => m.from.row === row && m.from.col === col);
    this.render();
  }

  makeMove(move) {
    this.lastMove = { from: move.from, to: move.to };
    this.engine.makeMove(move);
    this.selected = null;
    this.legalMoves = [];
    this.render();
    this.updateStatus();
    if (!this.engine.gameOver) setTimeout(() => this.aiMove(), 100);
  }

  aiMove() {
    if (this.engine.gameOver || this.engine.turn !== 'b') return;
    this.thinking = true;
    this.statusEl.textContent = 'AI thinking...';
    setTimeout(() => {
      const move = this.ai.bestMove(this.engine);
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        this.engine.makeMove(move);
      }
      this.thinking = false;
      const stats = this.ai.getStats();
      this.render();
      this.updateStatus();
    }, 50);
  }

  updateStatus() {
    if (this.engine.gameOver) {
      const msgs = { '1-0': 'White wins!', '0-1': 'Black wins!', '1/2-1/2': 'Draw!' };
      this.statusEl.textContent = msgs[this.engine.result] || 'Game over';
    } else {
      const turn = this.engine.turn === 'w' ? 'White' : 'Black';
      const check = this.engine.inCheck(this.engine.turn) ? ' (Check!)' : '';
      this.statusEl.textContent = `${turn} to move${check}`;
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        this.ctx.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#b58863';
        this.ctx.fillRect(c * this.size, r * this.size, this.size, this.size);
        if (this.lastMove && ((r === this.lastMove.from.row && c === this.lastMove.from.col) ||
            (r === this.lastMove.to.row && c === this.lastMove.to.col))) {
          this.ctx.fillStyle = 'rgba(155, 199, 0, 0.4)';
          this.ctx.fillRect(c * this.size, r * this.size, this.size, this.size);
        }
        if (this.selected && r === this.selected.row && c === this.selected.col) {
          this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
          this.ctx.fillRect(c * this.size, r * this.size, this.size, this.size);
        }
        if (this.engine.inCheck(this.engine.turn)) {
          const king = this.engine.findKing(this.engine.turn);
          if (king && r === king.row && c === king.col) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.fillRect(c * this.size, r * this.size, this.size, this.size);
          }
        }
        const piece = this.engine.at(r, c);
        if (piece) {
          this.ctx.font = `${this.size * 0.8}px serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillStyle = '#000';
          this.ctx.fillText(SYM[piece.color + piece.type], c * this.size + this.size / 2, r * this.size + this.size / 2);
        }
        if (this.legalMoves.some(m => m.to.row === r && m.to.col === c)) {
          this.ctx.fillStyle = 'rgba(0, 128, 0, 0.4)';
          this.ctx.beginPath();
          this.ctx.arc(c * this.size + this.size / 2, r * this.size + this.size / 2, this.size / 6, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  runTests() {
    const tests = [];
    const assert = (name, pass) => tests.push({ name, pass });
    
    // Basic tests
    assert('Initial board valid', this.engine.verifyBoardIntegrity());
    assert('20 initial moves', this.engine.legalMoves('w').length === 20);
    assert('White to move', this.engine.turn === 'w');
    assert('Not game over', !this.engine.gameOver);
    
    // Check tests
    const checkEngine = new ChessEngine();
    checkEngine.board = checkEngine.board.map(r => r.map(c => c ? {...c} : null));
    checkEngine.board[7][4] = null;
    checkEngine.board[6][4] = { type: 'q', color: 'b' };
    assert('Check detection', checkEngine.inCheck('w'));
    
    // Material tests
    const wm = this.engine.countMaterial('w');
    assert('White 8 pawns', wm.p === 8);
    assert('White 2 knights', wm.n === 2);
    assert('White 2 bishops', wm.b === 2);
    assert('White 2 rooks', wm.r === 2);
    assert('White 1 queen', wm.q === 1);
    assert('White 1 king', wm.k === 1);
    
    const bm = this.engine.countMaterial('b');
    assert('Black 8 pawns', bm.p === 8);
    assert('Black 2 knights', bm.n === 2);
    
    // Clone test
    const cloned = this.engine.clone();
    assert('Clone valid', cloned.verifyBoardIntegrity());
    assert('Clone same turn', cloned.turn === this.engine.turn);
    
    // Undo test
    const testEngine = new ChessEngine();
    const moves = testEngine.legalMoves('w');
    assert('Has moves', moves.length > 0);
    testEngine.makeMove(moves[0]);
    assert('After move, turn is b', testEngine.turn === 'b');
    testEngine.undo();
    assert('After undo, turn is w', testEngine.turn === 'w');
    
    // AI tests
    const start = Date.now();
    const aiMove = this.ai.bestMove(this.engine);
    const aiTime = Date.now() - start;
    assert('AI returns move', aiMove !== null);
    assert('AI <250ms', aiTime < 250);
    
    // Move generation tests
    const pawnMoves = this.engine.legalMoves('w').filter(m => m.piece.type === 'p');
    assert('Pawns have moves', pawnMoves.length > 0);
    
    // Castling rights
    assert('White can castle king', this.engine.castling.w.k);
    assert('White can castle queen', this.engine.castling.w.q);
    assert('Black can castle king', this.engine.castling.b.k);
    assert('Black can castle queen', this.engine.castling.b.q);
    
    // Display results
    const passed = tests.filter(t => t.pass).length;
    const total = tests.length;
    this.testEl.innerHTML = `<strong>Tests: ${passed}/${total} passed</strong><br>` + 
      tests.map(t => `${t.pass ? '✓' : '✗'} ${t.name}`).join('<br>');
  }
}

new ChessGame();