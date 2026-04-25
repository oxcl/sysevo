// Main Entry Point
// Initializes the Game and starts the application.

import { Game } from './game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game('chess-canvas', 'status-bar', 'promotion-overlay', 'game-over-overlay');

  // Expose game instance for debugging (optional)
  window.__game = game;
});
