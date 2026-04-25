/**
 * Flamboyent Chess - Main Entry Point
 */

import { Chess, COLORS } from './chess.js';
import { getBestMove } from './ai.js';
import { ChessUI } from './ui.js';

class FlamboyentChessApp {
  constructor() {
    this.chess = new Chess();
    this.ui = null;
    this.gameMode = 'player-vs-ai'; // 'player-vs-ai' or 'player-vs-player'
    this.isAIThinking = false;

    this._init();
  }

  _init() {
    // Get canvas element
    const canvas = document.getElementById('chess-canvas');
    if (!canvas) {
      console.error('Canvas element not found!');
      return;
    }

    // Create UI
    this.ui = new ChessUI(this.chess, canvas);

    // Set up buttons
    this._setupButtons();

    // Update initial status
    this.ui._updateStatus();
  }

  _setupButtons() {
    const newGameBtn = document.getElementById('btn-new-game');
    const undoBtn = document.getElementById('btn-undo');
    const flipBtn = document.getElementById('btn-flip');

    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => {
        this.ui.resetGame();
        this.ui._updateStatus();
      });
    }

    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        if (this.chess.moveHistory.length > 0) {
          // Undo both AI and player moves (undo last 2 moves)
          this.chess.undoMove();
          if (this.chess.turn !== COLORS.WHITE && this.chess.moveHistory.length > 0) {
            this.chess.undoMove();
          }
          this.ui.selectedSquare = null;
          this.ui.legalMoves = [];
          this.ui.lastMove = this.chess.moveHistory.length > 0
            ? { from: this.chess.moveHistory[this.chess.moveHistory.length - 1].from,
                to: this.chess.moveHistory[this.chess.moveHistory.length - 1].to }
            : null;
          this.ui._updateStatus();
        }
      });
    }

    if (flipBtn) {
      flipBtn.addEventListener('click', () => {
        // Board flip - could add this feature later
        // For now, just visual feedback
        flipBtn.classList.toggle('active');
      });
    }
  }
}

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new FlamboyentChessApp();

  // Expose for debugging
  window.__chessApp = app;
});
