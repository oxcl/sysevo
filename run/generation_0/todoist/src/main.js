import { Game } from './game.js';

/**
 * Entry point for the Chess application.
 */
function init() {
  const canvas = document.getElementById('chess-canvas');
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Create the game
  const game = new Game(canvas);

  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      game.renderer.resize();
      game.render();
    }, 100);
  });
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
