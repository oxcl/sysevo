/**
 * Chess Game - Flamboyant Edition
 * Stunning visuals, particle effects, design system
 */

import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

const THEMES = {
  royal: { light: '#f0d9b5', dark: '#b58863', accent: '#9b59b6', bg: ['#1a1a2e', '#16213e', '#0f3460'] },
  ocean: { light: '#a8d8ea', dark: '#3d84a8', accent: '#48c9b0', bg: ['#0c2340', '#1a3c5e', '#2d5a7b'] },
  forest: { light: '#d4e09b', dark: '#6b8e23', accent: '#228b22', bg: ['#1a3300', '#2d4a00', '#3d6600'] },
  sunset: { light: '#ffdab9', dark: '#cd853f', accent: '#ff6347', bg: ['#4a1942', '#6b2c5c', '#8c3f77'] }
};

const PIECE_SYMBOLS = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟'
};

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.02;
    this.color = color;
    this.size = 3 + Math.random() * 5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life -= this.decay;
    this.size *= 0.98;
  }

  draw(ctx) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class ChessGame {
  constructor() {
    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');
    
    this.squareSize = 80;
    this.canvas.width = this.squareSize * 8;
    this.canvas.height = this.squareSize * 8;
    
    this.theme = THEMES.royal;
    this.currentTheme = 'royal';
    
    this.engine = new ChessEngine();
    this.ai = new ChessAI(4);
    
    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.particles = [];
    this.animating = false;
    
    this.setupParticles();
    this.init();
    this.animate();
  }

  setupParticles() {
    const particleCanvas = document.getElementById('particles');
    if (particleCanvas) {
      this.particleCtx = particleCanvas.getContext('2d');
      particleCanvas.width = window.innerWidth;
      particleCanvas.height = window.innerHeight;
      
      this.bgParticles = [];
      for (let i = 0; i < 50; i++) {
        this.bgParticles.push({
          x: Math.random() * particleCanvas.width,
          y: Math.random() * particleCanvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 3 + 1,
          alpha: Math.random() * 0.5 + 0.1
        });
      }
    }
  }

  init() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    document.getElementById('newGame')?.addEventListener('click', () => this.newGame());
    document.getElementById('undo')?.addEventListener('click', () => this.undo());
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 't') this.cycleTheme();
    });
    
    this.render();
    this.updateStatus();
  }

  cycleTheme() {
    const themes = Object.keys(THEMES);
    const idx = themes.indexOf(this.currentTheme);
    this.currentTheme = themes[(idx + 1) % themes.length];
    this.theme = THEMES[this.currentTheme];
    this.render();
  }

  newGame() {
    this.engine = new ChessEngine();
    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.render();
    this.updateStatus();
  }

  undo() {
    if (this.engine.undo()) {
      if (this.engine.turn === 'b' && this.engine.history.length > 0) {
        this.engine.undo();
      }
      this.selected = null;
      this.legalMoves = [];
      this.render();
      this.updateStatus();
    }
  }

  getSquare(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      row: Math.floor((e.clientY - rect.top) / this.squareSize),
      col: Math.floor((e.clientX - rect.left) / this.squareSize)
    };
  }

  handleClick(e) {
    if (this.animating || this.engine.gameOver || this.engine.turn !== 'w') return;
    
    const sq = this.getSquare(e);
    const piece = this.engine.at(sq.row, sq.col);
    
    if (this.selected) {
      const move = this.legalMoves.find(m => m.to.row === sq.row && m.to.col === sq.col);
      if (move) {
        this.makeMove(move);
        return;
      }
      if (piece?.color === 'w') {
        this.select(sq);
      } else {
        this.selected = null;
        this.legalMoves = [];
        this.render();
      }
    } else if (piece?.color === 'w') {
      this.select(sq);
    }
  }

  select(sq) {
    this.selected = sq;
    this.legalMoves = this.engine.legalMoves('w').filter(m => 
      m.from.row === sq.row && m.from.col === sq.col
    );
    this.render();
  }

  makeMove(move) {
    const fromX = move.from.col * this.squareSize + this.squareSize / 2;
    const fromY = move.from.row * this.squareSize + this.squareSize / 2;
    const toX = move.to.col * this.squareSize + this.squareSize / 2;
    const toY = move.to.row * this.squareSize + this.squareSize / 2;
    
    this.spawnParticles(fromX, fromY, this.theme.accent);
    this.spawnParticles(toX, toY, '#fff');
    
    if (this.engine.at(move.to.row, move.to.col) || move.special === 'enpassant') {
      this.spawnCaptureParticles(toX, toY);
    }
    
    this.lastMove = { from: move.from, to: move.to };
    this.engine.makeMove(move);
    this.selected = null;
    this.legalMoves = [];
    this.render();
    this.updateStatus();
    
    if (!this.engine.gameOver) {
      setTimeout(() => this.makeAIMove(), 100);
    }
  }

  spawnParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  spawnCaptureParticles(x, y) {
    for (let i = 0; i < 30; i++) {
      this.particles.push(new Particle(x, y, '#ff6b6b'));
    }
    for (let i = 0; i < 20; i++) {
      this.particles.push(new Particle(x, y, '#ffd93d'));
    }
  }

  makeAIMove() {
    if (this.engine.gameOver || this.engine.turn !== 'b') return;
    
    this.animating = true;
    this.statusEl.textContent = '✨ AI is thinking...';
    
    setTimeout(() => {
      const move = this.ai.bestMove(this.engine);
      if (move) {
        const toX = move.to.col * this.squareSize + this.squareSize / 2;
        const toY = move.to.row * this.squareSize + this.squareSize / 2;
        this.spawnParticles(toX, toY, '#e74c3c');
        
        this.lastMove = { from: move.from, to: move.to };
        this.engine.makeMove(move);
      }
      this.animating = false;
      this.render();
      this.updateStatus();
    }, 50);
  }

  updateStatus() {
    if (this.engine.gameOver) {
      const msgs = { '1-0': '🎉 White wins!', '0-1': '💀 Black wins!', '1/2-1/2': '🤝 Draw!' };
      this.statusEl.textContent = msgs[this.engine.result] || 'Game over';
    } else {
      const turn = this.engine.turn === 'w' ? '♔ White' : '♚ Black';
      const check = this.engine.inCheck(this.engine.turn) ? ' ⚠️ Check!' : '';
      this.statusEl.textContent = `${turn} to move${check}`;
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        this.ctx.fillStyle = isLight ? this.theme.light : this.theme.dark;
        this.ctx.fillRect(c * this.squareSize, r * this.squareSize, this.squareSize, this.squareSize);
        
        if (this.lastMove) {
          if ((r === this.lastMove.from.row && c === this.lastMove.from.col) ||
              (r === this.lastMove.to.row && c === this.lastMove.to.col)) {
            this.ctx.fillStyle = 'rgba(155, 199, 0, 0.4)';
            this.ctx.fillRect(c * this.squareSize, r * this.squareSize, this.squareSize, this.squareSize);
          }
        }
        
        if (this.selected && r === this.selected.row && c === this.selected.col) {
          this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
          this.ctx.fillRect(c * this.squareSize, r * this.squareSize, this.squareSize, this.squareSize);
        }
        
        if (this.engine.inCheck(this.engine.turn)) {
          const king = this.engine.findKing(this.engine.turn);
          if (king && r === king.row && c === king.col) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            this.ctx.fillRect(c * this.squareSize, r * this.squareSize, this.squareSize, this.squareSize);
          }
        }
        
        const piece = this.engine.at(r, c);
        if (piece) {
          this.ctx.font = `${this.squareSize * 0.8}px serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
          this.ctx.shadowBlur = 4;
          this.ctx.fillStyle = '#000';
          this.ctx.fillText(PIECE_SYMBOLS[piece.color + piece.type], 
            c * this.squareSize + this.squareSize / 2,
            r * this.squareSize + this.squareSize / 2);
          this.ctx.shadowBlur = 0;
        }
        
        if (this.legalMoves.some(m => m.to.row === r && m.to.col === c)) {
          this.ctx.fillStyle = 'rgba(0, 128, 0, 0.5)';
          this.ctx.beginPath();
          this.ctx.arc(c * this.squareSize + this.squareSize / 2, 
            r * this.squareSize + this.squareSize / 2, 
            this.squareSize / 6, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
    
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => p.draw(this.ctx));
  }

  animate() {
    if (this.particleCtx && this.bgParticles) {
      this.particleCtx.clearRect(0, 0, this.particleCtx.canvas.width, this.particleCtx.canvas.height);
      
      const gradient = this.particleCtx.createLinearGradient(0, 0, 0, this.particleCtx.canvas.height);
      this.theme.bg.forEach((color, i) => gradient.addColorStop(i / (this.theme.bg.length - 1), color));
      this.particleCtx.fillStyle = gradient;
      this.particleCtx.fillRect(0, 0, this.particleCtx.canvas.width, this.particleCtx.canvas.height);
      
      this.bgParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > this.particleCtx.canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > this.particleCtx.canvas.height) p.vy *= -1;
        
        this.particleCtx.globalAlpha = p.alpha;
        this.particleCtx.fillStyle = this.theme.accent;
        this.particleCtx.beginPath();
        this.particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.particleCtx.fill();
      });
      this.particleCtx.globalAlpha = 1;
    }
    
    if (this.particles.length > 0) this.render();
    requestAnimationFrame(() => this.animate());
  }
}

new ChessGame();