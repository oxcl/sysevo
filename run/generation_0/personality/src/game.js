// Game Controller
// Orchestrates the chess engine, AI, renderer, and user interactions.

import {
  createInitialGameState,
  makeMove,
  getLegalMovesForPiece,
  getLegalMovesForColor,
  isInCheck,
  opponentColor,
  findKing,
} from './chess.js';

import { Renderer } from './renderer.js';
import { findBestMove } from './ai.js';

// ============================================================
// Game Class
// ============================================================

export class Game {
  constructor(canvasId, statusId, promotionOverlayId, gameOverOverlayId) {
    this.canvas = document.getElementById(canvasId);
    this.statusBar = document.getElementById(statusId);
    this.promotionOverlay = document.getElementById(promotionOverlayId);
    this.gameOverOverlay = document.getElementById(gameOverOverlayId);

    this.renderer = new Renderer(this.canvas);
    this.state = createInitialGameState();

    // Interaction state
    this.selectedSquare = null;
    this.legalMoves = null;
    this.draggingPiece = null;
    this.dragPos = null;
    this.isDragging = false;
    this.dragStartPos = null;

    // AI state
    this.aiThinking = false;
    this.playerColor = 'white';
    this.aiColor = 'black';

    // Promotion pending state
    this.pendingPromotion = null;

    // Animation frame
    this.animFrameId = null;

    // Bind methods
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handlePromotion = this.handlePromotion.bind(this);
    this.handleNewGame = this.handleNewGame.bind(this);
    this.handleFlipBoard = this.handleFlipBoard.bind(this);
    this.handlePlayAgain = this.handlePlayAgain.bind(this);

    // Setup event listeners
    this.setupEventListeners();

    // Initial render
    this.render();
    this.updateStatus();
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });

    window.addEventListener('resize', this.handleResize);

    // Promotion dialog
    const promoButtons = this.promotionOverlay.querySelectorAll('button');
    for (const btn of promoButtons) {
      btn.addEventListener('click', () => {
        this.handlePromotion(btn.dataset.piece);
      });
    }

    // Game over dialog
    document.getElementById('btn-play-again').addEventListener('click', this.handlePlayAgain);

    // Control buttons
    document.getElementById('btn-new-game').addEventListener('click', this.handleNewGame);
    document.getElementById('btn-flip-board').addEventListener('click', this.handleFlipBoard);
  }

  handleResize() {
    this.renderer.resize();
    this.render();
  }

  handleNewGame() {
    this.state = createInitialGameState();
    this.selectedSquare = null;
    this.legalMoves = null;
    this.draggingPiece = null;
    this.dragPos = null;
    this.isDragging = false;
    this.aiThinking = false;
    this.pendingPromotion = null;
    this.gameOverOverlay.classList.remove('active');
    this.render();
    this.updateStatus();
  }

  handlePlayAgain() {
    this.handleNewGame();
  }

  handleFlipBoard() {
    this.renderer.toggleFlip();
    this.render();
  }

  // ============================================================
  // Mouse/Touch Event Handlers
  // ============================================================

  getEventPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    return { x, y };
  }

  handleMouseDown(e) {
    if (this.state.gameOver || this.aiThinking) return;
    if (this.state.turn !== this.playerColor) return;

    const pos = this.getEventPos(e);
    const boardPos = this.renderer.canvasToBoard(pos.x, pos.y);
    if (!boardPos) return;

    const piece = this.state.board[boardPos.row][boardPos.col];
    if (!piece || piece.color !== this.playerColor) {
      // Try to move to this square (click-to-move from a selection)
      if (this.selectedSquare) {
        this.tryMoveTo(boardPos);
      }
      return;
    }

    // Select the piece
    this.selectedSquare = boardPos;
    this.legalMoves = getLegalMovesForPiece(
      this.state.board, boardPos.row, boardPos.col,
      this.state.castlingRights, this.state.enPassantTarget, this.state.moveHistory
    );

    this.isDragging = true;
    this.draggingPiece = boardPos;
    this.dragStartPos = { ...boardPos };
    this.dragPos = pos;

    this.render();
  }

  handleMouseMove(e) {
    if (!this.isDragging || !this.draggingPiece) return;
    const pos = this.getEventPos(e);
    this.dragPos = pos;
    this.render();
  }

  handleMouseUp(e) {
    if (!this.isDragging || !this.draggingPiece) {
      this.isDragging = false;
      this.draggingPiece = null;
      this.dragPos = null;
      return;
    }

    const pos = this.getEventPos(e);
    const boardPos = this.renderer.canvasToBoard(pos.x, pos.y);

    if (boardPos) {
      this.tryMoveTo(boardPos);
    } else {
      // Drag outside board - deselect
      this.selectedSquare = null;
      this.legalMoves = null;
    }

    this.isDragging = false;
    this.draggingPiece = null;
    this.dragPos = null;
    this.render();
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    this.canvas.dispatchEvent(mouseEvent);
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    this.canvas.dispatchEvent(mouseEvent);
  }

  handleTouchEnd(e) {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    this.canvas.dispatchEvent(mouseEvent);
  }

  // ============================================================
  // Move Logic
  // ============================================================

  tryMoveTo(targetPos) {
    if (!this.selectedSquare) return;

    const { row: fromRow, col: fromCol } = this.selectedSquare;
    const { row: toRow, col: toCol } = targetPos;

    // Check if there's a legal move to this square
    const matchingMoves = this.legalMoves.filter(m => m.to.row === toRow && m.to.col === toCol);
    if (matchingMoves.length === 0) {
      // Deselect
      this.selectedSquare = null;
      this.legalMoves = null;
      this.render();
      return;
    }

    // Handle promotion
    const promotionMoves = matchingMoves.filter(m => m.promotion);
    if (promotionMoves.length > 0) {
      this.pendingPromotion = { fromRow, fromCol, toRow, toCol, matchingMoves };
      this.showPromotionDialog();
      return;
    }

    // Execute the move
    const move = matchingMoves[0];
    this.executeMove(move);
  }

  showPromotionDialog() {
    this.promotionOverlay.classList.add('active');
  }

  handlePromotion(pieceType) {
    this.promotionOverlay.classList.remove('active');
    if (!this.pendingPromotion) return;

    const { toRow, toCol, matchingMoves } = this.pendingPromotion;
    this.pendingPromotion = null;

    const move = matchingMoves.find(m => m.promotion === pieceType);
    if (move) {
      this.executeMove(move);
    } else {
      // Fallback to queen
      const queenMove = matchingMoves.find(m => m.promotion === 'queen');
      if (queenMove) this.executeMove(queenMove);
    }
  }

  executeMove(move) {
    const newState = makeMove(this.state, move);
    if (!newState) return;

    this.state = newState;
    this.selectedSquare = null;
    this.legalMoves = null;
    this.render();
    this.updateStatus();

    // Check game over
    if (this.state.gameOver) {
      this.showGameOver();
      return;
    }

    // Trigger AI move
    if (this.state.turn === this.aiColor && !this.state.gameOver) {
      this.scheduleAIMove();
    }
  }

  // ============================================================
  // AI
  // ============================================================

  scheduleAIMove() {
    this.aiThinking = true;
    this.updateStatus();
    this.render();

    // Use setTimeout to let the UI update before AI computation
    setTimeout(() => {
      const move = findBestMove(this.state, 220);
      this.aiThinking = false;

      if (move) {
        this.state = makeMove(this.state, move);
        this.selectedSquare = null;
        this.legalMoves = null;
        this.render();
        this.updateStatus();

        if (this.state.gameOver) {
          this.showGameOver();
        }
      } else {
        // No legal moves - should be game over already
        this.render();
        this.updateStatus();
        if (this.state.gameOver) {
          this.showGameOver();
        }
      }
    }, 50);
  }

  // ============================================================
  // UI Updates
  // ============================================================

  updateStatus() {
    if (this.state.gameOver) {
      if (this.state.winner === 'white') {
        this.statusBar.textContent = 'White wins!';
      } else if (this.state.winner === 'black') {
        this.statusBar.textContent = 'Black wins!';
      } else if (this.state.drawReason) {
        this.statusBar.textContent = `Draw - ${this.state.drawReason}`;
      } else {
        this.statusBar.textContent = 'Game Over';
      }
    } else if (this.aiThinking) {
      this.statusBar.textContent = 'Black (AI) is thinking...';
    } else if (this.state.turn === this.playerColor) {
      this.statusBar.textContent = 'Your turn';
    } else {
      this.statusBar.textContent = `${this.state.turn === 'white' ? 'White' : 'Black'}'s turn`;
    }
  }

  showGameOver() {
    const title = document.getElementById('game-over-title');
    const message = document.getElementById('game-over-message');

    if (this.state.winner === 'white') {
      title.textContent = 'You Win!';
      message.textContent = 'Congratulations! Checkmate!';
    } else if (this.state.winner === 'black') {
      title.textContent = 'AI Wins!';
      message.textContent = 'Better luck next time!';
    } else if (this.state.drawReason) {
      title.textContent = 'Draw';
      message.textContent = `Game drawn by ${this.state.drawReason}.`;
    } else {
      title.textContent = 'Game Over';
      message.textContent = '';
    }

    this.gameOverOverlay.classList.add('active');
  }

  // ============================================================
  // Render Loop
  // ============================================================

  render() {
    this.renderer.render(
      this.state,
      this.selectedSquare,
      this.legalMoves,
      this.draggingPiece,
      this.dragPos
    );
  }
}
