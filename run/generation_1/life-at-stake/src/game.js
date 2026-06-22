import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

const SYMBOLS = {
  wK:'\u2654',wQ:'\u2655',wR:'\u2656',wB:'\u2657',wN:'\u2658',wP:'\u2659',
  bK:'\u265A',bQ:'\u265B',bR:'\u265C',bB:'\u265D',bN:'\u265E',bP:'\u265F'
};

const SQ = 70;
const SIZE = 560;

class ChessGame {
  constructor() {
    try {
      this.engine = new ChessEngine();
      this.ai = new ChessAI();
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) throw new Error('Failed to get canvas context');
      this.canvas.width = SIZE;
      this.canvas.height = SIZE + 40;
      document.body.appendChild(this.canvas);

      this.selected = null;
      this.legalMoves = [];
      this.lastMove = null;
      this.gameOver = false;
      this.animating = false;

      this.canvas.addEventListener('click', (e) => this.onClick(e));
      this.draw();
    } catch (err) {
      this.showError(err.message);
    }
  }

  showError(msg) {
    const el = document.getElementById('error-display');
    if (el) el.textContent = 'Error: ' + msg;
  }

  getSquare(e) {
    try {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (y >= SIZE || y < 0 || x < 0 || x >= SIZE) return null;
      const c = Math.floor(x / SQ);
      const r = Math.floor(y / SQ);
      return (r >= 0 && r < 8 && c >= 0 && c < 8) ? [r, c] : null;
    } catch (err) {
      return null;
    }
  }

  onClick(e) {
    try {
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
      this.draw();
    } catch (err) {
      this.showError(err.message);
    }
  }

  showPromotion(move) {
    try {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;';
      const box = document.createElement('div');
      box.style.cssText = 'background:#2a2a3e;padding:20px;border-radius:10px;display:flex;gap:10px;';
      for (const p of ['Q','R','B','N']) {
        const btn = document.createElement('button');
        btn.textContent = SYMBOLS['w' + p];
        btn.style.cssText = 'font-size:40px;width:60px;height:60px;border:none;background:#3a3a4e;color:white;cursor:pointer;border-radius:8px;';
        btn.addEventListener('click', () => {
          try {
            document.body.removeChild(ov);
            move.promotion = p;
            this.doMove(move);
          } catch (err) { this.showError(err.message); }
        });
        box.appendChild(btn);
      }
      ov.appendChild(box);
      document.body.appendChild(ov);
    } catch (err) {
      this.showError(err.message);
    }
  }

  doMove(move) {
    try {
      this.engine.applyMove(move);
      this.lastMove = move;
      this.selected = null;
      this.legalMoves = [];
      this.draw();
      this.checkEnd();
      if (!this.gameOver) {
        this.animating = true;
        setTimeout(() => this.doAIMove(), 100);
      }
    } catch (err) {
      this.showError(err.message);
    }
  }

  doAIMove() {
    try {
      const move = this.ai.getBestMove(this.engine);
      if (move) {
        this.engine.applyMove(move);
        this.lastMove = move;
      }
      this.animating = false;
      this.draw();
      this.checkEnd();
    } catch (err) {
      this.animating = false;
      this.showError(err.message);
    }
  }

  checkEnd() {
    try {
      if (this.engine.isCheckmate()) {
        this.gameOver = true;
        const w = this.engine.turn === 'w' ? 'Black' : 'White';
        this.drawStatus(`Checkmate! ${w} wins!`);
      } else if (this.engine.isStalemate()) {
        this.gameOver = true;
        this.drawStatus('Stalemate! Draw.');
      } else if (this.engine.isDraw()) {
        this.gameOver = true;
        this.drawStatus('Draw!');
      }
    } catch (err) {
      this.showError(err.message);
    }
  }

  drawStatus(msg) {
    try {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, SIZE, SIZE);
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 24px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(msg, SIZE/2, SIZE/2);
    } catch (err) { /* silent */ }
  }

  draw() {
    try {
      const ctx = this.ctx;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const x = c * SQ, y = r * SQ;
          ctx.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#b58863';
          ctx.fillRect(x, y, SQ, SQ);

          if (this.lastMove && ((r === this.lastMove.from[0] && c === this.lastMove.from[1]) || (r === this.lastMove.to[0] && c === this.lastMove.to[1]))) {
            ctx.fillStyle = 'rgba(255,255,0,0.3)';
            ctx.fillRect(x, y, SQ, SQ);
          }

          if (this.selected && r === this.selected[0] && c === this.selected[1]) {
            ctx.fillStyle = 'rgba(0,128,255,0.4)';
            ctx.fillRect(x, y, SQ, SQ);
          }

          if (this.legalMoves.some(m => m.to[0] === r && m.to[1] === c)) {
            ctx.fillStyle = 'rgba(0,128,0,0.3)';
            ctx.fillRect(x, y, SQ, SQ);
            ctx.beginPath();
            ctx.arc(x + SQ/2, y + SQ/2, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,128,0,0.5)';
            ctx.fill();
          }

          const piece = this.engine.board[r][c];
          if (piece) {
            ctx.font = `${SQ * 0.7}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = piece[0] === 'w' ? '#fff' : '#000';
            ctx.fillText(SYMBOLS[piece], x + SQ/2, y + SQ/2 + 2);
            ctx.strokeStyle = piece[0] === 'w' ? '#000' : '#fff';
            ctx.lineWidth = 0.5;
            ctx.strokeText(SYMBOLS[piece], x + SQ/2, y + SQ/2 + 2);
          }
        }
      }

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, SIZE, SIZE, 40);
      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const turn = this.engine.turn === 'w' ? 'White' : 'Black';
      const check = this.engine.inCheck(this.engine.turn) ? ' (Check!)' : '';
      ctx.fillText(`${turn}'s turn${check}`, SIZE/2, SIZE + 20);
    } catch (err) {
      this.showError(err.message);
    }
  }
}

new ChessGame();
