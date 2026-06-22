import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

const SYMBOLS = {
  wK:'\u2654',wQ:'\u2655',wR:'\u2656',wB:'\u2657',wN:'\u2658',wP:'\u2659',
  bK:'\u265A',bQ:'\u265B',bR:'\u265C',bB:'\u265D',bN:'\u265E',bP:'\u265F'
};

const SQ = 70, CANVAS = 560;
const LIGHT = '#f0d9b5', DARK = '#b58863';
const SEL = 'rgba(0,128,255,0.4)', MOVE = 'rgba(0,128,0,0.3)', LAST = 'rgba(255,255,0,0.3)';

class Game {
  constructor() {
    this.engine = new ChessEngine();
    this.ai = new ChessAI();
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS;
    this.canvas.height = CANVAS + 40;
    document.body.appendChild(this.canvas);

    this.sel = null;
    this.moves = [];
    this.last = null;
    this.over = false;
    this.busy = false;

    this.canvas.addEventListener('click', e => this.click(e));
    this.draw();
  }

  sq(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (y >= CANVAS) return null;
    const c = Math.floor(x / SQ), row = Math.floor(y / SQ);
    return (row >= 0 && row < 8 && c >= 0 && c < 8) ? [row, c] : null;
  }

  click(e) {
    if (this.over || this.busy || this.engine.turn !== 'w') return;
    const s = this.sq(e);
    if (!s) return;
    const [r, c] = s;

    if (this.sel) {
      const m = this.moves.find(m => m.to[0] === r && m.to[1] === c);
      if (m) {
        if (m.promotion) { this.promo(m); return; }
        this.doMove(m);
        return;
      }
    }

    const p = this.engine.board[r][c];
    if (p && p[0] === 'w') {
      this.sel = [r, c];
      this.moves = this.engine.legal(r, c);
    } else {
      this.sel = null;
      this.moves = [];
    }
    this.draw();
  }

  promo(move) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#2a2a3e;padding:20px;border-radius:10px;display:flex;gap:10px;';
    for (const p of ['Q','R','B','N']) {
      const b = document.createElement('button');
      b.textContent = SYMBOLS['w' + p];
      b.style.cssText = 'font-size:40px;width:60px;height:60px;border:none;background:#3a3a4e;color:white;cursor:pointer;border-radius:8px;';
      b.onclick = () => { document.body.removeChild(ov); move.promotion = p; this.doMove(move); };
      box.appendChild(b);
    }
    ov.appendChild(box);
    document.body.appendChild(ov);
  }

  doMove(move) {
    this.engine.apply(move);
    this.last = move;
    this.sel = null;
    this.moves = [];
    this.draw();
    this.checkEnd();
    if (!this.over) {
      this.busy = true;
      setTimeout(() => {
        const m = this.ai.getBestMove(this.engine);
        if (m) { this.engine.apply(m); this.last = m; }
        this.busy = false;
        this.draw();
        this.checkEnd();
      }, 100);
    }
  }

  checkEnd() {
    if (this.engine.isCheckmate()) {
      this.over = true;
      const w = this.engine.turn === 'w' ? 'Black' : 'White';
      this.drawMsg(`Checkmate! ${w} wins!`);
    } else if (this.engine.isStalemate()) {
      this.over = true;
      this.drawMsg('Stalemate! Draw.');
    } else if (this.engine.isDraw()) {
      this.over = true;
      this.drawMsg('Draw!');
    }
  }

  drawMsg(msg) {
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(0, 0, CANVAS, CANVAS);
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(msg, CANVAS/2, CANVAS/2);
  }

  draw() {
    const ctx = this.ctx;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = c * SQ, y = r * SQ;
        ctx.fillStyle = (r+c)%2===0 ? LIGHT : DARK;
        ctx.fillRect(x, y, SQ, SQ);

        if (this.last && ((r===this.last.from[0]&&c===this.last.from[1])||(r===this.last.to[0]&&c===this.last.to[1]))) {
          ctx.fillStyle = LAST; ctx.fillRect(x, y, SQ, SQ);
        }
        if (this.sel && r===this.sel[0] && c===this.sel[1]) {
          ctx.fillStyle = SEL; ctx.fillRect(x, y, SQ, SQ);
        }
        if (this.moves.some(m => m.to[0]===r && m.to[1]===c)) {
          ctx.fillStyle = MOVE; ctx.fillRect(x, y, SQ, SQ);
          ctx.beginPath();
          ctx.arc(x+SQ/2, y+SQ/2, 8, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(0,128,0,0.5)';
          ctx.fill();
        }

        const p = this.engine.board[r][c];
        if (p) {
          ctx.font = `${SQ*0.7}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = p[0]==='w' ? '#fff' : '#000';
          ctx.fillText(SYMBOLS[p], x+SQ/2, y+SQ/2+2);
          ctx.strokeStyle = p[0]==='w' ? '#000' : '#fff';
          ctx.lineWidth = 0.5;
          ctx.strokeText(SYMBOLS[p], x+SQ/2, y+SQ/2+2);
        }
      }
    }

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, CANVAS, CANVAS, 40);
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const t = this.engine.turn === 'w' ? 'White' : 'Black';
    const ch = this.engine.inCheck(this.engine.turn) ? ' (Check!)' : '';
    ctx.fillText(`${t}'s turn${ch}`, CANVAS/2, CANVAS+20);
  }
}

new Game();
