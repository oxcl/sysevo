import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

const SYM = {
  wK:'\u2654',wQ:'\u2655',wR:'\u2656',wB:'\u2657',wN:'\u2658',wP:'\u2659',
  bK:'\u265A',bQ:'\u265B',bR:'\u265C',bB:'\u265D',bN:'\u265E',bP:'\u265F'
};

const SQ = 72, CANVAS = 576, PAD = 8;
const LIGHT = '#f0d9b5', DARK = '#b58863';
const SEL_LIGHT = 'rgba(100, 200, 255, 0.5)', SEL_DARK = 'rgba(80, 160, 220, 0.5)';
const MOVE_LIGHT = 'rgba(0, 200, 100, 0.4)', MOVE_DARK = 'rgba(0, 180, 80, 0.4)';
const LAST_LIGHT = 'rgba(255, 215, 0, 0.35)', LAST_DARK = 'rgba(220, 180, 0, 0.35)';

class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.life = 1;
    this.decay = 0.015 + Math.random() * 0.025;
    this.size = 2 + Math.random() * 5;
    this.color = color;
  }
  update() { this.x += this.vx; this.y += this.vy; this.vy += 0.12; this.life -= this.decay; }
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
    this.canvas.width = CANVAS + PAD * 2;
    this.canvas.height = CANVAS + PAD * 2 + 48;
    document.body.appendChild(this.canvas);

    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.gameOver = false;
    this.busy = false;
    this.particles = [];
    this.phase = 0;
    this.statusMsg = '';

    this.canvas.addEventListener('click', e => this.onClick(e));
    this.animate();
  }

  sq(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left - PAD, y = e.clientY - r.top - PAD;
    if (y < 0 || y >= CANVAS || x < 0 || x >= CANVAS) return null;
    const c = Math.floor(x / SQ), row = Math.floor(y / SQ);
    return (row >= 0 && row < 8 && c >= 0 && c < 8) ? [row, c] : null;
  }

  onClick(e) {
    if (this.gameOver || this.busy || this.engine.turn !== 'w') return;
    const s = this.sq(e);
    if (!s) return;
    const [r, c] = s;

    if (this.selected) {
      const m = this.legalMoves.find(m => m.to[0] === r && m.to[1] === c);
      if (m) { if (m.promotion) { this.showPromo(m); return; } this.doMove(m); return; }
    }

    const p = this.engine.board[r][c];
    if (p && p[0] === 'w') {
      this.selected = [r, c];
      this.legalMoves = this.engine.legalMoves(r, c);
    } else { this.selected = null; this.legalMoves = []; }
  }

  showPromo(move) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100;';
    const box = document.createElement('div');
    box.style.cssText = 'background:linear-gradient(135deg,#2a2a4e,#1a1a3e);padding:24px;border-radius:16px;display:flex;gap:14px;box-shadow:0 0 40px rgba(100,100,255,0.4);';
    for (const p of ['Q','R','B','N']) {
      const b = document.createElement('button');
      b.textContent = SYM['w' + p];
      b.style.cssText = 'font-size:48px;width:72px;height:72px;border:2px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.08);color:white;cursor:pointer;border-radius:12px;transition:all 0.2s;';
      b.onmouseover = () => { b.style.background = 'rgba(255,255,255,0.2)'; b.style.transform = 'scale(1.1)'; };
      b.onmouseout = () => { b.style.background = 'rgba(255,255,255,0.08)'; b.style.transform = 'scale(1)'; };
      b.onclick = () => { document.body.removeChild(ov); move.promotion = p; this.doMove(move); };
      box.appendChild(b);
    }
    ov.appendChild(box);
    document.body.appendChild(ov);
  }

  spawnParticles(r, c, color) {
    const x = PAD + c * SQ + SQ / 2, y = PAD + r * SQ + SQ / 2;
    const cols = color === 'w' ? ['#fff', '#ddd', '#bbb'] : ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6'];
    for (let i = 0; i < 18; i++) this.particles.push(new Particle(x, y, cols[i % cols.length]));
  }

  doMove(move) {
    const cap = this.engine.board[move.to[0]][move.to[1]];
    if (cap) this.spawnParticles(move.to[0], move.to[1], cap[0]);
    this.engine.applyMove(move);
    this.lastMove = move;
    this.selected = null;
    this.legalMoves = [];
    this.checkEnd();
    if (!this.gameOver) {
      this.busy = true;
      setTimeout(() => {
        const am = this.ai.getBestMove(this.engine);
        if (am) {
          const ac = this.engine.board[am.to[0]][am.to[1]];
          if (ac) this.spawnParticles(am.to[0], am.to[1], ac[0]);
          this.engine.applyMove(am);
          this.lastMove = am;
        }
        this.busy = false;
        this.checkEnd();
      }, 50);
    }
  }

  checkEnd() {
    if (this.engine.isCheckmate()) {
      this.gameOver = true;
      this.statusMsg = `Checkmate! ${this.engine.turn === 'w' ? 'Black' : 'White'} wins!`;
    } else if (this.engine.isStalemate()) {
      this.gameOver = true;
      this.statusMsg = 'Stalemate! Draw.';
    } else if (this.engine.isDraw()) {
      this.gameOver = true;
      this.statusMsg = 'Draw!';
    }
  }

  animate() {
    this.phase += 0.06;
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => p.update());
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = PAD + c * SQ, y = PAD + r * SQ;
        const isLight = (r + c) % 2 === 0;
        ctx.fillStyle = isLight ? LIGHT : DARK;
        ctx.fillRect(x, y, SQ, SQ);

        if (this.lastMove && ((r === this.lastMove.from[0] && c === this.lastMove.from[1]) || (r === this.lastMove.to[0] && c === this.lastMove.to[1]))) {
          ctx.fillStyle = isLight ? LAST_LIGHT : LAST_DARK;
          ctx.fillRect(x, y, SQ, SQ);
        }

        if (this.selected && r === this.selected[0] && c === this.selected[1]) {
          ctx.fillStyle = isLight ? SEL_LIGHT : SEL_DARK;
          ctx.fillRect(x, y, SQ, SQ);
        }

        if (this.legalMoves.some(m => m.to[0] === r && m.to[1] === c)) {
          ctx.fillStyle = isLight ? MOVE_LIGHT : MOVE_DARK;
          ctx.fillRect(x, y, SQ, SQ);
          const pulse = 7 + Math.sin(this.phase) * 2;
          ctx.beginPath();
          ctx.arc(x + SQ/2, y + SQ/2, pulse, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 200, 100, 0.5)';
          ctx.fill();
        }

        const piece = this.engine.board[r][c];
        if (piece) {
          const isW = piece[0] === 'w';
          ctx.font = `${SQ * 0.68}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = isW ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 6;
          ctx.fillStyle = isW ? '#ffffff' : '#1a1a2e';
          ctx.fillText(SYM[piece], x + SQ/2, y + SQ/2 + 2);
          ctx.shadowBlur = 0;
        }
      }
    }

    this.particles.forEach(p => p.draw(ctx));

    const sy = PAD + CANVAS + 8;
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(PAD - 4, sy, CANVAS + 8, 36);
    ctx.fillStyle = '#e0e0ff';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const t = this.engine.turn === 'w' ? 'White' : 'Black';
    const ch = this.engine.inCheck(this.engine.turn) ? ' - Check!' : '';
    ctx.fillText(this.gameOver ? this.statusMsg : `${t}'s turn${ch}`, CANVAS / 2 + PAD, sy + 18);
  }
}

new ChessGame();
