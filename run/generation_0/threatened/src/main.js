/**
 * Chess UI - Canvas rendering, animations, and interaction.
 */

import { ChessGame, WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, PIECE_SYMBOLS } from './chess.js';
import { ChessAI } from './ai.js';

// ─── Configuration ─────────────────────────────────────────────

const COLORS = {
  light: '#f0d9b5',
  dark: '#b58863',
  lightLast: '#cdd26a',
  darkLast: '#aaa23a',
  selected: 'rgba(255, 255, 0, 0.45)',
  validMove: 'rgba(0, 0, 0, 0.15)',
  validCapture: 'rgba(0, 0, 0, 0.35)',
  check: 'rgba(255, 0, 0, 0.55)',
  validMoveDot: 'rgba(0, 0, 0, 0.25)',
  borderGlow: 'rgba(255, 255, 255, 0.08)',
};

const ANIMATION_DURATION = 180; // ms for piece movement

// ─── State ─────────────────────────────────────────────────────

const game = new ChessGame();
const ai = new ChessAI('medium');

let canvas, ctx;
let boardSize, cellSize, padding;
let selectedSquare = null;
let validMoves = [];
let flipped = false;
let isAnimating = false;
let isAIThinking = false;
let animationQueue = [];
let dragState = null; // { piece, fromRow, fromCol, offsetX, offsetY }

// ─── DOM Elements ──────────────────────────────────────────────

const turnIcon = document.getElementById('turn-icon');
const turnText = document.getElementById('turn-text');
const moveCountEl = document.getElementById('move-count');
const capturedWhiteEl = document.getElementById('captured-white');
const capturedBlackEl = document.getElementById('captured-black');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverIcon = document.getElementById('game-over-icon');
const gameOverReason = document.getElementById('game-over-reason');
const newGameBtn = document.getElementById('new-game-btn');
const newGameBtnSmall = document.getElementById('new-game-btn-small');
const undoBtn = document.getElementById('undo-btn');
const flipBtn = document.getElementById('flip-btn');
const promotionOverlay = document.getElementById('promotion-overlay');
const promoPieces = document.getElementById('promotion-pieces');

let pendingPromotion = null; // { move }
let resizeTimeout = null;

// ─── Initialization ────────────────────────────────────────────

export function init() {
  canvas = document.getElementById('board-canvas');
  ctx = canvas.getContext('2d');

  setupCanvas();
  setupEventListeners();
  render();

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(setupCanvas, 100);
  });
}

function setupCanvas() {
  const wrapper = canvas.parentElement;
  const rect = wrapper.getBoundingClientRect();
  const size = Math.floor(rect.width);
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  padding = 0;
  boardSize = size;
  cellSize = boardSize / 8;

  render();
}

// ─── Coordinates ───────────────────────────────────────────────

function boardToCanvas(row, col) {
  let r = flipped ? 7 - row : row;
  let c = flipped ? 7 - col : col;
  return {
    x: c * cellSize,
    y: r * cellSize,
  };
}

function canvasToBoard(x, y) {
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  return {
    row: flipped ? 7 - row : row,
    col: flipped ? 7 - col : col,
  };
}

// ─── Rendering ─────────────────────────────────────────────────

function render(animate = false) {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, boardSize, boardSize);

  drawBoard();
  drawLastMove();
  drawHighlights();
  drawPieces(animate);
  drawDragPiece();
  drawCoordinates();
}

function drawBoard() {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const { x, y } = boardToCanvas(row, col);
      const isLight = (row + col) % 2 === 0;
      ctx.fillStyle = isLight ? COLORS.light : COLORS.dark;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

function drawLastMove() {
  if (!game.lastMove) return;

  const from = boardToCanvas(game.lastMove.from.row, game.lastMove.from.col);
  const to = boardToCanvas(game.lastMove.to.row, game.lastMove.to.col);

  for (const pos of [from, to]) {
    const isLight = ((pos.y / cellSize) + (pos.x / cellSize)) % 2 === 0;
    ctx.fillStyle = isLight ? COLORS.lightLast : COLORS.darkLast;
    ctx.fillRect(pos.x, pos.y, cellSize, cellSize);
  }
}

function drawHighlights() {
  // Selected square
  if (selectedSquare) {
    const { x, y } = boardToCanvas(selectedSquare.row, selectedSquare.col);
    ctx.fillStyle = COLORS.selected;
    ctx.fillRect(x, y, cellSize, cellSize);
  }

  // Valid moves
  for (const move of validMoves) {
    const { x, y } = boardToCanvas(move.to.row, move.to.col);
    const target = game.board[move.to.row][move.to.col];
    const isEnPassant = move.enPassant;

    if (target || isEnPassant) {
      // Capture highlight - ring around the square
      ctx.strokeStyle = COLORS.validCapture;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Normal move - dot in center
      ctx.fillStyle = COLORS.validMoveDot;
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // King in check highlight
  if (game.inCheck) {
    const kingPos = game.kingPositions[game.turn];
    const { x, y } = boardToCanvas(kingPos.row, kingPos.col);
    ctx.fillStyle = COLORS.check;
    ctx.beginPath();
    ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPieces(animate) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = game.board[row][col];
      if (!piece) continue;
      // Skip the piece being dragged
      if (dragState && dragState.fromRow === row && dragState.fromCol === col) continue;

      const { x, y } = boardToCanvas(row, col);

      // Check if this piece is animating
      if (animate && animationQueue.length > 0) {
        const anim = animationQueue.find(a => a.toRow === row && a.toCol === col);
        if (anim) continue; // Will be drawn in animation
      }

      drawPiece(piece, x, y, cellSize);
    }
  }

  // Draw animating pieces
  if (animate && animationQueue.length > 0) {
    for (const anim of animationQueue) {
      // Draw at current interpolated position
      const piece = anim.piece;
      const x = anim.currentX;
      const y = anim.currentY;
      const size = cellSize;

      // Shadow for animating piece
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      drawPiece(piece, x, y, size);
      ctx.restore();
    }
  }
}

function drawPiece(piece, x, y, size) {
  const symbol = PIECE_SYMBOLS[piece.color][piece.type];
  const fontSize = Math.floor(size * 0.82);

  ctx.save();
  ctx.font = `${fontSize}px 'Segoe UI', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Slight shadow for depth
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  ctx.fillText(symbol, x + size / 2, y + size / 2 + 1);
  ctx.restore();
}

function drawDragPiece() {
  if (!dragState) return;
  const { piece, offsetX, offsetY } = dragState;
  const x = offsetX - cellSize / 2;
  const y = offsetY - cellSize / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  drawPiece(piece, x, y, cellSize);
  ctx.restore();
}

function drawCoordinates() {
  const fontSize = Math.floor(cellSize * 0.14);
  ctx.font = `${fontSize}px 'Inter', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 8; i++) {
    const idx = flipped ? 7 - i : i;

    // File (column) labels - bottom
    const file = String.fromCharCode(97 + idx); // a-h
    const { x, y: bottomY } = boardToCanvas(flipped ? 7 : 0, idx);
    ctx.fillStyle = (0 + idx) % 2 === 0 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';
    ctx.fillText(file, x + cellSize / 2, bottomY + cellSize - fontSize * 0.3);

    // Rank (row) labels - left
    const rank = String(idx + 1); // 1-8
    const { x: leftX, y } = boardToCanvas(idx, flipped ? 7 : 0);
    ctx.fillStyle = (idx + 0) % 2 === 0 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';
    ctx.fillText(rank, leftX + fontSize * 0.3, y + cellSize / 2);
  }
}

// ─── Animations ────────────────────────────────────────────────

function animateMove(fromRow, fromCol, toRow, toCol, callback) {
  const piece = game.board[toRow][toCol];
  if (!piece) { callback(); return; }

  const start = boardToCanvas(fromRow, fromCol);
  const end = boardToCanvas(toRow, toCol);

  const anim = {
    piece,
    fromRow,
    fromCol,
    toRow,
    toCol,
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
    currentX: start.x,
    currentY: start.y,
    startTime: performance.now(),
    duration: ANIMATION_DURATION,
  };

  animationQueue.push(anim);
  isAnimating = true;

  function step(timestamp) {
    const elapsed = timestamp - anim.startTime;
    const t = Math.min(elapsed / anim.duration, 1);

    // Ease-out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    anim.currentX = anim.startX + (anim.endX - anim.startX) * eased;
    anim.currentY = anim.startY + (anim.endY - anim.startY) * eased;

    render(false);
    // Draw animating pieces on top
    drawAnimatingPiece(anim);

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      animationQueue = animationQueue.filter(a => a !== anim);
      if (animationQueue.length === 0) {
        isAnimating = false;
        render(false);
        callback();
      }
    }
  }

  requestAnimationFrame(step);
}

function drawAnimatingPiece(anim) {
  const size = cellSize;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  drawPiece(anim.piece, anim.currentX, anim.currentY, size);
  ctx.restore();
}

// ─── UI Updates ────────────────────────────────────────────────

function updateStatus() {
  if (game.gameOver) {
    turnIcon.style.color = '#888';
    turnText.textContent = 'Game Over';
    return;
  }

  const whiteTurn = game.turn === WHITE;
  turnIcon.style.color = whiteTurn ? '#fff' : '#222';
  turnIcon.style.background = whiteTurn ? '#fff' : '#222';
  turnIcon.style.border = '2px solid ' + (whiteTurn ? '#ccc' : '#666');

  if (isAIThinking) {
    turnText.textContent = 'Black (AI) is thinking...';
  } else {
    turnText.textContent = (whiteTurn ? 'White' : 'Black') + "'s turn";
  }

  moveCountEl.textContent = `Move #${game.fullMoveNumber}`;
}

function updateCaptured() {
  // White pieces captured by black (shown for black side)
  const whiteCaptured = game.capturedPieces[WHITE];
  const blackCaptured = game.capturedPieces[BLACK];

  // Sort by value for nice display
  const sortVal = p => PIECE_VALUES[p.type];
  whiteCaptured.sort((a, b) => sortVal(b) - sortVal(a));
  blackCaptured.sort((a, b) => sortVal(b) - sortVal(a));

  const whiteSymbols = whiteCaptured.map(p => PIECE_SYMBOLS[WHITE][p.type]).join('');
  const blackSymbols = blackCaptured.map(p => PIECE_SYMBOLS[BLACK][p.type]).join('');

  capturedWhiteEl.textContent = blackSymbols || '';
  capturedBlackEl.textContent = whiteSymbols || '';
}

function showGameOver() {
  if (!game.gameOver) {
    gameOverOverlay.classList.remove('visible');
    gameOverOverlay.classList.add('hidden');
    return;
  }

  gameOverOverlay.classList.remove('hidden');
  gameOverOverlay.classList.add('visible');

  if (game.gameResult === '1-0') {
    gameOverIcon.textContent = '♔';
    gameOverTitle.textContent = 'White Wins!';
  } else if (game.gameResult === '0-1') {
    gameOverIcon.textContent = '♚';
    gameOverTitle.textContent = 'Black Wins!';
  } else {
    gameOverIcon.textContent = '🤝';
    gameOverTitle.textContent = 'Draw';
  }

  gameOverReason.textContent = game.gameResultReason;
}

function showPromotion(move) {
  pendingPromotion = move;
  promotionOverlay.classList.remove('hidden');
  promotionOverlay.classList.add('visible');
}

function hidePromotion() {
  pendingPromotion = null;
  promotionOverlay.classList.remove('visible');
  promotionOverlay.classList.add('hidden');
}

// ─── Move Execution ────────────────────────────────────────────

function executeMove(move) {
  const fromRow = move.from.row;
  const fromCol = move.from.col;
  const toRow = move.to.row;
  const toCol = move.to.col;

  // Apply move
  const success = game.makeMove(move);
  if (!success) return false;

  // Animate
  animateMove(fromRow, fromCol, toRow, toCol, () => {
    updateUI();
    if (!game.gameOver && game.turn === BLACK && !isAIThinking) {
      triggerAI();
    }
  });

  return true;
}

function triggerAI() {
  if (game.gameOver || game.turn !== BLACK || isAIThinking) return;

  isAIThinking = true;
  updateStatus();

  // Use setTimeout to allow UI to update before heavy computation
  setTimeout(() => {
    const move = ai.getBestMove(game);

    if (move) {
      const fromRow = move.from.row;
      const fromCol = move.from.col;
      const toRow = move.to.row;
      const toCol = move.to.col;

      game.makeMove(move);

      animateMove(fromRow, fromCol, toRow, toCol, () => {
        isAIThinking = false;
        updateUI();
        if (!game.gameOver && game.turn === WHITE) {
          // Player's turn
        } else if (!game.gameOver && game.turn === BLACK) {
          triggerAI(); // This shouldn't happen normally
        }
      });
    } else {
      isAIThinking = false;
      updateUI();
    }
  }, 50);
}

function updateUI() {
  updateStatus();
  updateCaptured();
  showGameOver();
  undoBtn.disabled = game.moveHistory.length === 0 || game.gameOver;
  render(false);
}

// ─── Event Handling ────────────────────────────────────────────

function getCanvasPos(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (boardSize / rect.width),
    y: (clientY - rect.top) * (boardSize / rect.height),
  };
}

function handleMouseDown(e) {
  if (game.gameOver || isAnimating || isAIThinking || game.turn !== WHITE) return;

  const pos = getCanvasPos(e.clientX, e.clientY);
  const boardPos = canvasToBoard(pos.x, pos.y);
  if (!boardPos) return;

  const { row, col } = boardPos;
  const piece = game.board[row][col];

  if (piece && piece.color === WHITE) {
    // Select piece or start drag
    selectedSquare = { row, col };
    validMoves = game.getLegalMoves().filter(m =>
      m.from.row === row && m.from.col === col
    );

    dragState = {
      piece,
      fromRow: row,
      fromCol: col,
      offsetX: pos.x,
      offsetY: pos.y,
    };

    render(false);
  }
}

function handleMouseMove(e) {
  if (!dragState) return;

  const pos = getCanvasPos(e.clientX, e.clientY);
  dragState.offsetX = pos.x;
  dragState.offsetY = pos.y;

  render(false);
}

function handleMouseUp(e) {
  if (!dragState) {
    // Click-to-move: check if clicking on a valid destination
    if (selectedSquare && !game.gameOver && !isAnimating && !isAIThinking && game.turn === WHITE) {
      const pos = getCanvasPos(e.clientX, e.clientY);
      const boardPos = canvasToBoard(pos.x, pos.y);
      if (!boardPos) {
        selectedSquare = null;
        validMoves = [];
        render(false);
        return;
      }

      const { row, col } = boardPos;
      const piece = game.board[row][col];

      // If clicking on own piece, select it instead
      if (piece && piece.color === WHITE) {
        selectedSquare = { row, col };
        validMoves = game.getLegalMoves().filter(m =>
          m.from.row === row && m.from.col === col
        );
        render(false);
        return;
      }

      // Try to find a valid move to this destination
      const move = validMoves.find(m => m.to.row === row && m.to.col === col);
      if (move) {
        if (move.promotion) {
          showPromotion(move);
        } else {
          executeMove(move);
        }
        selectedSquare = null;
        validMoves = [];
      } else {
        selectedSquare = null;
        validMoves = [];
        render(false);
      }
    }
    return;
  }

  if (game.gameOver || isAnimating || isAIThinking) {
    dragState = null;
    selectedSquare = null;
    validMoves = [];
    render(false);
    return;
  }

  const pos = getCanvasPos(e.clientX, e.clientY);
  const boardPos = canvasToBoard(pos.x, pos.y);

  if (boardPos) {
    const { row, col } = boardPos;
    const move = validMoves.find(m => m.to.row === row && m.to.col === col);

    if (move) {
      if (move.promotion) {
        // Auto-promote to queen for drag if we don't have promotion UI handled
        // Actually let's use the promotion overlay
        showPromotion(move);
      } else {
        executeMove(move);
      }
    }
  }

  dragState = null;
  selectedSquare = null;
  validMoves = [];
  render(false);
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
}

function handleTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
}

function handleTouchEnd(e) {
  e.preventDefault();
  // Use last known touch position
  if (e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    handleMouseUp({ clientX: touch.clientX, clientY: touch.clientY });
  } else {
    handleMouseUp({});
  }
}

// Keyboard handler
function handleKeyDown(e) {
  if (e.key === 'u' || e.key === 'U') {
    undoMove();
  }
}

// ─── Button Actions ────────────────────────────────────────────

function newGame() {
  game.reset();
  ai.nodesSearched = 0;
  selectedSquare = null;
  validMoves = [];
  dragState = null;
  isAnimating = false;
  isAIThinking = false;
  animationQueue = [];
  hidePromotion();
  gameOverOverlay.classList.remove('visible');
  gameOverOverlay.classList.add('hidden');
  updateUI();
  render(false);

  // If AI plays as white? No, AI is black. So if it's black's turn, trigger AI.
  // Actually, in a new game it's white's turn, so player goes first.
}

function undoMove() {
  if (game.moveHistory.length === 0 || game.gameOver || isAnimating || isAIThinking) return;

  // Undo both AI move and player move (or just one if only AI moved)
  game.undoMove();
  if (game.moveHistory.length > 0 && game.turn === BLACK) {
    // If after undo it's black's turn, undo one more to get back to player's turn
    game.undoMove();
  }

  selectedSquare = null;
  validMoves = [];
  updateUI();
  render(false);
}

function flipBoard() {
  flipped = !flipped;
  // Clear selection
  selectedSquare = null;
  validMoves = [];
  render(false);
  updateStatus();
}

function setupEventListeners() {
  // Mouse events
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', () => {
    if (dragState) {
      dragState = null;
      selectedSquare = null;
      validMoves = [];
      render(false);
    }
  });

  // Touch events
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  // Keyboard
  document.addEventListener('keydown', handleKeyDown);

  // Buttons
  newGameBtn.addEventListener('click', newGame);
  newGameBtnSmall.addEventListener('click', newGame);
  undoBtn.addEventListener('click', undoMove);
  flipBtn.addEventListener('click', flipBoard);

  // Promotion buttons
  promoPieces.addEventListener('click', (e) => {
    const btn = e.target.closest('.promo-btn');
    if (!btn || !pendingPromotion) return;

    const pieceType = btn.dataset.piece;
    const move = { ...pendingPromotion, promotion: pieceType };
    hidePromotion();

    if (executeMove(move)) {
      // Move was executed
    }
  });
}

// ─── Start ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
