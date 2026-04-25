/**
 * Chess Game - Main controller and UI rendering
 * Uses Canvas API for rendering
 */

class ChessGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Game state
    this.state = createInitialState();
    this.ai = new ChessAI();
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.flipped = false; // False = white at bottom, true = black at bottom
    
    // Animation state
    this.animations = [];
    this.animating = false;
    this.lastMove = null;
    this.checkSquares = [];
    this.moveHistory = [];
    
    // UI state
    this.showingPromotion = false;
    this.promotionCallback = null;
    this.promotionSquare = null;
    this.isGameOver = false;
    this.gameOverMessage = '';
    this.aiThinking = false;
    
    // Board rendering dimensions
    this.boardSize = 0;
    this.squareSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    
    // Colors
    this.colors = {
      lightSquare: '#F0D9B5',
      darkSquare: '#B58863',
      selectedSquare: 'rgba(255, 255, 0, 0.4)',
      legalMoveDot: 'rgba(0, 0, 0, 0.3)',
      legalMoveCapture: 'rgba(0, 0, 0, 0.2)',
      lastMoveHighlight: 'rgba(255, 255, 0, 0.2)',
      checkHighlight: 'rgba(255, 0, 0, 0.4)',
      boardBorder: '#444',
      panelBg: '#2c2c2c',
      panelText: '#eee',
      buttonBg: '#4a90d9',
      buttonHover: '#357abd',
      buttonText: '#fff',
      promotionOverlay: 'rgba(0,0,0,0.6)'
    };
    
    this.setupCanvas();
    this.setupEventListeners();
    this.render();
  }
  
  setupCanvas() {
    // Make canvas responsive
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    const container = this.canvas.parentElement;
    const maxSize = Math.min(container.clientWidth - 20, window.innerHeight - 120, 560);
    const size = Math.max(320, maxSize);
    
    this.canvas.width = size;
    this.canvas.height = size + 80; // Extra space for status bar
    
    this.boardSize = size;
    this.squareSize = size / 8;
    this.offsetX = 0;
    this.offsetY = 20; // Top padding for status
    
    this.render();
  }
  
  // Convert pixel coordinates to board row/col
  getBoardSquare(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top - this.offsetY;
    
    if (x < 0 || x > this.boardSize || y < 0 || y > this.boardSize) return null;
    
    const col = Math.floor(x / this.squareSize);
    const row = Math.floor(y / this.squareSize);
    
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    
    return { row: this.flipped ? 7 - row : row, col: this.flipped ? 7 - col : col };
  }
  
  getSquarePixel(row, col) {
    const r = this.flipped ? 7 - row : row;
    const c = this.flipped ? 7 - col : col;
    return {
      x: c * this.squareSize,
      y: r * this.squareSize + this.offsetY
    };
  }
  
  setupEventListeners() {
    // Mouse click
    this.canvas.addEventListener('click', (e) => {
      if (this.showingPromotion) return;
      if (this.aiThinking) return;
      if (this.isGameOver) return;
      
      const square = this.getBoardSquare(e.clientX, e.clientY);
      if (!square) return;
      
      this.handleSquareClick(square.row, square.col);
    });
    
    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.showingPromotion) return;
      if (this.aiThinking) return;
      if (this.isGameOver) return;
      
      const touch = e.touches[0];
      const square = this.getBoardSquare(touch.clientX, touch.clientY);
      if (!square) return;
      
      this.handleSquareClick(square.row, square.col);
    }, { passive: false });
    
    // Promotion piece selection
    document.addEventListener('click', (e) => {
      if (!this.showingPromotion) return;
      const pieceType = e.target.dataset.piece;
      if (pieceType) {
        this.handlePromotionSelection(pieceType);
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        this.resetGame();
      }
    });
  }
  
  handleSquareClick(row, col) {
    const piece = this.state.board[row][col];
    
    // If a square is already selected
    if (this.selectedSquare) {
      // Check if clicking on the same square (deselect)
      if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.render();
        return;
      }
      
      // Check if clicking on a legal move
      const move = this.legalMovesForSelected.find(m => m.row === row && m.col === col);
      if (move) {
        const fromSquare = this.selectedSquare;
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.makeMove(fromSquare, move);
        return;
      }
      
      // If clicking on own piece, select that piece instead
      if (piece && piece.color === this.state.turn) {
        this.selectedSquare = { row, col };
        this.legalMovesForSelected = this.getLegalMovesForSquare(row, col);
        this.render();
        return;
      }
      
      // Otherwise deselect
      this.selectedSquare = null;
      this.legalMovesForSelected = [];
      this.render();
      return;
    }
    
    // No square selected - select if it's the current player's piece
    if (piece && piece.color === this.state.turn) {
      this.selectedSquare = { row, col };
      this.legalMovesForSelected = this.getLegalMovesForSquare(row, col);
      this.render();
    }
  }
  
  getLegalMovesForSquare(row, col) {
    return getLegalMoves(this.state, row, col);
  }
  
  makeMove(from, to) {
    if (to.promotion && !to.promotionChosen) {
      // Show promotion dialog
      this.showPromotionDialog(from, to);
      return;
    }
    
    const newState = applyMove(this.state, from, to);
    if (!newState) return;
    
    this.lastMove = { from, to };
    this.moveHistory.push({ from, to, state: this.state });
    
    // Animate the move
    this.animateMove(from, to, () => {
      this.state = newState;
      this.checkSquares = [];
      
      if (this.state.gameOver === 'check') {
        const king = findKing(this.state.board, this.state.turn);
        if (king) this.checkSquares.push(king);
      }
      
      this.render();
      
      // Check for game over conditions
      if (this.state.gameOver) {
        this.handleGameOver();
        return;
      }
      
      // AI's turn
      if (this.state.turn === 'black' && !this.isGameOver) {
        this.doAIMove();
      }
    });
  }
  
  showPromotionDialog(from, to) {
    this.showingPromotion = true;
    this.promotionCallback = (pieceType) => {
      to.promotion = pieceType;
      to.promotionChosen = true;
      this.showingPromotion = false;
      this.makeMove(from, to);
    };
    this.promotionSquare = { to };
    this.render();
    
    // Show overlay
    this.renderPromotionOverlay();
  }
  
  renderPromotionOverlay() {
    const ctx = this.ctx;
    const size = this.canvas.width;
    
    // Draw promotion dialog on canvas
    ctx.save();
    
    // Semi-transparent overlay
    ctx.fillStyle = this.colors.promotionOverlay;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Dialog box
    const dialogW = Math.min(this.squareSize * 5, size - 40);
    const dialogH = this.squareSize * 1.5;
    const dialogX = (size - dialogW) / 2;
    const dialogY = (this.boardSize / 2) - dialogH / 2 + this.offsetY;
    
    ctx.fillStyle = this.colors.panelBg;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    this.roundRect(ctx, dialogX, dialogY, dialogW, dialogH, 10);
    ctx.fill();
    ctx.stroke();
    
    // Title
    ctx.fillStyle = this.colors.panelText;
    ctx.font = `${Math.max(14, this.squareSize * 0.18)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Promote Pawn', size / 2, dialogY + dialogH * 0.25);
    
    // Piece options
    const pieces = ['Q', 'R', 'B', 'N'];
    const pieceCount = pieces.length;
    const pieceSize = this.squareSize * 0.7;
    const totalWidth = pieceCount * pieceSize + (pieceCount - 1) * 10;
    let startX = (size - totalWidth) / 2;
    const pieceY = dialogY + dialogH * 0.65;
    
    for (let i = 0; i < pieceCount; i++) {
      const px = startX + i * (pieceSize + 10);
      const py = pieceY - pieceSize / 2;
      
      // Draw clickable area
      ctx.fillStyle = '#3a3a3a';
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      this.roundRect(ctx, px - 2, py - 2, pieceSize + 4, pieceSize + 4, 5);
      ctx.fill();
      ctx.stroke();
      
      // Piece symbol
      ctx.fillStyle = '#fff';
      ctx.font = `${pieceSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(PIECE_UNICODE['white'][pieces[i]], px + pieceSize / 2, py + pieceSize / 2);
    }
    
    ctx.restore();
    
    // Also create invisible clickable divs for the promotion pieces
    // This is handled by the document click listener
  }
  
  handlePromotionSelection(pieceType) {
    if (this.promotionCallback) {
      this.promotionCallback(pieceType);
    }
  }
  
  animateMove(from, to, callback) {
    this.animating = true;
    
    const fromPixel = this.getSquarePixel(from.row, from.col);
    const toPixel = this.getSquarePixel(to.row, to.col);
    
    const piece = this.state.board[from.row][from.col];
    
    const animation = {
      piece,
      fromX: fromPixel.x,
      fromY: fromPixel.y,
      toX: toPixel.x,
      toY: toPixel.y,
      startTime: performance.now(),
      duration: 150, // ms
      callback
    };
    
    this.animations.push(animation);
    
    if (!this._animationFrame) {
      this._animationFrame = requestAnimationFrame((t) => this.updateAnimation(t));
    }
  }
  
  updateAnimation(timestamp) {
    let allDone = true;
    
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const anim = this.animations[i];
      const elapsed = timestamp - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      if (progress >= 1) {
        allDone = true;
        const cb = anim.callback;
        this.animations.splice(i, 1);
        if (cb) cb();
      } else {
        allDone = false;
        // Render with piece at interpolated position
        this.renderAnimationFrame(anim, eased, timestamp);
      }
    }
    
    if (!allDone) {
      this._animationFrame = requestAnimationFrame((t) => this.updateAnimation(t));
    } else {
      this._animationFrame = null;
      this.animating = false;
      // Final render
      this.render();
    }
  }
  
  renderAnimationFrame(activeAnim, eased, timestamp) {
    const ctx = this.ctx;
    const size = this.canvas.width;
    
    // Clear
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background
    ctx.fillStyle = this.colors.panelBg;
    ctx.fillRect(0, 0, size, this.canvas.height);
    
    // Draw status
    this.renderStatus();
    
    // Draw board
    this.renderBoard(ctx);
    
    // Draw pieces except the animated one
    this.renderPieces(ctx, activeAnim);
    
    // Draw the animated piece
    const px = activeAnim.fromX + (activeAnim.toX - activeAnim.fromX) * eased;
    const py = activeAnim.fromY + (activeAnim.toY - activeAnim.fromY) * eased;
    const s = this.squareSize;
    
    ctx.fillStyle = '#fff';
    ctx.font = `${s * 0.85}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(activeAnim.piece.unicode, px + s / 2, py + s / 2);
    ctx.shadowBlur = 0;
  }
  
  doAIMove() {
    this.aiThinking = true;
    this.render();
    
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const startTime = performance.now();
      const move = this.ai.findBestMove(this.state);
      const elapsed = performance.now() - startTime;
      
      this.aiThinking = false;
      
      if (move) {
        // For promotion, AI chooses queen by default
        if (move.to.promotion) {
          move.to.promotion = 'Q';
        }
        this.makeMove(move.from, move.to);
      } else {
        // No moves available
        if (isInCheck(this.state.board, 'black')) {
          this.state.gameOver = 'white';
        } else {
          this.state.gameOver = 'draw-stalemate';
        }
        this.handleGameOver();
        this.render();
      }
    }, 50);
  }
  
  handleGameOver() {
    this.isGameOver = true;
    
    switch (this.state.gameOver) {
      case 'white':
        this.gameOverMessage = 'You win! (Checkmate)';
        break;
      case 'black':
        this.gameOverMessage = 'AI wins! (Checkmate)';
        break;
      case 'check':
        this.gameOverMessage = 'Check!';
        this.isGameOver = false;
        break;
      case 'draw-stalemate':
        this.gameOverMessage = 'Draw by Stalemate';
        break;
      case 'draw-insufficient-material':
        this.gameOverMessage = 'Draw by Insufficient Material';
        break;
      default:
        this.gameOverMessage = 'Game Over';
    }
    
    this.render();
  }
  
  resetGame() {
    this.state = createInitialState();
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.animations = [];
    this.lastMove = null;
    this.checkSquares = [];
    this.moveHistory = [];
    this.isGameOver = false;
    this.gameOverMessage = '';
    this.aiThinking = false;
    this.showingPromotion = false;
    this.render();
  }
  
  /**
   * Main render function
   */
  render() {
    const ctx = this.ctx;
    const size = this.canvas.width;
    
    // Clear
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Background
    ctx.fillStyle = this.colors.panelBg;
    ctx.fillRect(0, 0, size, this.canvas.height);
    
    // Draw board border
    ctx.fillStyle = this.colors.boardBorder;
    ctx.fillRect(this.offsetX - 2, this.offsetY - 2, this.boardSize + 4, this.boardSize + 4);
    
    // Draw status bar
    this.renderStatus();
    
    // Draw board squares
    this.renderBoard(ctx);
    
    // Draw highlights
    this.renderHighlights(ctx);
    
    // Draw pieces
    if (!this.animating) {
      this.renderPieces(ctx, null);
    }
    
    // Draw game over overlay
    if (this.isGameOver) {
      this.renderGameOverOverlay();
    }
    
    // Draw AI thinking indicator
    if (this.aiThinking) {
      this.renderThinkingIndicator();
    }
  }
  
  renderStatus() {
    const ctx = this.ctx;
    const size = this.canvas.width;
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size, this.offsetY);
    
    // Turn indicator
    const turnText = this.state.turn === 'white' ? "White's turn" : "Black's turn";
    ctx.fillStyle = this.state.turn === 'white' ? '#fff' : '#aaa';
    ctx.font = '14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(turnText, 10, this.offsetY / 2);
    
    // Move count
    ctx.fillStyle = '#888';
    ctx.textAlign = 'right';
    ctx.fillText(`Move ${Math.floor(this.moveHistory.length / 2) + 1}`, size - 10, this.offsetY / 2);
    
    // Reset hint
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press R to reset', size / 2, this.offsetY / 2);
  }
  
  renderBoard(ctx) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const displayR = this.flipped ? 7 - r : r;
        const displayC = this.flipped ? 7 - c : c;
        const x = displayC * this.squareSize;
        const y = displayR * this.squareSize + this.offsetY;
        
        // Square color
        const isLight = (r + c) % 2 === 0;
        ctx.fillStyle = isLight ? this.colors.lightSquare : this.colors.darkSquare;
        ctx.fillRect(x, y, this.squareSize, this.squareSize);
      }
    }
  }
  
  renderHighlights(ctx) {
    const ss = this.squareSize;
    
    // Last move highlight
    if (this.lastMove) {
      for (const sq of [this.lastMove.from, this.lastMove.to]) {
        const p = this.getSquarePixel(sq.row, sq.col);
        ctx.fillStyle = this.colors.lastMoveHighlight;
        ctx.fillRect(p.x, p.y, ss, ss);
      }
    }
    
    // Selected square highlight
    if (this.selectedSquare) {
      const p = this.getSquarePixel(this.selectedSquare.row, this.selectedSquare.col);
      ctx.fillStyle = this.colors.selectedSquare;
      ctx.fillRect(p.x, p.y, ss, ss);
    }
    
    // Legal move dots
    for (const move of this.legalMovesForSelected) {
      const p = this.getSquarePixel(move.row, move.col);
      const targetPiece = this.state.board[move.row][move.col];
      
      if (targetPiece) {
        // Capture highlight
        ctx.strokeStyle = this.colors.legalMoveCapture;
        ctx.lineWidth = 4;
        ctx.strokeRect(p.x + 2, p.y + 2, ss - 4, ss - 4);
      } else {
        // Move dot
        ctx.fillStyle = this.colors.legalMoveDot;
        ctx.beginPath();
        ctx.arc(p.x + ss / 2, p.y + ss / 2, ss * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Check highlight
    for (const sq of this.checkSquares) {
      const p = this.getSquarePixel(sq.row, sq.col);
      ctx.fillStyle = this.colors.checkHighlight;
      ctx.fillRect(p.x, p.y, ss, ss);
    }
  }
  
  renderPieces(ctx, excludeAnim) {
    const ss = this.squareSize;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.state.board[r][c];
        if (!piece) continue;
        
        // Skip animated piece
        if (excludeAnim && excludeAnim.piece === piece) continue;
        
        const p = this.getSquarePixel(r, c);
        
        // Draw piece with shadow
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.fillStyle = piece.color === 'white' ? '#fff' : '#222';
        ctx.font = `${ss * 0.85}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(piece.unicode, p.x + ss / 2, p.y + ss / 2);
        
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // For better visibility on dark squares, add subtle outline
        if (piece.color === 'black') {
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 1;
          ctx.strokeText(piece.unicode, p.x + ss / 2, p.y + ss / 2);
        }
      }
    }
  }
  
  renderGameOverOverlay() {
    const ctx = this.ctx;
    const size = this.canvas.width;
    
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, size, this.canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(20, this.squareSize * 0.3)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.gameOverMessage, size / 2, size / 2 - 20);
    
    ctx.font = `${Math.max(14, this.squareSize * 0.18)}px Arial, sans-serif`;
    ctx.fillStyle = '#aaa';
    ctx.fillText('Click "New Game" or press R to restart', size / 2, size / 2 + 30);
  }
  
  renderThinkingIndicator() {
    const ctx = this.ctx;
    const size = this.canvas.width;
    
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(size / 2 - 80, this.boardSize / 2 + this.offsetY - 15, 160, 30);
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AI thinking...', size / 2, this.boardSize / 2 + this.offsetY);
  }
  
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new ChessGame('chessCanvas');
  window.chessGame = game;
});
