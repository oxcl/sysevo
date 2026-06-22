import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

class ChessGame {
  constructor() {
    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');
    
    this.squareSize = 80;
    this.canvas.width = this.squareSize * 8;
    this.canvas.height = this.squareSize * 8;
    
    this.engine = new ChessEngine();
    this.ai = new ChessAI(4);
    
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.animating = false;
    
    this.lightColor = '#f0d9b5';
    this.darkColor = '#b58863';
    this.selectedColor = 'rgba(255, 255, 0, 0.5)';
    this.moveColor = 'rgba(0, 128, 0, 0.4)';
    this.lastMoveColor = 'rgba(155, 199, 0, 0.4)';
    this.checkColor = 'rgba(255, 0, 0, 0.5)';
    
    this.pieceSymbols = {
      'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
      'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
    };
    
    this.init();
  }

  init() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.draw();
    this.updateStatus();
  }

  getSquareFromMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      row: Math.floor(y / this.squareSize),
      col: Math.floor(x / this.squareSize)
    };
  }

  handleClick(e) {
    if (this.animating || this.engine.gameOver || this.engine.turn !== 'w') return;
    
    const square = this.getSquareFromMouse(e);
    const piece = this.engine.getPiece(square.row, square.col);
    
    if (this.selectedSquare) {
      const move = this.legalMoves.find(m => 
        m.to.row === square.row && m.to.col === square.col
      );
      
      if (move) {
        this.makeMove(move);
        return;
      }
      
      if (piece && piece.color === 'w') {
        this.selectSquare(square);
      } else {
        this.selectedSquare = null;
        this.legalMoves = [];
        this.draw();
      }
    } else if (piece && piece.color === 'w') {
      this.selectSquare(square);
    }
  }

  selectSquare(square) {
    this.selectedSquare = square;
    this.legalMoves = this.engine.generateLegalMoves('w').filter(m => 
      m.from.row === square.row && m.from.col === square.col
    );
    this.draw();
  }

  makeMove(move) {
    this.lastMove = { from: move.from, to: move.to };
    this.engine.makeMove(move);
    this.selectedSquare = null;
    this.legalMoves = [];
    this.draw();
    this.updateStatus();
    
    if (!this.engine.gameOver) {
      setTimeout(() => this.makeAIMove(), 100);
    }
  }

  makeAIMove() {
    if (this.engine.gameOver || this.engine.turn !== 'b') return;
    
    this.animating = true;
    this.statusEl.textContent = 'AI is thinking...';
    
    setTimeout(() => {
      const move = this.ai.findBestMove(this.engine);
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        this.engine.makeMove(move);
      }
      this.animating = false;
      this.draw();
      this.updateStatus();
    }, 50);
  }

  updateStatus() {
    if (this.engine.gameOver) {
      if (this.engine.result === '1-0') {
        this.statusEl.textContent = 'White wins!';
      } else if (this.engine.result === '0-1') {
        this.statusEl.textContent = 'Black wins!';
      } else {
        this.statusEl.textContent = 'Draw!';
      }
    } else {
      const turn = this.engine.turn === 'w' ? 'White' : 'Black';
      const check = this.engine.isInCheck(this.engine.turn) ? ' (Check!)' : '';
      this.statusEl.textContent = `${turn} to move${check}`;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        this.ctx.fillStyle = isLight ? this.lightColor : this.darkColor;
        this.ctx.fillRect(col * this.squareSize, row * this.squareSize, this.squareSize, this.squareSize);
        
        if (this.lastMove) {
          if ((row === this.lastMove.from.row && col === this.lastMove.from.col) ||
              (row === this.lastMove.to.row && col === this.lastMove.to.col)) {
            this.ctx.fillStyle = this.lastMoveColor;
            this.ctx.fillRect(col * this.squareSize, row * this.squareSize, this.squareSize, this.squareSize);
          }
        }
        
        if (this.selectedSquare && row === this.selectedSquare.row && col === this.selectedSquare.col) {
          this.ctx.fillStyle = this.selectedColor;
          this.ctx.fillRect(col * this.squareSize, row * this.squareSize, this.squareSize, this.squareSize);
        }
        
        if (this.engine.isInCheck(this.engine.turn)) {
          const king = this.engine.findKing(this.engine.turn);
          if (king && row === king.row && col === king.col) {
            this.ctx.fillStyle = this.checkColor;
            this.ctx.fillRect(col * this.squareSize, row * this.squareSize, this.squareSize, this.squareSize);
          }
        }
        
        const piece = this.engine.getPiece(row, col);
        if (piece) {
          const symbol = this.pieceSymbols[piece.color + piece.type];
          this.ctx.font = `${this.squareSize * 0.8}px serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillStyle = '#000';
          this.ctx.fillText(symbol, col * this.squareSize + this.squareSize / 2, row * this.squareSize + this.squareSize / 2);
        }
        
        if (this.legalMoves.some(m => m.to.row === row && m.to.col === col)) {
          this.ctx.fillStyle = this.moveColor;
          this.ctx.beginPath();
          this.ctx.arc(col * this.squareSize + this.squareSize / 2, row * this.squareSize + this.squareSize / 2, this.squareSize / 6, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }
}

new ChessGame();