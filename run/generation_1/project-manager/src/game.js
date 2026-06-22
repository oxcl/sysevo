/**
 * Game Module
 * ===========
 * UI rendering and game controller.
 * 
 * @module Game
 */
import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

const PIECE_SYMBOLS = {
  wK:'\u2654',wQ:'\u2655',wR:'\u2656',wB:'\u2657',wN:'\u2658',wP:'\u2659',
  bK:'\u265A',bQ:'\u265B',bR:'\u265C',bB:'\u265D',bN:'\u265E',bP:'\u265F'
};

const SQUARE_SIZE = 70;
const BOARD_SIZE = 560;
const LIGHT_SQUARE = '#f0d9b5';
const DARK_SQUARE = '#b58863';
const SELECTED_HIGHLIGHT = 'rgba(0, 128, 255, 0.4)';
const LEGAL_MOVE_HIGHLIGHT = 'rgba(0, 128, 0, 0.3)';
const LAST_MOVE_HIGHLIGHT = 'rgba(255, 255, 0, 0.3)';

class ChessGameUI {
  constructor() {
    this.engine = new ChessEngine();
    this.ai = new ChessAI();
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = BOARD_SIZE;
    this.canvas.height = BOARD_SIZE + 40;
    document.body.appendChild(this.canvas);

    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.gameOver = false;
    this.isAIThinking = false;

    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.render();
  }

  getSquareFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (y >= BOARD_SIZE) return null;
    const col = Math.floor(x / SQUARE_SIZE);
    const row = Math.floor(y / SQUARE_SIZE);
    return this.engine.isOnBoard(row, col) ? [row, col] : null;
  }

  handleClick(event) {
    if (this.gameOver || this.isAIThinking || this.engine.turn !== 'w') return;

    const square = this.getSquareFromEvent(event);
    if (!square) return;
    const [row, col] = square;

    if (this.selectedSquare) {
      const move = this.legalMoves.find(m => m.to[0] === row && m.to[1] === col);
      if (move) {
        if (move.promotion) { this.showPromotionDialog(move); return; }
        this.executePlayerMove(move);
        return;
      }
    }

    const piece = this.engine.board[row][col];
    if (piece && piece[0] === 'w') {
      this.selectedSquare = [row, col];
      this.legalMoves = this.engine.getLegalMoves(row, col);
    } else {
      this.clearSelection();
    }
    this.render();
  }

  clearSelection() {
    this.selectedSquare = null;
    this.legalMoves = [];
  }

  showPromotionDialog(move) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;';

    const container = document.createElement('div');
    container.style.cssText = 'background:#2a2a3e;padding:20px;border-radius:10px;display:flex;gap:10px;';

    for (const pieceType of ['Q', 'R', 'B', 'N']) {
      const button = document.createElement('button');
      button.textContent = PIECE_SYMBOLS['w' + pieceType];
      button.style.cssText = 'font-size:40px;width:60px;height:60px;border:none;background:#3a3a4e;color:white;cursor:pointer;border-radius:8px;';
      button.addEventListener('click', () => {
        document.body.removeChild(overlay);
        move.promotion = pieceType;
        this.executePlayerMove(move);
      });
      container.appendChild(button);
    }

    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }

  executePlayerMove(move) {
    this.engine.executeMove(move);
    this.lastMove = move;
    this.clearSelection();
    this.render();
    this.checkGameEnd();
    if (!this.gameOver) {
      this.isAIThinking = true;
      setTimeout(() => this.executeAIMove(), 100);
    }
  }

  executeAIMove() {
    const aiMove = this.ai.findBestMove(this.engine);
    if (aiMove) {
      this.engine.executeMove(aiMove);
      this.lastMove = aiMove;
    }
    this.isAIThinking = false;
    this.render();
    this.checkGameEnd();
  }

  checkGameEnd() {
    if (this.engine.isCheckmate()) {
      this.gameOver = true;
      const winner = this.engine.turn === 'w' ? 'Black' : 'White';
      this.renderGameOver(`Checkmate! ${winner} wins!`);
    } else if (this.engine.isStalemate()) {
      this.gameOver = true;
      this.renderGameOver('Stalemate! Draw.');
    } else if (this.engine.isDraw()) {
      this.gameOver = true;
      this.renderGameOver('Draw!');
    }
  }

  renderGameOver(message) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(message, BOARD_SIZE / 2, BOARD_SIZE / 2);
  }

  render() {
    const ctx = this.ctx;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const x = col * SQUARE_SIZE;
        const y = row * SQUARE_SIZE;

        ctx.fillStyle = (row + col) % 2 === 0 ? LIGHT_SQUARE : DARK_SQUARE;
        ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);

        if (this.lastMove && ((row === this.lastMove.from[0] && col === this.lastMove.from[1]) || (row === this.lastMove.to[0] && col === this.lastMove.to[1]))) {
          ctx.fillStyle = LAST_MOVE_HIGHLIGHT;
          ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
        }

        if (this.selectedSquare && row === this.selectedSquare[0] && col === this.selectedSquare[1]) {
          ctx.fillStyle = SELECTED_HIGHLIGHT;
          ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
        }

        if (this.legalMoves.some(m => m.to[0] === row && m.to[1] === col)) {
          ctx.fillStyle = LEGAL_MOVE_HIGHLIGHT;
          ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
          ctx.beginPath();
          ctx.arc(x + SQUARE_SIZE / 2, y + SQUARE_SIZE / 2, 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 128, 0, 0.5)';
          ctx.fill();
        }

        const piece = this.engine.board[row][col];
        if (piece) {
          ctx.font = `${SQUARE_SIZE * 0.7}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = piece[0] === 'w' ? '#ffffff' : '#000000';
          ctx.fillText(PIECE_SYMBOLS[piece], x + SQUARE_SIZE / 2, y + SQUARE_SIZE / 2 + 2);
          ctx.strokeStyle = piece[0] === 'w' ? '#000000' : '#ffffff';
          ctx.lineWidth = 0.5;
          ctx.strokeText(PIECE_SYMBOLS[piece], x + SQUARE_SIZE / 2, y + SQUARE_SIZE / 2 + 2);
        }
      }
    }

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, BOARD_SIZE, BOARD_SIZE, 40);
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const turnText = this.engine.turn === 'w' ? 'White' : 'Black';
    const checkText = this.engine.isKingInCheck(this.engine.turn) ? ' (Check!)' : '';
    ctx.fillText(`${turnText}'s turn${checkText}`, BOARD_SIZE / 2, BOARD_SIZE + 20);
  }
}

new ChessGameUI();
