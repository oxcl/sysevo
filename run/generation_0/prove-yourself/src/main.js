/**
 * Main Application Entry - Glues together the Chess engine, AI, and UI.
 */
import Chess from './chess.js';
import { findBestMove } from './ai.js';
import ChessUI from './ui.js';

// Game state
let game;
let ui;
let playerColor = 'w'; // Player plays as White
let aiThinking = false;
let gameOver = false;

/**
 * Initialize the game.
 */
function init() {
  const canvas = document.getElementById('board-canvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  game = new Chess();

  ui = new ChessUI(canvas, onPlayerMove, onNewGame);
  ui.setGame(game);

  // Handle new game button clicks
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (ui.isOnNewGameButton(x, y)) {
      startNewGame();
    }
  });
}

/**
 * Handle a player's move.
 */
function onPlayerMove(move) {
  if (gameOver || aiThinking) return;

  // Check if player made a move (we already committed it)
  if (game.isGameOver()) {
    gameOver = true;
    ui.refresh();
    return;
  }

  // If it's the AI's turn now, trigger AI
  if (game.turn !== playerColor) {
    scheduleAIMove();
  }
}

/**
 * Schedule the AI move using setTimeout to allow UI to update.
 */
function scheduleAIMove() {
  if (aiThinking || gameOver) return;
  aiThinking = true;
  ui.setStatus('AI thinking...', 'thinking');

  // Use setTimeout to let the UI render before starting AI computation
  setTimeout(() => {
    runAIMove();
  }, 100);
}

/**
 * Run the AI move computation.
 */
function runAIMove() {
  try {
    const startTime = performance.now();
    const move = findBestMove(game, 200); // 200ms max
    const elapsed = performance.now() - startTime;

    if (move && !gameOver) {
      // Execute the AI move with animation
      ui._executeMove(move);
    } else if (!gameOver) {
      // AI couldn't find a move (shouldn't happen in normal play)
      aiThinking = false;
      ui.setStatus('AI has no moves', 'error');
    }
  } catch (e) {
    console.error('AI error:', e);
    aiThinking = false;
    ui.setStatus('AI error', 'error');
  }
}

/**
 * Called by UI when a move animation completes.
 * We override the commitMove behavior to track AI thinking state.
 */
// We need to hook into the UI's commitMove to know when AI finishes
// Let's patch it

const originalCommitMove = ChessUI.prototype._commitMove;
ChessUI.prototype._commitMove = function(move) {
  // Call original
  originalCommitMove.call(this, move);

  // If the AI just moved, update state
  if (aiThinking) {
    aiThinking = false;
    if (game.isGameOver()) {
      gameOver = true;
    }
  }
};

/**
 * Start a new game.
 */
function startNewGame() {
  game = new Chess();
  gameOver = false;
  aiThinking = false;
  ui.setGame(game);
  ui.refresh();
}

/**
 * Handle the new game button from UI.
 */
function onNewGame() {
  startNewGame();
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  init();
});

// Also handle if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}
