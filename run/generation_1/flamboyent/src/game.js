import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

const SYMBOLS = {
  wK:'\u2654',wQ:'\u2655',wR:'\u2656',wB:'\u2657',wN:'\u2658',wP:'\u2659',
  bK:'\u265A',bQ:'\u265B',bR:'\u265C',bB:'\u265D',bN:'\u265E',bP:'\u265F'
};

const SQ = 70;
const SIZE = 560;
const LIGHT = '#e8d5b5';
const DARK = '#b58863';
const SEL_LIGHT = 'rgba(100, 200, 255, 0.5)';
const SEL_DARK = 'rgba(80, 160, 220, 0.5)';
const MOVE_COLOR = 'rgba(0, 200, 100, 0.4)';
const LAST_COLOR = 'rgba(255, 215, 0, 0.35)';

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.03;
    this.size = 3 + Math.random() * 4;
    this.color = color;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life -= this.decay;
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
    this.engine = new ChessEngine();
    this.ai = new ChessAI();
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = SIZE;
    this.canvas.height = SIZE + 40;
    document.body.appendChild(this.canvas);

    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.gameOver = false;
    this.particles = [];
    this.animating = false;
    this.hoverSquare = null;
    this.pulsePhase = 0;

    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.onHover(e));
    this.animate();
  }

  getSquare(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (y >= SIZE) return null;
    const c = Math.floor(x / SQ);
    const r = Math.floor(y / SQ);
    return (r >= 0 && r < 8 && c >= 0 && c < 8) ? [r, c] : null;
  }

  onHover(e) {
    this.hoverSquare = this.getSquare(e);
  }

  onClick(e) {
    if (this.gameOver || this.animating || this.engine.turn !== 'w') return;
    const sq = this.getSquare(e);
    if (!sq) return;
    const [r, c] = sq;

    if (this.selected) {
      const move = this.legalMoves.find(m => m.to[0] === r && m.to[1] === c);
      if (move) {
        if (move.promotion) { this.showPromotion(move); return; }
        this.doMove(move);
        return;
      }
    }

    const piece = this.engine.board[r][c];
    if (piece && piece[0] === 'w') {
      this.selected = [r, c];
      this.legalMoves = this.engine.legalMoves(r, c);
    } else {
      this.selected = null;
      this.legalMoves = [];
    }
  }

  showPromotion(move) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100;';
    const box = document.createElement('div');
    box.style.cssText = 'background:linear-gradient(135deg,#2a2a4e,#1a1a3e);padding:20px;border-radius:16px;display:flex;gap:12px;box-shadow:0 0 30px rgba(100,100,255,0.3);';
    for (const p of ['Q','R','B','N']) {
      const btn = document.createElement('button');
      btn.textContent = SYMBOLS['w' + p];
      btn.style.cssText = 'font-size:44px;width:64px;height:64px;border:2px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);color:white;cursor:pointer;border-radius:12px;transition:all 0.2s;';
      btn.onmouseover = () => btn.style.background = 'rgba(255,255,255,0.25)';
      btn.onmouseout = () => btn.style.background = 'rgba(255,255,255,0.1)';
      btn.onclick = () => { document.body.removeChild(ov); move.promotion = p; this.doMove(move); };
      box.appendChild(btn);
    }
    ov.appendChild(box);
    document.body.appendChild(ov);
  }

  spawnParticles(r, c, color) {
    const x = c * SQ + SQ / 2;
    const y = r * SQ + SQ / 2;
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6'];
    for (let i = 0; i < 15; i++) {
      this.particles.push(new Particle(x, y, color === 'w' ? '#fff' : colors[i % colors.length]));
    }
  }

  doMove(move) {
    const captured = this.engine.board[move.to[0]][move.to[1]];
    if (captured) this.spawnParticles(move.to[0], move.to[1], captured[0]);
    this.engine.applyMove(move);
    this.lastMove = move;
    this.selected = null;
    this.legalMoves = [];
    this.checkEnd();
    if (!this.gameOver) {
      this.animating = true;
      setTimeout(() => {
        const aiMove = this.ai.getBestMove(this.engine);
        if (aiMove) {
          const cap = this.engine.board[aiMove.to[0]][aiMove.to[1]];
          if (cap) this.spawnParticles(aiMove.to[0], aiMove.to[1], cap[0]);
          this.engine.applyMove(aiMove);
          this.lastMove = aiMove;
        }
        this.animating = false;
        this.checkEnd();
      }, 150);
    }
  }

  checkEnd() {
    if (this.engine.isCheckmate()) {
      this.gameOver = true;
      const w = this.engine.turn === 'w' ? 'Black' : 'White';
      this.statusMsg = `Checkmate! ${w} wins!`;
    } else if (this.engine.isStalemate()) {
      this.gameOver = true;
      this.statusMsg = 'Stalemate! Draw.';
    } else if (this.engine.isDraw()) {
      this.gameOver = true;
      this.statusMsg = 'Draw!';
    }
  }

  animate() {
    this.pulsePhase += 0.05;
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => p.update());
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  draw() {
    const ctx = this.ctx;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = c * SQ, y = r * SQ;
        const isLight = (r + c) % 2 === 0;

        ctx.fillStyle = isLight ? LIGHT : DARK;
        ctx.fillRect(x, y, SQ, SQ);

        if (this.lastMove && ((r === this.lastMove.from[0] && c === this.lastMove.from[1]) || (r === this.lastMove.to[0] && c === this.lastMove.to[1]))) {
          ctx.fillStyle = LAST_COLOR;
          ctx.fillRect(x, y, SQ, SQ);
        }

        if (this.selected && r === this.selected[0] && c === this.selected[1]) {
          ctx.fillStyle = isLight ? SEL_LIGHT : SEL_DARK;
          ctx.fillRect(x, y, SQ, SQ);
        }

        if (this.legalMoves.some(m => m.to[0] === r && m.to[1] === c)) {
          ctx.fillStyle = MOVE_COLOR;
          ctx.fillRect(x, y, SQ, SQ);
          const pulse = 6 + Math.sin(this.pulsePhase) * 2;
          ctx.beginPath();
          ctx.arc(x + SQ/2, y + SQ/2, pulse, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 200, 100, 0.6)';
          ctx.fill();
        }

        const piece = this.engine.board[r][c];
        if (piece) {
          const isW = piece[0] === 'w';
          ctx.font = `${SQ * 0.7}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = isW ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 8;
          ctx.fillStyle = isW ? '#ffffff' : '#1a1a2e';
          ctx.fillText(SYMBOLS[piece], x + SQ/2, y + SQ/2 + 2);
          ctx.shadowBlur = 0;
        }
      }
    }

    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, SIZE, SIZE, 40);
    ctx.fillStyle = '#e0e0ff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const turn = this.engine.turn === 'w' ? 'White' : 'Black';
    const check = this.engine.inCheck(this.engine.turn) ? ' - Check!' : '';
    ctx.fillText(this.gameOver ? this.statusMsg : `${turn}'s turn${check}`, SIZE/2, SIZE + 20);

    this.particles.forEach(p => p.draw(ctx));
  }
}

new ChessGame();
