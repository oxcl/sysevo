/**
 * Chess Game - Personality Edition
 * Professional quality UI with engine info display
 */

import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

const SYMBOLS = ['♟', '♞', '♝', '♜', '♛', '♚'];
const SYMBOLS_UPPER = ['♙', '♘', '♗', '♖', '♕', '♔'];

class ChessGame {
  constructor() {
    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');
    this.engineInfoEl = document.getElementById('engine-info');
    
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
  }

  init() {
    this.canvas.addEventListener('click', (e) => this.click(e));
    this.render();
    this.updateStatus();
  }

  click(e) {
    if (this.thinking || this.engine.gameOver || this.engine.turn !== 0) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const sq = Math.floor((e.clientY - rect.top) / this.size) * 8 + 
               Math.floor((e.clientX - rect.left) / this.size);
    const piece = this.engine.board[sq];
    
    if (this.selected !== null) {
      const move = this.legalMoves.find(m => m.to === sq);
      if (move) { this.makeMove(move); return; }
      if (piece?.color === 0) { this.selectSquare(sq); }
      else { this.selected = null; this.legalMoves = []; this.render(); }
    } else if (piece?.color === 0) {
      this.selectSquare(sq);
    }
  }

  selectSquare(sq) {
    this.selected = sq;
    this.legalMoves = this.engine.legalMoves(0).filter(m => m.from === sq);
    this.render();
  }

  makeMove(move) {
    this.lastMove = { from: move.from, to: move.to };
    this.engine.makeMove(move);
    this.selected = null;
    this.legalMoves = [];
    this.render();
    this.updateStatus();
    
    if (!this.engine.gameOver) {
      setTimeout(() => this.aiMove(), 50);
    }
  }

  aiMove() {
    if (this.engine.gameOver || this.engine.turn !== 1) return;
    this.thinking = true;
    this.statusEl.textContent = 'Thinking...';
    
    const start = performance.now();
    setTimeout(() => {
      const move = this.ai.bestMove(this.engine);
      const time = Math.round(performance.now() - start);
      
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        this.engine.makeMove(move);
      }
      this.thinking = false;
      
      const stats = this.ai.getStats();
      this.engineInfoEl.textContent = `Depth: ${this.ai.maxDepth} | ${stats.nodes} nodes | ${time}ms | ${stats.nps} nps`;
      
      this.render();
      this.updateStatus();
    }, 50);
  }

  updateStatus() {
    if (this.engine.gameOver) {
      const msgs = { '1-0': 'White wins!', '0-1': 'Black wins!', '1/2-1/2': 'Draw!' };
      this.statusEl.textContent = msgs[this.engine.result] || 'Game over';
    } else {
      const turn = this.engine.turn === 0 ? 'White' : 'Black';
      const check = this.engine.inCheck(this.engine.turn) ? ' (Check!)' : '';
      this.statusEl.textContent = `${turn} to move${check}`;
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = r * 8 + c;
        const light = (r + c) % 2 === 0;
        this.ctx.fillStyle = light ? '#f0d9b5' : '#b58863';
        this.ctx.fillRect(c * this.size, r * this.size, this.size, this.size);
        
        if (this.lastMove) {
          if (sq === this.lastMove.from || sq === this.lastMove.to) {
            this.ctx.fillStyle = 'rgba(155, 199, 0, 0.4)';
            this.ctx.fillRect(c * this.size, r * this.size, this.size, this.size);
          }
        }
        
        if (this.selected === sq) {
          this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
          this.ctx.fillRect(c * this.size, r * this.size, this.size, this.size);
        }
        
        if (this.engine.inCheck(this.engine.turn)) {
          const king = this.engine.findKing(this.engine.turn);
          if (king === sq) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.fillRect(c * this.size, r * this.size, this.size, this.size);
          }
        }
        
        const piece = this.engine.board[sq];
        if (piece) {
          const symbol = piece.color === 0 ? SYMBOLS_UPPER[piece.type] : SYMBOLS[piece.type];
          this.ctx.font = `${this.size * 0.8}px serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillStyle = '#000';
          this.ctx.fillText(symbol, c * this.size + this.size / 2, r * this.size + this.size / 2);
        }
        
        if (this.legalMoves.some(m => m.to === sq)) {
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