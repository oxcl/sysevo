// Canvas Renderer - View
// Handles all drawing operations for the chess board, pieces, and UI elements.

import { PIECE_UNICODE, isInCheck } from './chess.js';

// ============================================================
// Color Scheme
// ============================================================

const COLORS = {
  lightSquare: '#f0d9b5',
  darkSquare: '#b58863',
  selectedSquare: 'rgba(255, 255, 0, 0.45)',
  moveHighlight: 'rgba(155, 199, 0, 0.45)',
  lastMoveHighlight: 'rgba(255, 255, 0, 0.25)',
  checkHighlight: 'rgba(255, 0, 0, 0.5)',
  legalMoveDot: 'rgba(0, 0, 0, 0.25)',
  captureRing: 'rgba(0, 0, 0, 0.2)',
  whitePiece: '#ffffff',
  blackPiece: '#1a1a1a',
  whitePieceShadow: '#cccccc',
  blackPieceShadow: '#000000',
  coordinateLight: '#8b7355',
  coordinateDark: '#e8d4b0',
};

// ============================================================
// Renderer Class
// ============================================================

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.boardSize = 0;
    this.squareSize = 0;
    this.padding = 0;
    this.flipped = false; // false = white at bottom, true = black at bottom

    // Animation state
    this.animations = [];
    this.lastRenderTime = 0;

    this.resize();
  }

  /**
   * Resize the canvas to fit within the viewport.
   */
  resize() {
    const maxWidth = Math.min(window.innerWidth - 20, 600);
    const maxHeight = Math.min(window.innerHeight - 100, 600);
    const size = Math.floor(Math.min(maxWidth, maxHeight));

    this.canvas.width = size;
    this.canvas.height = size;
    this.boardSize = size;
    this.squareSize = size / 8;
  }

  /**
   * Toggle board flip.
   */
  toggleFlip() {
    this.flipped = !this.flipped;
  }

  // ============================================================
  // Coordinate Conversion
  // ============================================================

  /**
   * Convert board coordinates to canvas pixel coordinates.
   */
  boardToCanvas(row, col) {
    const r = this.flipped ? 7 - row : row;
    const c = this.flipped ? 7 - col : col;
    return {
      x: c * this.squareSize,
      y: r * this.squareSize,
    };
  }

  /**
   * Convert canvas pixel coordinates to board coordinates.
   */
  canvasToBoard(x, y) {
    const col = Math.floor(x / this.squareSize);
    const row = Math.floor(y / this.squareSize);
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return {
      row: this.flipped ? 7 - row : row,
      col: this.flipped ? 7 - col : col,
    };
  }

  // ============================================================
  // Main Draw
  // ============================================================

  /**
   * Render the full game state.
   */
  render(state, selectedSquare, legalMoves, draggingPiece, dragPos) {
    const ctx = this.ctx;
    const sq = this.squareSize;

    // Clear
    ctx.clearRect(0, 0, this.boardSize, this.boardSize);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.boardSize, this.boardSize);

    // Draw squares
    this.drawBoard(ctx, sq);

    // Draw last move highlight
    if (state.lastMove) {
      this.drawHighlight(ctx, state.lastMove.from, sq, COLORS.lastMoveHighlight);
      this.drawHighlight(ctx, state.lastMove.to, sq, COLORS.lastMoveHighlight);
    }

    // Draw selected square highlight
    if (selectedSquare) {
      this.drawHighlight(ctx, selectedSquare, sq, COLORS.selectedSquare);
    }

    // Draw legal move indicators
    if (legalMoves && selectedSquare) {
      for (const move of legalMoves) {
        this.drawMoveIndicator(ctx, move, sq);
      }
    }

    // Draw pieces (with dragging piece last)
    this.drawPieces(ctx, state, sq, draggingPiece, dragPos);

    // Draw coordinates
    this.drawCoordinates(ctx, sq);

    // Check highlight
    if (state.kings[state.turn]) {
      const king = state.kings[state.turn];
      // Determine if current player's king is in check
      if (isInCheck(state.board, state.turn)) {
        this.drawHighlight(ctx, king, sq, COLORS.checkHighlight);
      }
    }
  }

  /**
   * Draw the base board (squares).
   */
  drawBoard(ctx, sq) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        ctx.fillStyle = isLight ? COLORS.lightSquare : COLORS.darkSquare;
        const pos = this.boardToCanvas(r, c);
        ctx.fillRect(pos.x, pos.y, sq, sq);
      }
    }
  }

  /**
   * Draw a highlight on a square.
   */
  drawHighlight(ctx, pos, sq, color) {
    const { x, y } = this.boardToCanvas(pos.row, pos.col);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, sq, sq);
  }

  /**
   * Draw legal move indicators.
   */
  drawMoveIndicator(ctx, move, sq) {
    const { x, y } = this.boardToCanvas(move.to.row, move.to.col);
    const centerX = x + sq / 2;
    const centerY = y + sq / 2;

    if (move.captured) {
      // Capture ring
      ctx.strokeStyle = COLORS.captureRing;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sq / 2 - 3, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Dot
      ctx.fillStyle = COLORS.legalMoveDot;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sq / 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw all pieces on the board.
   */
  drawPieces(ctx, state, sq, draggingPiece, dragPos) {
    const { board } = state;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        // Skip the piece being dragged
        if (draggingPiece && draggingPiece.row === r && draggingPiece.col === c) continue;

        const pos = this.boardToCanvas(r, c);
        this.drawPiece(ctx, piece, pos.x, pos.y, sq);
      }
    }

    // Draw dragged piece on top
    if (draggingPiece && dragPos) {
      const piece = board[draggingPiece.row][draggingPiece.col];
      if (piece) {
        this.drawPiece(ctx, piece, dragPos.x - sq / 2, dragPos.y - sq / 2, sq, true);
      }
    }
  }

  /**
   * Draw a single piece using Unicode symbols.
   */
  drawPiece(ctx, piece, x, y, size, isDragging = false) {
    const symbol = PIECE_UNICODE[piece.color][piece.type];
    const fontSize = Math.floor(size * 0.85);

    ctx.font = `${fontSize}px 'Segoe UI', 'Arial Unicode MS', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow for depth
    if (isDragging) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    }

    // Draw piece text
    ctx.fillStyle = piece.color === 'white' ? COLORS.whitePiece : COLORS.blackPiece;
    ctx.fillText(symbol, x + size / 2, y + size / 2);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Draw coordinate labels on the board.
   */
  drawCoordinates(ctx, sq) {
    const fontSize = Math.max(10, Math.floor(sq * 0.2));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 8; i++) {
      const idx = this.flipped ? 7 - i : i;
      // Rank numbers (right side)
      const pos = this.boardToCanvas(i, 7);
      const isLight = (i + 0) % 2 === 0;
      ctx.fillStyle = isLight ? COLORS.coordinateDark : COLORS.coordinateLight;
      ctx.fillText(`${idx + 1}`, pos.x + sq - fontSize * 0.4, pos.y + sq - fontSize * 0.3);

      // File letters (bottom)
      const pos2 = this.boardToCanvas(7, i);
      ctx.fillStyle = isLight ? COLORS.coordinateDark : COLORS.coordinateLight;
      ctx.fillText(String.fromCharCode(97 + idx), pos2.x + fontSize * 0.4, pos2.y + sq - fontSize * 0.3);
    }
  }
}
