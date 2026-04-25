/**
 * Chess UI - Canvas rendering, animations, and event handling.
 */
import Chess, {
  WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
  PIECE_SYMBOLS, PIECE_VALUES,
} from './chess.js';

// Colors
const COLORS = {
  lightSquare: '#F0D9B5',
  darkSquare: '#B58863',
  selectedSquare: 'rgba(255, 255, 0, 0.4)',
  validMoveDot: 'rgba(0, 0, 0, 0.25)',
  lastMoveHighlight: 'rgba(255, 255, 0, 0.2)',
  checkHighlight: 'rgba(255, 0, 0, 0.4)',
  promotionOverlay: 'rgba(0, 0, 0, 0.6)',
  promotionButton: '#4a4a6a',
  promotionButtonHover: '#6a6a9a',
  whitePieceColor: '#ffffff',
  blackPieceColor: '#000000',
  whitePieceStroke: '#333333',
  blackPieceStroke: '#333333',
  coordText: '#4a4a4a',
  statusText: '#f0f0f0',
  moveHistoryBg: 'rgba(0, 0, 0, 0.3)',
};

// Piece Unicode symbols (larger, more elegant)
const PIECE_FONT = 'bold 48px "Segoe UI", Arial, sans-serif';
const PIECE_FONT_LARGE = 'bold 56px "Segoe UI", Arial, sans-serif';

export default class ChessUI {
  constructor(canvas, onMove, onNewGame) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onMove = onMove;
    this.onNewGame = onNewGame;

    this.boardSize = 480; // will be scaled
    this.padding = 30; // for coordinates
    this.squareSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    this.game = null;
    this.selectedSquare = null;
    this.validMoves = [];
    this.lastMove = null;
    this.isAnimating = false;
    this.animation = null;
    this.promotionPending = null; // { from, to, piece }
    this.showPromotionDialog = false;
    this.promotionHover = null;

    // Drag state
    this.isDragging = false;
    this.dragPiece = null;
    this.dragFrom = null;
    this.dragX = 0;
    this.dragY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // Status
    this.statusMessage = '';
    this.statusType = ''; // 'check', 'checkmate', 'stalemate', 'draw', ''

    // Move history
    this.moveHistory = [];
    this.flipped = false; // flip board for black's perspective? No, keep white at bottom.

    this._resize();
    this._setupEvents();

    // Animation frame
    this._animationFrameId = null;
  }

  /**
   * Resize canvas based on window size.
   */
  _resize() {
    const maxSize = Math.min(window.innerWidth * 0.85, window.innerHeight * 0.85, 600);
    this.boardSize = Math.floor(maxSize - this.padding * 2);
    const canvasSize = this.boardSize + this.padding * 2;
    
    this.canvas.width = canvasSize;
    this.canvas.height = canvasSize;
    this.canvas.style.width = canvasSize + 'px';
    this.canvas.style.height = canvasSize + 'px';

    this.squareSize = this.boardSize / 8;
    this.offsetX = this.padding;
    this.offsetY = this.padding;
  }

  /**
   * Set up event listeners.
   */
  _setupEvents() {
    this.canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this._onMouseUp.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });

    // Resize
    window.addEventListener('resize', () => {
      this._resize();
      this._render();
    });
  }

  /**
   * Get board coordinates from mouse/touch event.
   */
  _getBoardCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const col = Math.floor((x - this.offsetX) / this.squareSize);
    const row = Math.floor((y - this.offsetY) / this.squareSize);
    return { row, col, x, y };
  }

  _onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = this._getBoardCoords(touch.clientX, touch.clientY);
    this._handleDown(coords);
  }

  _onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = this._getBoardCoords(touch.clientX, touch.clientY);
    this._handleMove(coords);
  }

  _onTouchEnd(e) {
    e.preventDefault();
    this._handleUp();
  }

  _onMouseDown(e) {
    const coords = this._getBoardCoords(e.clientX, e.clientY);
    this._handleDown(coords);
  }

  _onMouseMove(e) {
    const coords = this._getBoardCoords(e.clientX, e.clientY);
    this._handleMove(coords);
    
    // Handle promotion hover
    if (this.showPromotionDialog) {
      this._handlePromotionHover(coords);
    }
  }

  _onMouseUp(e) {
    this._handleUp();
  }

  _handleDown(coords) {
    const { row, col, x, y } = coords;

    // If promotion dialog is showing, handle it
    if (this.showPromotionDialog) {
      this._handlePromotionClick(coords);
      return;
    }

    // If animating, ignore input
    if (this.isAnimating) return;

    // Check if click is on the board
    if (row < 0 || row > 7 || col < 0 || col > 7) return;

    const piece = this.game.board[row][col];

    if (this.selectedSquare) {
      // If clicking on own piece, select it instead
      if (piece && piece.color === this.game.turn) {
        this.selectedSquare = { row, col };
        this.validMoves = this._getValidMovesForSquare(row, col);
        this._render();
        return;
      }

      // Try to make a move
      const move = this._findMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
      if (move) {
        this._executeMove(move);
      } else {
        this.selectedSquare = null;
        this.validMoves = [];
        this._render();
      }
      return;
    }

    // No piece selected - select if own piece
    if (piece && piece.color === this.game.turn) {
      this.selectedSquare = { row, col };
      this.validMoves = this._getValidMovesForSquare(row, col);

      // Start drag
      this.isDragging = true;
      this.dragPiece = piece;
      this.dragFrom = { row, col };
      this.dragOffsetX = x - (this.offsetX + col * this.squareSize);
      this.dragOffsetY = y - (this.offsetY + row * this.squareSize);
      this.dragX = x;
      this.dragY = y;

      this._render();
    }
  }

  _handleMove(coords) {
    const { row, col, x, y } = coords;

    if (this.isDragging) {
      this.dragX = x;
      this.dragY = y;
      this._render();
    }
  }

  _handleUp() {
    if (this.isDragging) {
      const coords = this._getBoardCoords(
        this.canvas.getBoundingClientRect().left + this.dragX,
        this.canvas.getBoundingClientRect().top + this.dragY
      );
      const { row, col } = coords;

      this.isDragging = false;

      if (row >= 0 && row <= 7 && col >= 0 && col <= 7 &&
          (row !== this.dragFrom.row || col !== this.dragFrom.col)) {
        const move = this._findMove(this.dragFrom.row, this.dragFrom.col, row, col);
        if (move) {
          this._executeMove(move);
          this.selectedSquare = null;
          this.validMoves = [];
          this._render();
          return;
        }
      }

      // Snap back
      this._render();
    }
  }

  /**
   * Get valid moves for a specific square.
   */
  _getValidMovesForSquare(row, col) {
    const moves = this.game.moves();
    return moves.filter(m => m.from.row === row && m.from.col === col);
  }

  /**
   * Find a move from (r1,c1) to (r2,c2).
   */
  _findMove(r1, c1, r2, c2) {
    const moves = this.game.moves();
    // Check for non-promotion moves first
    const nonPromo = moves.find(m =>
      m.from.row === r1 && m.from.col === c1 &&
      m.to.row === r2 && m.to.col === c2 &&
      !m.promotion
    );
    if (nonPromo) return nonPromo;

    // Check for promotion moves (will show dialog)
    const promos = moves.filter(m =>
      m.from.row === r1 && m.from.col === c1 &&
      m.to.row === r2 && m.to.col === c2 &&
      m.promotion
    );
    if (promos.length > 0) {
      if (promos.length === 1) {
        // Auto-queen if only one option (shouldn't happen, but just in case)
        return promos.find(p => p.promotion === QUEEN) || promos[0];
      }
      // Show promotion dialog
      this.promotionPending = {
        from: { row: r1, col: c1 },
        to: { row: r2, col: c2 },
      };
      this.showPromotionDialog = true;
      this._render();
      return null;
    }

    return null;
  }

  /**
   * Handle promotion dialog hover.
   */
  _handlePromotionHover(coords) {
    const { x, y } = coords;
    const choice = this._getPromotionChoice(x, y);
    if (choice !== this.promotionHover) {
      this.promotionHover = choice;
      this._render();
    }
  }

  /**
   * Handle promotion dialog click.
   */
  _handlePromotionClick(coords) {
    const { x, y } = coords;
    const choice = this._getPromotionChoice(x, y);
    if (choice) {
      const { from, to } = this.promotionPending;
      const move = this.game.moves().find(m =>
        m.from.row === from.row && m.from.col === from.col &&
        m.to.row === to.row && m.to.col === to.col &&
        m.promotion === choice
      );
      if (move) {
        this.showPromotionDialog = false;
        this.promotionPending = null;
        this.promotionHover = null;
        this._executeMove(move);
      }
    }
  }

  /**
   * Get promotion choice based on click position.
   */
  _getPromotionChoice(x, y) {
    if (!this.showPromotionDialog) return null;

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const dialogWidth = 220;
    const dialogHeight = 60;
    const dx = cx - dialogWidth / 2;
    const dy = cy - dialogHeight / 2;
    const buttonWidth = dialogWidth / 4;

    if (x >= dx && x <= dx + dialogWidth && y >= dy && y <= dy + dialogHeight) {
      const idx = Math.floor((x - dx) / buttonWidth);
      const types = [QUEEN, ROOK, BISHOP, KNIGHT];
      return types[idx] || null;
    }
    return null;
  }

  /**
   * Execute a move and trigger animation.
   */
  _executeMove(move) {
    if (this.isAnimating) return;

    const fromX = this.offsetX + move.from.col * this.squareSize;
    const fromY = this.offsetY + move.from.row * this.squareSize;
    const toX = this.offsetX + move.to.col * this.squareSize;
    const toY = this.offsetY + move.to.row * this.squareSize;

    this.isAnimating = true;
    this.animation = {
      fromX, fromY, toX, toY,
      piece: move.piece,
      startTime: performance.now(),
      duration: 200, // ms
      move: move,
      captured: move.captured,
    };

    // Clear selection
    this.selectedSquare = null;
    this.validMoves = [];

    // Start animation loop
    this._startAnimation();
  }

  /**
   * Start the animation loop.
   */
  _startAnimation() {
    const animate = (time) => {
      if (!this.animation) {
        this.isAnimating = false;
        return;
      }

      const elapsed = time - this.animation.startTime;
      const progress = Math.min(elapsed / this.animation.duration, 1);

      // Ease in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      this._render();
      this._renderAnimationFrame(eased);

      if (progress >= 1) {
        // Animation complete - actually make the move
        this._commitMove(this.animation.move);
        this.animation = null;
        this.isAnimating = false;
        this._render();
      } else {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Render the animation frame (piece in transit).
   */
  _renderAnimationFrame(progress) {
    if (!this.animation) return;

    const ctx = this.ctx;
    const { fromX, fromY, toX, toY, piece } = this.animation;

    const x = fromX + (toX - fromX) * progress;
    const y = fromY + (toY - fromY) * progress;

    // Draw the piece at the interpolated position
    const symbol = PIECE_SYMBOLS[piece.color][piece.type];
    const size = this.squareSize;

    ctx.save();
    ctx.font = PIECE_FONT_LARGE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = piece.color === WHITE ? COLORS.whitePieceColor : COLORS.blackPieceColor;
    ctx.fillText(symbol, x + size / 2, y + size / 2);

    if (piece.color === WHITE) {
      ctx.strokeStyle = COLORS.whitePieceStroke;
      ctx.lineWidth = 1;
      ctx.strokeText(symbol, x + size / 2, y + size / 2);
    }

    ctx.restore();
  }

  /**
   * Commit the move to the game state.
   */
  _commitMove(move) {
    const result = this.game.move(move);
    if (result) {
      this.lastMove = move;
      this.selectedSquare = null;
      this.validMoves = [];
      
      // Record in move history
      const alg = this.game.moveToAlgebraic(move);
      this.moveHistory.push(alg);

      // Update status
      this._updateStatus();

      // Notify
      this.onMove(move);
    }
  }

  /**
   * Update status message based on game state.
   */
  _updateStatus() {
    if (this.game.inCheckmate()) {
      const winner = this.game.turn === WHITE ? 'Black' : 'White';
      this.statusMessage = `Checkmate! ${winner} wins!`;
      this.statusType = 'checkmate';
    } else if (this.game.inStalemate()) {
      this.statusMessage = 'Draw by stalemate!';
      this.statusType = 'stalemate';
    } else if (this.game.insufficientMaterial()) {
      this.statusMessage = 'Draw by insufficient material!';
      this.statusType = 'draw';
    } else if (this.game.inCheck()) {
      this.statusMessage = 'Check!';
      this.statusType = 'check';
    } else {
      this.statusMessage = this.game.turn === WHITE ? "White's turn" : "Black's turn";
      this.statusType = '';
    }
  }

  /**
   * Set the game instance and render.
   */
  setGame(game) {
    this.game = game;
    this.selectedSquare = null;
    this.validMoves = [];
    this.lastMove = null;
    this.isAnimating = false;
    this.animation = null;
    this.showPromotionDialog = false;
    this.promotionPending = null;
    this.moveHistory = [];
    this._updateStatus();
    this._render();
  }

  /**
   * Set status message externally.
   */
  setStatus(message, type = '') {
    this.statusMessage = message;
    this.statusType = type;
    this._render();
  }

  /**
   * Main render function.
   */
  _render() {
    if (!this.game) return;

    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const size = this.squareSize;
    const ox = this.offsetX;
    const oy = this.offsetY;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, 0, W, H);

    // Draw board squares
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = ox + c * size;
        const y = oy + r * size;
        const isLight = (r + c) % 2 === 0;

        ctx.fillStyle = isLight ? COLORS.lightSquare : COLORS.darkSquare;

        // Draw square with slight border radius
        ctx.fillRect(x, y, size, size);

        // Last move highlight
        if (this.lastMove) {
          if ((this.lastMove.from.row === r && this.lastMove.from.col === c) ||
              (this.lastMove.to.row === r && this.lastMove.to.col === c)) {
            ctx.fillStyle = COLORS.lastMoveHighlight;
            ctx.fillRect(x, y, size, size);
          }
        }

        // Selected square
        if (this.selectedSquare && this.selectedSquare.row === r && this.selectedSquare.col === c) {
          ctx.fillStyle = COLORS.selectedSquare;
          ctx.fillRect(x, y, size, size);
        }

        // Valid move dots
        const hasValidMove = this.validMoves.some(m => m.to.row === r && m.to.col === c);
        if (hasValidMove) {
          const pieceAtTarget = this.game.board[r][c];
          if (pieceAtTarget) {
            // Ring for capturable pieces
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2 - 4, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // Dot for empty squares
            ctx.fillStyle = COLORS.validMoveDot;
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Check highlight
        if (this.game.inCheck()) {
          const king = this.game._findKing(this.game.turn);
          if (king && king.row === r && king.col === c) {
            ctx.fillStyle = COLORS.checkHighlight;
            ctx.fillRect(x, y, size, size);
          }
        }
      }
    }

    // Draw pieces
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.game.board[r][c];
        if (!piece) continue;

        // Skip if this piece is being dragged
        if (this.isDragging && this.dragFrom && this.dragFrom.row === r && this.dragFrom.col === c) continue;

        const x = ox + c * size;
        const y = oy + r * size;
        this._drawPiece(ctx, piece, x, y, size);
      }
    }

    // Draw dragged piece
    if (this.isDragging && this.dragPiece) {
      const x = this.dragX - this.dragOffsetX;
      const y = this.dragY - this.dragOffsetY;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      this._drawPiece(ctx, this.dragPiece, x, y, size);
      ctx.restore();
    }

    // Draw animation piece (transit)
    // Handled separately by _renderAnimationFrame

    // Draw coordinates
    ctx.fillStyle = COLORS.coordText;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let c = 0; c < 8; c++) {
      const x = ox + c * size + size / 2;
      ctx.fillText(String.fromCharCode(97 + c), x, oy - 18);
    }

    ctx.textAlign = 'right';
    for (let r = 0; r < 8; r++) {
      const y = oy + r * size + size / 2;
      ctx.fillText(8 - r, ox - 10, y);
    }

    // Draw promotion dialog
    if (this.showPromotionDialog) {
      this._drawPromotionDialog(ctx);
    }

    // Draw status
    this._drawStatus(ctx, W, H);

    // Draw move history
    this._drawMoveHistory(ctx, W);
  }

  /**
   * Draw a piece on the canvas.
   */
  _drawPiece(ctx, piece, x, y, size) {
    const symbol = PIECE_SYMBOLS[piece.color][piece.type];
    
    ctx.save();
    ctx.font = PIECE_FONT_LARGE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (piece.color === BLACK) {
      ctx.fillStyle = COLORS.blackPieceColor;
      ctx.fillText(symbol, x + size / 2, y + size / 2 + 2);
    } else {
      // White pieces get a subtle stroke for clarity
      ctx.fillStyle = COLORS.whitePieceColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(symbol, x + size / 2, y + size / 2 + 2);
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = COLORS.whitePieceStroke;
      ctx.lineWidth = 0.5;
      ctx.strokeText(symbol, x + size / 2, y + size / 2 + 2);
    }

    ctx.restore();
  }

  /**
   * Draw the promotion dialog overlay.
   */
  _drawPromotionDialog(ctx) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const size = this.squareSize;

    // Overlay
    ctx.fillStyle = COLORS.promotionOverlay;
    ctx.fillRect(0, 0, W, H);

    // Dialog box
    const dialogW = 220;
    const dialogH = 60;
    const cx = W / 2;
    const cy = H / 2;
    const dx = cx - dialogW / 2;
    const dy = cy - dialogH / 2;

    // Background
    ctx.fillStyle = '#2d2d44';
    ctx.beginPath();
    this._roundRect(ctx, dx, dy, dialogW, dialogH, 8);
    ctx.fill();

    // Title
    ctx.fillStyle = '#f0f0f0';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Promote pawn to:', cx, dy - 24);

    // Buttons
    const types = [QUEEN, ROOK, BISHOP, KNIGHT];
    const bw = dialogW / 4;

    for (let i = 0; i < 4; i++) {
      const bx = dx + i * bw;
      const by = dy;

      // Button background
      const isHover = this.promotionHover && this.promotionHover === types[i];
      ctx.fillStyle = isHover ? COLORS.promotionButtonHover : COLORS.promotionButton;
      ctx.fillRect(bx + 2, by + 2, bw - 4, dialogH - 4);

      // Piece symbol
      const symbol = PIECE_SYMBOLS[WHITE][types[i]]; // Always show white promotion (white pawns promote on rank 8)
      // Actually, use the pending piece's color
      const color = this.promotionPending ? 
        this.game.board[this.promotionPending.from.row][this.promotionPending.from.col].color :
        WHITE;
      const sym = PIECE_SYMBOLS[color][types[i]];

      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color === WHITE ? COLORS.whitePieceColor : COLORS.blackPieceColor;
      ctx.fillText(sym, bx + bw / 2, by + dialogH / 2);
    }
  }

  /**
   * Draw a rounded rectangle path.
   */
  _roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Draw status text at the bottom.
   */
  _drawStatus(ctx, W, H) {
    if (!this.statusMessage) return;

    const oy = this.offsetY + this.boardSize + 20;

    ctx.fillStyle = COLORS.statusText;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(this.statusMessage, W / 2, oy);

    // New game button
    const btnW = 100;
    const btnH = 30;
    const btnX = W / 2 + 120;
    const btnY = oy - 4;
    
    ctx.fillStyle = '#4a6a8a';
    this._roundRect(ctx, btnX, btnY, btnW, btnH, 4);
    ctx.fill();

    ctx.fillStyle = '#f0f0f0';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('New Game', btnX + btnW / 2, btnY + btnH / 2);

    // Store button rect for click detection
    this._newGameBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  /**
   * Draw move history on the right side.
   */
  _drawMoveHistory(ctx, W) {
    // Move history is shown on the right side of the board
    const rightX = this.offsetX + this.boardSize + 10;
    const oy = this.offsetY;

    ctx.fillStyle = COLORS.moveHistoryBg;
    const mw = 120;
    const mh = this.boardSize;
    ctx.fillRect(rightX, oy, mw, mh);

    ctx.fillStyle = '#a0a0b0';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Show last 20 moves
    const start = Math.max(0, this.moveHistory.length - 20);
    let y = oy + 8;

    for (let i = start; i < this.moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wMove = this.moveHistory[i] || '';
      const bMove = this.moveHistory[i + 1] || '';
      const text = `${moveNum}. ${wMove.padEnd(6)} ${bMove}`;
      ctx.fillText(text, rightX + 8, y);
      y += 18;
    }
  }

  /**
   * Check if a point is on the "New Game" button.
   */
  isOnNewGameButton(x, y) {
    if (!this._newGameBtnRect) return false;
    const r = this._newGameBtnRect;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  /**
   * Check if a canvas point is on the board.
   */
  isOnBoard(x, y) {
    const bx = x - this.offsetX;
    const by = y - this.offsetY;
    return bx >= 0 && bx <= this.boardSize && by >= 0 && by <= this.boardSize;
  }

  /**
   * Refresh the render.
   */
  refresh() {
    this._updateStatus();
    this._render();
  }
}
