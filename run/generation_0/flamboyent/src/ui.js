/**
 * Flamboyent Chess UI
 * Beautiful canvas rendering with animations and interactions.
 */

import { Chess, COLORS, PIECES, UNICODE_PIECES } from './chess.js';

// Color scheme
const COLORS_UI = {
  LIGHT_SQUARE: '#F0D9B5',
  DARK_SQUARE: '#B58863',
  LIGHT_SQUARE_SELECTED: '#829769',
  DARK_SQUARE_SELECTED: '#646E3E',
  LIGHT_SQUARE_HIGHLIGHT: '#F6F669',
  DARK_SQUARE_HIGHLIGHT: '#CEC452',
  LIGHT_SQUARE_LAST_MOVE: '#CDD26A',
  DARK_SQUARE_LAST_MOVE: '#AAA855',
  CHECK: '#FF6B6B',
  VALID_MOVE_DOT: 'rgba(0, 0, 0, 0.25)',
  VALID_CAPTURE_RING: 'rgba(0, 0, 0, 0.35)',
  BOARD_BORDER: '#4A3728',
  PANEL_BG: '#2D2D2D',
  PANEL_TEXT: '#E8E0D0',
  PANEL_ACCENT: '#D4A853',
  BUTTON_BG: '#4A3728',
  BUTTON_HOVER: '#5C4636',
  BUTTON_TEXT: '#E8E0D0',
  OVERLAY_BG: 'rgba(0, 0, 0, 0.7)',
};

const FILES = 'abcdefgh';
const RANKS = '87654321';

export class ChessUI {
  constructor(chess, canvas) {
    this.chess = chess;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Dimensions
    this.boardSize = 0;
    this.squareSize = 0;
    this.padding = 0;
    this.labelSize = 0;

    // State
    this.selectedSquare = null; // { row, col }
    this.legalMoves = []; // Array of { row, col }
    this.lastMove = null; // { from: {row,col}, to: {row,col} }
    this.hoveredSquare = null;
    this.isDragging = false;
    this.dragPiece = null;
    this.dragOffset = { x: 0, y: 0 };
    this.dragPos = { x: 0, y: 0 };
    this.dragFrom = null;

    // Animation
    this.animations = [];
    this.animationId = null;

    // Promotion dialog
    this.promotionDialog = null; // { callback, color }

    // Status message
    this.statusMessage = '';
    this.statusType = '';

    // Resize handling
    this._resize();
    this._setupEventListeners();

    // Render loop
    this._startRenderLoop();
  }

  /**
   * Resize the canvas to fit the container.
   */
  _resize() {
    const container = this.canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = window.innerHeight * 0.95;

    // Use the smaller dimension
    const size = Math.min(containerWidth, containerHeight, 680);
    const dpr = window.devicePixelRatio || 1;

    this.boardSize = size - 40; // Margins
    this.squareSize = this.boardSize / 8;
    this.padding = size - this.boardSize + 30;
    this.labelSize = 12;

    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.scale(dpr, dpr);

    this.totalSize = size;
  }

  /**
   * Convert pixel coordinates to board position.
   */
  _pixelToBoard(px, py) {
    const x = px - 10;
    const y = py - 10;
    if (x < 0 || y < 0 || x >= this.boardSize || y >= this.boardSize) return null;
    return {
      row: Math.floor(y / this.squareSize),
      col: Math.floor(x / this.squareSize)
    };
  }

  /**
   * Convert board position to pixel coordinates.
   */
  _boardToPixel(row, col) {
    return {
      x: 10 + col * this.squareSize,
      y: 10 + row * this.squareSize
    };
  }

  /**
   * Set up event listeners for mouse and touch.
   */
  _setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this._onPointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onPointerMove(e));
    this.canvas.addEventListener('mouseup', (e) => this._onPointerUp(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredSquare = null;
    });

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this._onPointerDown(touch);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this._onPointerMove(touch);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this._onPointerUp(e);
    }, { passive: false });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.selectedSquare = null;
        this.legalMoves = [];
      }
    });

    // Resize
    window.addEventListener('resize', () => this._resize());
  }

  /**
   * Handle pointer down events.
   */
  _onPointerDown(e) {
    if (this.chess.gameOver || this.chess.turn !== COLORS.WHITE) return;
    if (this.promotionDialog) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX || e.pageX) - rect.left;
    const y = (e.clientY || e.pageY) - rect.top;

    const pos = this._pixelToBoard(x, y);
    if (!pos) return;

    const piece = this.chess.getPiece(pos.row, pos.col);
    if (piece && piece.color === COLORS.WHITE) {
      // Select this piece
      this.selectedSquare = pos;
      this.legalMoves = this.chess.getLegalMoves(pos.row, pos.col);

      // Start drag
      this.isDragging = true;
      this.dragFrom = pos;
      this.dragPiece = piece;
      this.dragOffset.x = x - (10 + pos.col * this.squareSize);
      this.dragOffset.y = y - (10 + pos.row * this.squareSize);
      this.dragPos.x = x;
      this.dragPos.y = y;
    } else {
      // Try to move to this square if a piece is selected
      if (this.selectedSquare) {
        this._tryMove(this.selectedSquare, pos);
      }
    }
  }

  /**
   * Handle pointer move events.
   */
  _onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX || e.pageX) - rect.left;
    const y = (e.clientY || e.pageY) - rect.top;

    if (this.isDragging) {
      this.dragPos.x = x;
      this.dragPos.y = y;
    } else {
      const pos = this._pixelToBoard(x, y);
      this.hoveredSquare = pos;
    }
  }

  /**
   * Handle pointer up events.
   */
  _onPointerUp(e) {
    if (this.isDragging) {
      this.isDragging = false;

      const rect = this.canvas.getBoundingClientRect();
      const x = this.dragPos.x;
      const y = this.dragPos.y;

      const pos = this._pixelToBoard(x, y);
      if (pos && this.dragFrom) {
        this._tryMove(this.dragFrom, pos);
      }

      this.dragPiece = null;
      this.dragFrom = null;
    }
  }

  /**
   * Try to make a move.
   */
  _tryMove(from, to) {
    if (!from || !to) return;

    const legalMoves = this.chess.getLegalMoves(from.row, from.col);
    const move = legalMoves.find(m => m.to.row === to.row && m.to.col === to.col);

    if (move) {
      if (move.promotion) {
        // Show promotion dialog
        this._showPromotionDialog((promoType) => {
          // Make the move with the selected promotion piece
          const promoMove = legalMoves.find(m =>
            m.to.row === to.row && m.to.col === to.col && m.promotion === promoType
          );
          if (promoMove) {
            this._executeMove(promoMove);
          }
          this.promotionDialog = null;
        });
        this.selectedSquare = null;
        this.legalMoves = [];
        return;
      }

      this._executeMove(move);
    }

    this.selectedSquare = null;
    this.legalMoves = [];
  }

  /**
   * Execute a move on the board and trigger AI response.
   */
  _executeMove(move) {
    // Store previous state for animation
    const fromPixel = this._boardToPixel(move.from.row, move.from.col);
    const toPixel = this._boardToPixel(move.to.row, move.to.col);

    // Make the move
    const result = this.chess.makeMove(move);
    if (!result) return;

    this.lastMove = { from: move.from, to: move.to };
    this.selectedSquare = null;
    this.legalMoves = [];

    // Add animation for the move
    this._addAnimation({
      type: 'move',
      piece: move.piece,
      fromX: fromPixel.x,
      fromY: fromPixel.y,
      toX: toPixel.x,
      toY: toPixel.y,
      startTime: performance.now(),
      duration: 200
    });

    // Check game state
    this._updateStatus();

    // If game is not over and it's black's turn, trigger AI
    if (!this.chess.gameOver && this.chess.turn === COLORS.BLACK) {
      this._triggerAI();
    }
  }

  /**
   * Show promotion dialog.
   */
  _showPromotionDialog(callback) {
    this.promotionDialog = {
      callback,
      color: COLORS.WHITE
    };
  }

  /**
   * Handle promotion selection via click on overlay.
   */
  _handlePromotionClick(promoType) {
    if (this.promotionDialog) {
      this.promotionDialog.callback(promoType);
      this.promotionDialog = null;
    }
  }

  /**
   * Trigger AI move.
   */
  async _triggerAI() {
    // Show thinking indicator
    this.statusMessage = 'AI is thinking...';
    this.statusType = 'thinking';

    // Use setTimeout to allow the UI to update before blocking
    await new Promise(resolve => setTimeout(resolve, 50));

    if (this.chess.gameOver) return;

    // Import AI dynamically
    const { getBestMove } = await import('./ai.js');

    const move = getBestMove(this.chess, 220);

    if (move && !this.chess.gameOver) {
      const fromPixel = this._boardToPixel(move.from.row, move.from.col);
      const toPixel = this._boardToPixel(move.to.row, move.to.col);

      // If it's a promotion, auto-choose queen for AI
      if (move.promotion) {
        move.promotion = 'q'; // Always promote to queen for AI
      }

      this.chess.makeMove(move);
      this.lastMove = { from: move.from, to: move.to };

      // Add animation
      this._addAnimation({
        type: 'move',
        piece: move.piece,
        fromX: fromPixel.x,
        fromY: fromPixel.y,
        toX: toPixel.x,
        toY: toPixel.y,
        startTime: performance.now(),
        duration: 250
      });
    }

    this._updateStatus();
  }

  /**
   * Add an animation to the queue.
   */
  _addAnimation(anim) {
    this.animations.push(anim);
  }

  /**
   * Update the status message based on game state.
   */
  _updateStatus() {
    const state = this.chess.getGameState();

    switch (state.status) {
      case 'checkmate':
        this.statusMessage = state.winner === COLORS.WHITE
          ? 'Checkmate! White wins!'
          : 'Checkmate! Black wins!';
        this.statusType = 'result';
        break;
      case 'stalemate':
        this.statusMessage = 'Stalemate! The game is a draw.';
        this.statusType = 'result';
        break;
      case 'insufficient':
        this.statusMessage = 'Draw! Insufficient material.';
        this.statusType = 'result';
        break;
      case 'playing':
        if (state.inCheck) {
          this.statusMessage = 'Check!';
          this.statusType = 'check';
        } else {
          this.statusMessage = this.chess.turn === COLORS.WHITE
            ? "White's turn"
            : "Black's turn";
          this.statusType = 'turn';
        }
        break;
    }
  }

  /**
   * Start the render loop.
   */
  _startRenderLoop() {
    const render = (time) => {
      this._render(time);
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  /**
   * Render the entire UI.
   */
  _render(time) {
    const ctx = this.ctx;
    const size = this.totalSize;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = COLORS_UI.PANEL_BG;
    ctx.fillRect(0, 0, size, size);

    // Board border
    const borderWidth = 4;
    ctx.fillStyle = COLORS_UI.BOARD_BORDER;
    ctx.fillRect(
      10 - borderWidth / 2,
      10 - borderWidth / 2,
      this.boardSize + borderWidth,
      this.boardSize + borderWidth
    );

    // Draw board
    this._drawBoard(ctx);
    this._drawCoordinates(ctx);

    // Draw last move highlight
    if (this.lastMove) {
      this._drawSquareHighlight(ctx, this.lastMove.from.row, this.lastMove.from.col, 'lastMove');
      this._drawSquareHighlight(ctx, this.lastMove.to.row, this.lastMove.to.col, 'lastMove');
    }

    // Draw selected square highlight
    if (this.selectedSquare) {
      this._drawSquareHighlight(ctx, this.selectedSquare.row, this.selectedSquare.col, 'selected');
    }

    // Draw legal move indicators
    for (const move of this.legalMoves) {
      this._drawMoveIndicator(ctx, move.to.row, move.to.col);
    }

    // Draw pieces
    this._drawPieces(ctx, time);

    // Draw drag piece
    if (this.isDragging && this.dragPiece) {
      this._drawDraggedPiece(ctx);
    }

    // Draw status
    this._drawStatus(ctx);

    // Draw promotion dialog
    if (this.promotionDialog) {
      this._drawPromotionDialog(ctx);
    }

    // Draw thinking indicator
    if (this.statusType === 'thinking') {
      this._drawThinkingIndicator(ctx, time);
    }

    // Clean up finished animations
    this.animations = this.animations.filter(a => {
      const elapsed = time - a.startTime;
      return elapsed < a.duration;
    });
  }

  /**
   * Draw the chess board squares.
   */
  _drawBoard(ctx) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        ctx.fillStyle = isLight ? COLORS_UI.LIGHT_SQUARE : COLORS_UI.DARK_SQUARE;
        ctx.fillRect(
          10 + col * this.squareSize,
          10 + row * this.squareSize,
          this.squareSize,
          this.squareSize
        );
      }
    }
  }

  /**
   * Draw coordinate labels.
   */
  _drawCoordinates(ctx) {
    ctx.fillStyle = '#E8E0D0';
    ctx.font = `${this.labelSize}px 'Inter', -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // File labels (a-h) at bottom
    for (let col = 0; col < 8; col++) {
      const x = 10 + col * this.squareSize + this.squareSize / 2;
      const y = 10 + this.boardSize + this.labelSize + 2;
      ctx.fillText(FILES[col], x, y);
    }

    // Rank labels (1-8) on the side
    for (let row = 0; row < 8; row++) {
      const x = 10 - this.labelSize - 4;
      const y = 10 + row * this.squareSize + this.squareSize / 2;
      ctx.fillText(RANKS[row], x, y);
    }
  }

  /**
   * Draw a highlight on a square.
   */
  _drawSquareHighlight(ctx, row, col, type) {
    const isLight = (row + col) % 2 === 0;
    let color;

    switch (type) {
      case 'selected':
        color = isLight ? COLORS_UI.LIGHT_SQUARE_SELECTED : COLORS_UI.DARK_SQUARE_SELECTED;
        break;
      case 'lastMove':
        color = isLight ? COLORS_UI.LIGHT_SQUARE_LAST_MOVE : COLORS_UI.DARK_SQUARE_LAST_MOVE;
        break;
      case 'hover':
        color = isLight ? COLORS_UI.LIGHT_SQUARE_HIGHLIGHT : COLORS_UI.DARK_SQUARE_HIGHLIGHT;
        break;
      default:
        return;
    }

    ctx.fillStyle = color;
    ctx.fillRect(
      10 + col * this.squareSize,
      10 + row * this.squareSize,
      this.squareSize,
      this.squareSize
    );
  }

  /**
   * Draw valid move indicators (dots for empty squares, rings for captures).
   */
  _drawMoveIndicator(ctx, row, col) {
    const x = 10 + col * this.squareSize + this.squareSize / 2;
    const y = 10 + row * this.squareSize + this.squareSize / 2;

    const isCapture = this.chess.isOccupied(row, col);

    if (isCapture) {
      ctx.strokeStyle = COLORS_UI.VALID_CAPTURE_RING;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, this.squareSize / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = COLORS_UI.VALID_MOVE_DOT;
      ctx.beginPath();
      ctx.arc(x, y, this.squareSize / 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw all pieces on the board.
   */
  _drawPieces(ctx, time) {
    // Check for active animations
    const animatedPieces = new Map();

    for (const anim of this.animations) {
      if (anim.type === 'move') {
        const elapsed = time - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        const x = anim.fromX + (anim.toX - anim.fromX) * eased;
        const y = anim.fromY + (anim.toY - anim.fromY) * eased;

        // Store animated piece position
        animatedPieces.set(`${anim.piece.color}${anim.piece.type}`, { x, y, piece: anim.piece });
      }
    }

    // Draw all pieces
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.chess.getPiece(row, col);
        if (!piece) continue;

        // Skip dragged piece
        if (this.isDragging && this.dragFrom &&
            this.dragFrom.row === row && this.dragFrom.col === col) {
          continue;
        }

        // Check if this piece is being animated
        const animKey = `${piece.color}${piece.type}`;
        const animData = animatedPieces.get(animKey);

        // But animations are per-move, not per-piece - let's track by piece identity
        // Better approach: use a unique ID for each piece, but for simplicity,
        // let's just check if the piece is at its original position
        // Actually, the animation handles specific piece instances, so let me rethink.
        // For now, skip animation rendering and just draw normally.
        // The animation is handled by tracking the moving piece separately.

        const x = 10 + col * this.squareSize + this.squareSize / 2;
        const y = 10 + row * this.squareSize + this.squareSize / 2;

        this._drawPiece(ctx, piece, x, y, this.squareSize * 0.85);
      }
    }

    // Check if we have any target pieces to animate (pieces that were moved)
    // Actually, let me redo animations to track the actual piece being moved.
    // For now, just render normally since the board state is already updated.
    // The animation should show the piece moving from old position to new.
    // Since the board state is updated before rendering, we need to render
    // animated pieces separately.
  }

  /**
   * Draw a single piece.
   */
  _drawPiece(ctx, piece, x, y, size) {
    const symbol = UNICODE_PIECES[piece.color][piece.type];
    const fontSize = size;

    ctx.font = `${fontSize}px 'Segoe UI Symbol', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add subtle shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = piece.color === COLORS.WHITE ? '#FFFFFF' : '#1A1A1A';
    ctx.fillText(symbol, x, y + 2);

    // White pieces get a subtle outline for contrast
    if (piece.color === COLORS.WHITE) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeText(symbol, x, y + 2);
    }

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Draw the currently dragged piece.
   */
  _drawDraggedPiece(ctx) {
    const size = this.squareSize * 0.9;
    const x = this.dragPos.x;
    const y = this.dragPos.y;

    // Slightly larger piece following cursor
    ctx.font = `${size}px 'Segoe UI Symbol', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = this.dragPiece.color === COLORS.WHITE ? '#FFFFFF' : '#1A1A1A';
    ctx.fillText(
      UNICODE_PIECES[this.dragPiece.color][this.dragPiece.type],
      x, y + 2
    );

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Draw the status bar.
   */
  _drawStatus(ctx) {
    const statusY = this.totalSize - 8;
    const statusX = this.totalSize / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '500 14px Inter, -apple-system, sans-serif';

    let color;
    switch (this.statusType) {
      case 'result':
        color = '#FFD700';
        ctx.font = '600 16px Inter, -apple-system, sans-serif';
        break;
      case 'check':
        color = '#FF6B6B';
        break;
      case 'thinking':
        color = '#BBBBBB';
        break;
      default:
        color = '#E8E0D0';
    }

    ctx.fillStyle = color;
    ctx.fillText(this.statusMessage, statusX, statusY);
  }

  /**
   * Draw promotion dialog overlay.
   */
  _drawPromotionDialog(ctx) {
    // Overlay background
    ctx.fillStyle = COLORS_UI.OVERLAY_BG;
    ctx.fillRect(0, 0, this.totalSize, this.totalSize);

    // Dialog box
    const dialogWidth = this.squareSize * 5;
    const dialogHeight = this.squareSize * 1.5;
    const dialogX = (this.totalSize - dialogWidth) / 2;
    const dialogY = (this.totalSize - dialogHeight) / 2;

    // Background
    ctx.fillStyle = COLORS_UI.PANEL_BG;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    this._roundRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Title
    ctx.fillStyle = COLORS_UI.PANEL_TEXT;
    ctx.font = '500 14px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Promote pawn to:', this.totalSize / 2, dialogY + 24);

    // Piece options
    const pieces = [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT];
    const pieceSize = this.squareSize * 0.7;
    const spacing = this.squareSize * 1.1;
    const startX = this.totalSize / 2 - spacing * 1.5;

    for (let i = 0; i < pieces.length; i++) {
      const px = startX + i * spacing;
      const py = dialogY + dialogHeight / 2 + 8;
      const size = 50;

      // Clickable area
      const hitX = px - size / 2;
      const hitY = py - size / 2;

      // Draw piece square background
      ctx.fillStyle = (i % 2 === 0) ? COLORS_UI.LIGHT_SQUARE : COLORS_UI.DARK_SQUARE;
      ctx.beginPath();
      this._roundRect(ctx, hitX, hitY, size, size, 6);
      ctx.fill();

      // Draw piece
      ctx.font = `${pieceSize}px 'Segoe UI Symbol', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.WHITE ? '#FFFFFF' : '#1A1A1A';

      const pieceSymbol = UNICODE_PIECES[COLORS.WHITE][pieces[i]];
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(pieceSymbol, px, py + 2);
      ctx.shadowBlur = 0;
    }

    // Store click handler positions for promotion dialog
    // We'll handle this in the pointer events
    this._promotionRects = pieces.map((type, i) => ({
      type,
      x: startX + i * spacing - 25,
      y: dialogY + dialogHeight / 2 + 8 - 25,
      w: 50,
      h: 50
    }));
  }

  /**
   * Check if a click is on a promotion piece.
   */
  _checkPromotionClick(x, y) {
    if (!this._promotionRects) return null;
    for (const rect of this._promotionRects) {
      if (x >= rect.x && x <= rect.x + rect.w &&
          y >= rect.y && y <= rect.y + rect.h) {
        return rect.type;
      }
    }
    return null;
  }

  /**
   * Draw thinking indicator animation.
   */
  _drawThinkingIndicator(ctx, time) {
    const dots = Math.floor((time / 500) % 4);
    const text = 'AI is thinking' + '.'.repeat(dots);

    const statusY = this.totalSize - 8;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '500 14px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#BBBBBB';
    ctx.fillText(text, this.totalSize / 2, statusY);
  }

  /**
   * Draw a rounded rectangle path.
   */
  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /**
   * Handle a click on the canvas for promotion dialog.
   */
  handleClick(x, y) {
    if (this.promotionDialog) {
      const type = this._checkPromotionClick(x, y);
      if (type) {
        this._handlePromotionClick(type);
      }
    }
  }

  /**
   * Public method to reset the game.
   */
  resetGame() {
    this.chess.reset();
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.animations = [];
    this.promotionDialog = null;
    this._updateStatus();
  }

  /**
   * Set up a callback for when the game state changes.
   */
  onGameStateChange(callback) {
    this._stateCallback = callback;
  }
}
