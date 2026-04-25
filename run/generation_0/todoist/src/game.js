import { Board } from './board.js';
import { Renderer } from './renderer.js';
import { AI } from './ai.js';
import {
  WHITE, BLACK, QUEEN, ROOK, BISHOP, KNIGHT,
  PIECE_SYMBOLS
} from './constants.js';

/**
 * Main game controller that wires everything together.
 */
export class Game {
  constructor(canvas) {
    this.board = new Board();
    this.renderer = new Renderer(canvas);
    this.ai = new AI(3);

    this.selectedSquare = null;
    this.validMoves = null;
    this.isAnimating = false;
    this.isAiThinking = false;
    this.promotionPending = false;
    this.promotionMove = null;

    this.setupInput(canvas);
    this.setupPromotionUI();

    // Status bar
    this.statusBar = document.getElementById('status-bar');
    this.turnWhite = document.getElementById('turn-white');
    this.turnBlack = document.getElementById('turn-black');
    this.moveCountEl = document.getElementById('move-count');

    this.updateUI();
    this.render();

    // If AI goes first (it plays black, so white starts)
    // Nothing to do
  }

  setupInput(canvas) {
    const handleClick = (clientX, clientY) => {
      if (this.isAnimating || this.isAiThinking || this.promotionPending) return;

      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) * (canvas.width / rect.width / (window.devicePixelRatio || 1));
      const y = (clientY - rect.top) * (canvas.height / rect.height / (window.devicePixelRatio || 1));

      const square = this.renderer.getSquareFromPixel(x, y);
      if (!square) return;

      // Check for game over - click to restart
      if (this.board.gameOver) {
        this.restart();
        return;
      }

      this.handleSquareClick(square);
    };

    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
      handleClick(e.clientX, e.clientY);
    });

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleClick(touch.clientX, touch.clientY);
    }, { passive: false });
  }

  setupPromotionUI() {
    this.promotionOverlay = document.getElementById('promotion-overlay');
    this.promotionDialog = document.getElementById('promotion-dialog');

    const pieces = [QUEEN, ROOK, BISHOP, KNIGHT];
    this.promotionDialog.innerHTML = '';
    for (const type of pieces) {
      const btn = document.createElement('div');
      btn.className = 'promotion-btn';
      btn.textContent = PIECE_SYMBOLS[WHITE][type]; // We'll set color based on context
      btn.dataset.type = type;
      btn.addEventListener('click', () => {
        this.handlePromotion(type);
      });
      this.promotionDialog.appendChild(btn);
    }
  }

  handleSquareClick(square) {
    const piece = this.board.getPiece(square.row, square.col);

    // If we have a valid move selected, try to move
    if (this.selectedSquare && this.validMoves) {
      const matchingMove = this.validMoves.find(
        m => m.row === square.row && m.col === square.col
      );

      if (matchingMove) {
        this.executeMove({
          from: this.selectedSquare,
          to: matchingMove,
          piece: this.board.getPiece(this.selectedSquare.row, this.selectedSquare.col)
        });
        return;
      }
    }

    // Select a new piece (if it's the current player's piece)
    if (piece && piece.color === this.board.turn) {
      this.selectedSquare = square;
      const pseudoMoves = this.board.getPseudoLegalMoves(square.row, square.col, true);
      this.validMoves = pseudoMoves;
      this.render();
      return;
    }

    // Deselect
    this.selectedSquare = null;
    this.validMoves = null;
    this.render();
  }

  async executeMove(move) {
    const from = move.from;
    const to = move.to;
    const piece = move.piece;

    // Check for pawn promotion
    if (piece.type === 'p' && (to.row === 0 || to.row === 7)) {
      // Show promotion UI
      this.promotionPending = true;
      this.promotionMove = move;
      this.showPromotionDialog(piece.color);
      return;
    }

    await this.applyMove(move);
  }

  async applyMove(move, promotionPiece = null) {
    this.isAnimating = true;
    this.selectedSquare = null;
    this.validMoves = null;

    if (promotionPiece) {
      move.to.promotion = promotionPiece;
    }

    // Store piece before move for animation
    const piece = this.board.getPiece(move.from.row, move.from.col);

    // Apply the move on the board
    this.board.applyMove(move, false);

    // Animate
    await this.renderer.animateMove(move.from, move.to, piece, this.board);

    this.isAnimating = false;
    this.updateUI();

    // Check game state
    const state = this.board.getGameState();
    if (state) {
      this.render();
      return;
    }

    // If it's now AI's turn (Black), trigger AI
    if (this.board.turn === BLACK) {
      this.triggerAI();
    } else {
      this.render();
    }
  }

  showPromotionDialog(color) {
    const buttons = this.promotionDialog.querySelectorAll('.promotion-btn');
    const pieces = [QUEEN, ROOK, BISHOP, KNIGHT];
    buttons.forEach((btn, i) => {
      btn.textContent = PIECE_SYMBOLS[color][pieces[i]];
      btn.style.color = color === WHITE ? '#fff' : '#1a1a1a';
    });
    this.promotionOverlay.style.display = 'flex';
  }

  hidePromotionDialog() {
    this.promotionOverlay.style.display = 'none';
  }

  handlePromotion(type) {
    if (!this.promotionPending || !this.promotionMove) return;
    this.hidePromotionDialog();
    this.promotionPending = false;
    const move = this.promotionMove;
    this.promotionMove = null;
    this.applyMove(move, type);
  }

  async triggerAI() {
    this.isAiThinking = true;
    this.statusBar.textContent = 'AI is thinking...';
    this.render();

    // Yield to let the UI update
    await new Promise(r => setTimeout(r, 50));

    const move = this.ai.getBestMove(this.board);
    this.isAiThinking = false;

    if (!move) {
      this.statusBar.textContent = 'AI has no moves!';
      this.board.getGameState();
      this.render();
      return;
    }

    await this.applyMove(move);
  }

  updateUI() {
    // Update turn indicators
    this.turnWhite.classList.toggle('active-turn', this.board.turn === WHITE);
    this.turnBlack.classList.toggle('active-turn', this.board.turn === BLACK);

    this.moveCountEl.textContent = `Move #${this.board.moveCount}`;

    // Status
    if (this.board.gameOver) {
      const result = this.board.gameResult;
      if (result === '1-0') this.statusBar.textContent = 'White wins!';
      else if (result === '0-1') this.statusBar.textContent = 'Black wins!';
      else this.statusBar.textContent = 'Draw!';
    } else if (this.board.inCheck) {
      this.statusBar.textContent = 'Check!';
    } else {
      this.statusBar.textContent = this.board.turn === WHITE ? "White's turn" : "Black's turn";
    }
  }

  render() {
    this.renderer.render(
      this.board,
      this.selectedSquare,
      this.validMoves,
      this.statusBar.textContent,
      this.isAnimating
    );
  }

  restart() {
    this.board = new Board();
    this.selectedSquare = null;
    this.validMoves = null;
    this.isAnimating = false;
    this.isAiThinking = false;
    this.promotionPending = false;
    this.promotionMove = null;
    this.updateUI();
    this.render();
  }
}
