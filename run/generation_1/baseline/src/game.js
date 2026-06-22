import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

const PIECE_SYMBOLS = {
  wK: '\u2654', wQ: '\u2655', wR: '\u2656', wB: '\u2657', wN: '\u2658', wP: '\u2659',
  bK: '\u265A', bQ: '\u265B', bR: '\u265C', bB: '\u265D', bN: '\u265E', bP: '\u265F'
};

class ChessGame {
  constructor() {
    this.engine = new ChessEngine();
    this.ai = new ChessAI(4);
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 560;
    this.canvas.height = 560;
    document.body.appendChild(this.canvas);

    this.squareSize = 70;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.gameOver = false;
    this.animating = false;

    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.draw();
  }

  getSquareFromMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / this.squareSize);
    const row = Math.floor(y / this.squareSize);
    if (row >= 0 && row < 8 && col >= 0 && col < 8) return [row, col];
    return null;
  }

  handleClick(e) {
    if (this.gameOver || this.animating || this.engine.turn !== 'w') return;
    const sq = this.getSquareFromMouse(e);
    if (!sq) return;
    const [r, c] = sq;

    if (this.selectedSquare) {
      const move = this.legalMoves.find(m => m.to[0] === r && m.to[1] === c);
      if (move) {
        if (move.promotion) {
          this.showPromotionUI(move);
          return;
        }
        this.makePlayerMove(move);
        return;
      }
    }

    const piece = this.engine.board[r][c];
    if (piece && piece[0] === 'w') {
      this.selectedSquare = [r, c];
      this.legalMoves = this.engine.getLegalMoves(r, c);
    } else {
      this.selectedSquare = null;
      this.legalMoves = [];
    }
    this.draw();
  }

  showPromotionUI(move) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#2a2a3e;padding:20px;border-radius:10px;display:flex;gap:10px;';

    for (const piece of ['Q', 'R', 'B', 'N']) {
      const btn = document.createElement('button');
      btn.textContent = PIECE_SYMBOLS['w' + piece];
      btn.style.cssText = 'font-size:40px;width:60px;height:60px;border:none;background:#3a3a4e;color:white;cursor:pointer;border-radius:8px;';
      btn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        move.promotion = piece;
        this.makePlayerMove(move);
      });
      box.appendChild(btn);
    }
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  makePlayerMove(move) {
    this.engine.makeMove(move);
    this.lastMove = move;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.draw();
    this.checkGameEnd();
    if (!this.gameOver) {
      this.animating = true;
      setTimeout(() => this.makeAIMove(), 100);
    }
  }

  makeAIMove() {
    const move = this.ai.getBestMove(this.engine);
    if (move) {
      this.engine.makeMove(move);
      this.lastMove = move;
    }
    this.animating = false;
    this.draw();
    this.checkGameEnd();
  }

  checkGameEnd() {
    if (this.engine.isCheckmate()) {
      this.gameOver = true;
      this.drawStatus('Checkmate! ' + (this.engine.turn === 'w' ? 'Black' : 'White') + ' wins!');
    } else if (this.engine.isStalemate()) {
      this.gameOver = true;
      this.drawStatus('Stalemate! Draw.');
    } else if (this.engine.isDraw()) {
      this.gameOver = true;
      this.drawStatus('Draw!');
    }
  }

  drawStatus(msg) {
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(0, 0, 560, 560);
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(msg, 280, 280);
  }

  draw() {
    const ctx = this.ctx;
    const sq = this.squareSize;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        ctx.fillStyle = isLight ? '#f0d9b5' : '#b58863';
        ctx.fillRect(c * sq, r * sq, sq, sq);

        if (this.lastMove) {
          if ((r === this.lastMove.from[0] && c === this.lastMove.from[1]) ||
              (r === this.lastMove.to[0] && c === this.lastMove.to[1])) {
            ctx.fillStyle = 'rgba(255,255,0,0.3)';
            ctx.fillRect(c * sq, r * sq, sq, sq);
          }
        }

        if (this.selectedSquare && r === this.selectedSquare[0] && c === this.selectedSquare[1]) {
          ctx.fillStyle = 'rgba(0,128,255,0.4)';
          ctx.fillRect(c * sq, r * sq, sq, sq);
        }

        if (this.legalMoves.some(m => m.to[0] === r && m.to[1] === c)) {
          ctx.fillStyle = 'rgba(0,128,0,0.3)';
          ctx.fillRect(c * sq, r * sq, sq, sq);
          ctx.beginPath();
          ctx.arc(c * sq + sq/2, r * sq + sq/2, 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,128,0,0.5)';
          ctx.fill();
        }

        const piece = this.engine.board[r][c];
        if (piece) {
          ctx.font = `${sq * 0.7}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = piece[0] === 'w' ? '#fff' : '#000';
          ctx.fillText(PIECE_SYMBOLS[piece], c * sq + sq/2, r * sq + sq/2 + 2);
          ctx.strokeStyle = piece[0] === 'w' ? '#000' : '#fff';
          ctx.lineWidth = 0.5;
          ctx.strokeText(PIECE_SYMBOLS[piece], c * sq + sq/2, r * sq + sq/2 + 2);
        }
      }
    }

    for (let i = 0; i <= 8; i++) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, i * sq);
      ctx.lineTo(560, i * sq);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * sq, 0);
      ctx.lineTo(i * sq, 560);
      ctx.stroke();
    }

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 560, 560, 40);
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    const turn = this.engine.turn === 'w' ? 'White' : 'Black';
    const check = this.engine.isInCheck(this.engine.turn) ? ' (Check!)' : '';
    ctx.fillText(`${turn}'s turn${check}`, 280, 580);
  }
}

new ChessGame();
