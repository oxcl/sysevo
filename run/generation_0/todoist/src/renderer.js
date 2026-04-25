import {
  BOARD_SIZE, PIECE_SYMBOLS, WHITE, BLACK, FILES,
  PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING
} from './constants.js';

/**
 * Canvas-based renderer for the chess board.
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.squareSize = 0;
    this.boardPadding = 0;
    this.animations = [];
    this.lastTime = 0;

    // Colors
    this.lightSquare = '#f0d9b5';
    this.darkSquare = '#b58863';
    this.selectedHighlight = 'rgba(255, 255, 0, 0.4)';
    this.moveHighlight = 'rgba(0, 255, 0, 0.2)';
    this.lastMoveHighlight = 'rgba(255, 255, 0, 0.15)';
    this.checkHighlight = 'rgba(255, 0, 0, 0.4)';
    this.legalMoveDot = 'rgba(0, 0, 0, 0.25)';
    this.captureRing = 'rgba(0, 0, 0, 0.3)';

    this.resize();
  }

  resize() {
    const container = this.canvas.parentElement;
    const maxSize = Math.min(window.innerWidth, window.innerHeight) - 40;
    const size = Math.max(320, Math.min(maxSize, 600));

    // Use device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';

    this.ctx.scale(dpr, dpr);
    this.boardSize = size;
    this.boardPadding = size * 0.04;
    this.squareSize = (size - 2 * this.boardPadding) / BOARD_SIZE;
  }

  getBoardPixel(row, col) {
    return {
      x: this.boardPadding + col * this.squareSize,
      y: this.boardPadding + row * this.squareSize
    };
  }

  getSquareFromPixel(px, py) {
    const col = Math.floor((px - this.boardPadding) / this.squareSize);
    const row = Math.floor((py - this.boardPadding) / this.squareSize);
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      return { row, col };
    }
    return null;
  }

  /**
   * Main render loop
   */
  render(board, selectedSquare, validMoves, statusMessage, isAnimating) {
    const ctx = this.ctx;
    const size = this.boardSize;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, 0, size, size);

    // Draw board
    this.drawBoard(board, selectedSquare, validMoves);

    // Draw pieces
    this.drawPieces(board, selectedSquare, validMoves);

    // Draw status overlay if game over
    if (board.gameOver) {
      this.drawGameOverOverlay(board);
    }
  }

  drawBoard(board, selectedSquare, validMoves) {
    const ctx = this.ctx;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const { x, y } = this.getBoardPixel(r, c);
        const isLight = (r + c) % 2 === 0;

        // Base square
        ctx.fillStyle = isLight ? this.lightSquare : this.darkSquare;
        ctx.fillRect(x, y, this.squareSize, this.squareSize);

        // Last move highlight
        if (board.lastMove) {
          const lastFrom = board.lastMove.from;
          const lastTo = board.lastMove.to;
          if ((r === lastFrom.row && c === lastFrom.col) ||
              (r === lastTo.row && c === lastTo.col)) {
            ctx.fillStyle = this.lastMoveHighlight;
            ctx.fillRect(x, y, this.squareSize, this.squareSize);
          }
        }

        // Selected square
        if (selectedSquare && r === selectedSquare.row && c === selectedSquare.col) {
          ctx.fillStyle = this.selectedHighlight;
          ctx.fillRect(x, y, this.squareSize, this.squareSize);
        }

        // Valid moves
        if (validMoves) {
          for (const move of validMoves) {
            if (move.row === r && move.col === c) {
              const target = board.getPiece(r, c);
              if (target) {
                // Capture ring
                ctx.strokeStyle = this.captureRing;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(x + this.squareSize / 2, y + this.squareSize / 2,
                        this.squareSize / 2 - 4, 0, Math.PI * 2);
                ctx.stroke();
              } else {
                // Move dot
                ctx.fillStyle = this.legalMoveDot;
                ctx.beginPath();
                ctx.arc(x + this.squareSize / 2, y + this.squareSize / 2,
                        this.squareSize / 6, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      }
    }

    // Board border / coordinate labels
    this.drawCoordinates();
  }

  drawCoordinates() {
    const ctx = this.ctx;
    const fontSize = Math.max(10, this.boardPadding * 0.35);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < BOARD_SIZE; i++) {
      // File letters (a-h) at bottom
      const { x, y } = this.getBoardPixel(BOARD_SIZE - 1, i);
      ctx.fillStyle = '#ddd';
      ctx.fillText(FILES[i], x + this.squareSize / 2, y + this.squareSize + fontSize * 0.8);

      // Rank numbers (1-8) on left
      const { x: x2, y: y2 } = this.getBoardPixel(i, 0);
      ctx.fillText(String(BOARD_SIZE - i), x2 - fontSize * 0.8, y2 + this.squareSize / 2);
    }
  }

  drawPieces(board, selectedSquare, validMoves) {
    const ctx = this.ctx;
    const fontSize = this.squareSize * 0.75;
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board.grid[r][c];
        if (!piece) continue;

        // Skip the selected piece (draw it last, on top)
        if (selectedSquare && r === selectedSquare.row && c === selectedSquare.col) {
          continue;
        }

        const { x, y } = this.getBoardPixel(r, c);
        const symbol = PIECE_SYMBOLS[piece.color][piece.type];
        ctx.fillStyle = piece.color === WHITE ? '#ffffff' : '#1a1a1a';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.fillText(symbol, x + this.squareSize / 2, y + this.squareSize / 2 + 2);
        ctx.shadowBlur = 0;
      }
    }

    // Draw selected piece on top
    if (selectedSquare) {
      const piece = board.getPiece(selectedSquare.row, selectedSquare.col);
      if (piece) {
        const { x, y } = this.getBoardPixel(selectedSquare.row, selectedSquare.col);
        const symbol = PIECE_SYMBOLS[piece.color][piece.type];
        ctx.fillStyle = piece.color === WHITE ? '#ffffff' : '#1a1a1a';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.fillText(symbol, x + this.squareSize / 2, y + this.squareSize / 2 + 2);
        ctx.shadowBlur = 0;
      }
    }
  }

  drawGameOverOverlay(board) {
    const ctx = this.ctx;
    const size = this.boardSize;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, size, size);

    // Message
    let message = '';
    let subMessage = '';
    if (board.gameResult === '1-0') {
      message = 'White Wins!';
      subMessage = 'Checkmate';
    } else if (board.gameResult === '0-1') {
      message = 'Black Wins!';
      subMessage = 'Checkmate';
    } else if (board.gameResult === '1/2-1/2') {
      message = 'Draw';
      if (board.halfMoveClock >= 100) {
        subMessage = 'Fifty-Move Rule';
      } else if (board.isInsufficientMaterial()) {
        subMessage = 'Insufficient Material';
      } else {
        subMessage = 'Stalemate';
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${size * 0.06}px Arial, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText(message, size / 2, size / 2 - 20);
    ctx.font = `${size * 0.035}px Arial, sans-serif`;
    ctx.fillStyle = '#ccc';
    ctx.fillText(subMessage, size / 2, size / 2 + 25);

    ctx.font = `${size * 0.03}px Arial, sans-serif`;
    ctx.fillStyle = '#aaa';
    ctx.fillText('Click to play again', size / 2, size / 2 + 65);
  }

  /**
   * Animate a piece moving from one square to another.
   * Returns a promise that resolves when the animation completes.
   */
  animateMove(from, to, piece, board) {
    return new Promise((resolve) => {
      const fromPos = this.getBoardPixel(from.row, from.col);
      const toPos = this.getBoardPixel(to.row, to.col);
      const startTime = performance.now();
      const duration = 150; // ms

      const animate = (time) => {
        const elapsed = time - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3);

        const x = fromPos.x + (toPos.x - fromPos.x) * ease;
        const y = fromPos.y + (toPos.y - fromPos.y) * ease;

        // Re-render the board without the moving piece
        // We'll do a quick render and then draw the piece at interpolated position
        // Actually let's just draw over the current canvas state
        const ctx = this.ctx;
        // We need to redraw the board up to current state but with piece at interpolated position
        // This is tricky. Let's do a simpler approach: clear and redraw everything but skip the animated piece

        // Redraw board without the animated piece
        this.drawBoard(board, null, null);

        // Draw all pieces except the animated one
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            const p = board.grid[r][c];
            if (!p) continue;
            if (r === from.row && c === from.col) continue;
            if (r === to.row && c === to.col && !board.getPiece(to.row, to.col)) continue;
            const pos = this.getBoardPixel(r, c);
            const symbol = PIECE_SYMBOLS[p.color][p.type];
            ctx.fillStyle = p.color === WHITE ? '#ffffff' : '#1a1a1a';
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 4;
            ctx.font = `${this.squareSize * 0.75}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol, pos.x + this.squareSize / 2, pos.y + this.squareSize / 2 + 2);
            ctx.shadowBlur = 0;
          }
        }

        // Draw the animated piece at interpolated position
        const symbol = PIECE_SYMBOLS[piece.color][piece.type];
        ctx.fillStyle = piece.color === WHITE ? '#ffffff' : '#1a1a1a';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 6;
        ctx.font = `${this.squareSize * 0.75}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, x + this.squareSize / 2, y + this.squareSize / 2 + 2);
        ctx.shadowBlur = 0;

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }
}
