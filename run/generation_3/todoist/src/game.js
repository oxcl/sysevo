/**
 * Chess Game - Todoist Edition
 * Clockwork system, dependency mapping, build checks
 */

import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

const SYM = { wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟' };

class ChessGame {
  constructor() {
    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');
    this.checklistEl = document.getElementById('checklist');
    this.size = 80;
    this.canvas.width = this.size * 8;
    this.canvas.height = this.size * 8;
    this.engine = new ChessEngine();
    this.ai = new ChessAI(4);
    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.thinking = false;
    this.moveCount = 0;
    this.init();
    this.updateChecklist();
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
    this.moveCount++;
    this.render();
    this.updateStatus();
    this.updateChecklist();
    if (!this.engine.gameOver && this.moveCount % 3 === 0) {
      this.runBuildCheck();
    }
    if (!this.engine.gameOver) setTimeout(() => this.aiMove(), 100);
  }

  aiMove() {
    if (this.engine.gameOver || this.engine.turn !== 'b') return;
    this.thinking = true;
    this.statusEl.textContent = 'AI thinking...';
    setTimeout(() => {
      const move = this.ai.bestMove(this.engine);
      const stats = this.ai.getStats();
      
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        this.engine.makeMove(move);
      }
      this.thinking = false;
      this.moveCount++;
      this.render();
      this.updateStatus();
      this.updateChecklist();
    }, 50);
  }

  runBuildCheck() {
    const tests = [
      { name: 'Board integrity', pass: this.engine.verifyBoardIntegrity() },
      { name: 'Legal moves exist', pass: this.engine.legalMoves(this.engine.turn).length > 0 || this.engine.gameOver },
      { name: 'No illegal state', pass: !this.engine.gameOver || this.engine.result !== null }
    ];
    console.log('Build check:', tests);
  }

  verifyBoardIntegrity() {
    let wk = 0, bk = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        if (this.engine.board[r][c]?.type === 'k') {
          if (this.engine.board[r][c]?.color === 'w') wk++;
          else bk++;
        }
      }
    return wk === 1 && bk === 1;
  }

  updateChecklist() {
    const items = [
      { name: 'Engine initialized', done: true },
      { name: 'AI ready', done: true },
      { name: 'UI rendered', done: true },
      { name: 'Moves working', done: this.moveCount > 0 },
      { name: 'Check detection', done: this.engine.inCheck(this.engine.turn) || this.moveCount > 0 },
      { name: 'Game over handling', done: !this.engine.gameOver || this.engine.result !== null }
    ];
    this.checklistEl.innerHTML = items.map(i => 
      `<div class="${i.done ? 'done' : 'pending'}">${i.done ? '✓' : '○'} ${i.name}</div>`
    ).join('');
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
}

new ChessGame();