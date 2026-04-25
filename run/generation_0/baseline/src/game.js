/**
 * Chess Game - Main controller, UI rendering, and interactions
 * Uses HTML5 Canvas API
 */

class ChessGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.engine = null;
        this.ai = null;
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.gameStarted = false;
        this.aiThinking = false;
        this.animating = false;
        this.promotionPending = null; // { from, to, color }
        
        // Animation state
        this.animations = [];
        
        // Board dimensions
        this.boardSize = 480;
        this.squareSize = this.boardSize / 8;
        this.padding = 0;
        
        // Colors
        this.colors = {
            light: '#F0D9B5',
            dark: '#B58863',
            selected: '#829769',
            validMove: '#829769',
            lastMove: '#CDC973',
            check: '#FF6B6B',
            promotionBg: 'rgba(0,0,0,0.6)',
            whiteText: '#FFFFFF',
            blackText: '#000000'
        };
        
        // Drag state
        this.dragPiece = null;
        this.dragOffset = null;
        this.dragFrom = null;
        
        // Bind events
        this.setupCanvas();
        this.setupEvents();
        
        // Start
        this.init();
    }
    
    init() {
        // Create engine and AI
        this.engine = new ChessEngine();
        this.ai = new ChessAI();
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.gameStarted = true;
        this.aiThinking = false;
        this.animations = [];
        this.promotionPending = null;
        this.dragPiece = null;
        
        this.resize();
        this.render();
        this.updateStatus();
    }
    
    setupCanvas() {
        // Make canvas responsive
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        const container = this.canvas.parentElement || document.body;
        const maxW = container.clientWidth - 40;
        const maxH = window.innerHeight - 120;
        const size = Math.min(maxW, maxH, 600);
        
        this.boardSize = size;
        this.squareSize = size / 8;
        
        this.canvas.width = size;
        this.canvas.height = size;
        
        // Also resize promotion overlay canvas if exists
        this.render();
    }
    
    setupEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    }
    
    getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        return {
            x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    getSquareFromPos(pos) {
        const col = Math.floor(pos.x / this.squareSize);
        const row = Math.floor(pos.y / this.squareSize);
        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            return { row, col };
        }
        return null;
    }
    
    onMouseDown(e) {
        if (this.aiThinking || this.animating || this.promotionPending) return;
        const pos = this.getCanvasPos(e);
        const square = this.getSquareFromPos(pos);
        if (!square) return;
        
        this.handleSquareClick(square, pos);
    }
    
    onMouseMove(e) {
        if (this.dragPiece && !this.aiThinking) {
            const pos = this.getCanvasPos(e);
            this.render();
            this.drawDragPiece(pos);
        }
    }
    
    onMouseUp(e) {
        if (this.dragPiece && !this.aiThinking) {
            const pos = this.getCanvasPos(e);
            const square = this.getSquareFromPos(pos);
            if (square) {
                this.tryMove(this.dragFrom, square);
            }
            this.dragPiece = null;
            this.dragOffset = null;
            this.dragFrom = null;
            this.render();
        }
    }
    
    onTouchStart(e) {
        e.preventDefault();
        if (this.aiThinking || this.animating || this.promotionPending) return;
        const pos = this.getTouchPos(e);
        const square = this.getSquareFromPos(pos);
        if (!square) return;
        
        this.handleSquareClick(square, pos);
    }
    
    onTouchMove(e) {
        e.preventDefault();
        if (this.dragPiece && !this.aiThinking) {
            const pos = this.getTouchPos(e);
            this.render();
            this.drawDragPiece(pos);
        }
    }
    
    onTouchEnd(e) {
        e.preventDefault();
        if (this.dragPiece && !this.aiThinking) {
            const rect = this.canvas.getBoundingClientRect();
            const pos = {
                x: (e.changedTouches[0].clientX - rect.left) * (this.canvas.width / rect.width),
                y: (e.changedTouches[0].clientY - rect.top) * (this.canvas.height / rect.height)
            };
            const square = this.getSquareFromPos(pos);
            if (square) {
                this.tryMove(this.dragFrom, square);
            }
            this.dragPiece = null;
            this.dragOffset = null;
            this.dragFrom = null;
            this.render();
        }
    }
    
    handleSquareClick(square, pos) {
        if (this.engine.gameOver) {
            // Click to restart
            this.init();
            return;
        }
        
        const piece = this.engine.board[square.row][square.col];
        
        // If we have a selected square and click on a valid move target
        if (this.selectedSquare) {
            // Check if clicking on a valid move
            const isValid = this.validMoves.some(m => 
                m.to.row === square.row && m.to.col === square.col
            );
            
            if (isValid) {
                this.tryMove(this.selectedSquare, square);
                return;
            }
            
            // If clicking on own piece, re-select
            if (piece && piece.color === this.engine.turn) {
                this.selectedSquare = square;
                this.validMoves = this.getValidMovesForSquare(square);
                this.render();
                return;
            }
            
            // Deselect
            this.selectedSquare = null;
            this.validMoves = [];
            this.render();
            return;
        }
        
        // Select a piece
        if (piece && piece.color === this.engine.turn) {
            this.selectedSquare = square;
            this.validMoves = this.getValidMovesForSquare(square);
            
            // Start drag
            this.dragPiece = piece;
            this.dragFrom = square;
            this.dragOffset = {
                x: pos.x - square.col * this.squareSize,
                y: pos.y - square.row * this.squareSize
            };
            
            this.render();
        }
    }
    
    getValidMovesForSquare(square) {
        const moves = this.engine.generateLegalMoves(this.engine.turn);
        return moves.filter(m => m.from.row === square.row && m.from.col === square.col);
    }
    
    tryMove(from, to) {
        const moves = this.getValidMovesForSquare(from);
        const move = moves.find(m => m.to.row === to.row && m.to.col === to.col);
        
        if (!move) {
            // Check if it's a pawn promotion that needs selection
            const promoMoves = moves.filter(m => 
                m.to.row === to.row && m.to.col === to.col && m.promotion
            );
            if (promoMoves.length > 0) {
                // Show promotion UI
                this.showPromotionUI(from, to, this.engine.turn);
                return;
            }
            
            this.selectedSquare = null;
            this.validMoves = [];
            this.render();
            return;
        }
        
        this.executeMove(move);
    }
    
    executeMove(move) {
        // Take a snapshot for animation
        const fromPos = { row: move.from.row, col: move.from.col };
        const toPos = { row: move.to.row, col: move.to.col };
        const movingPiece = this.engine.board[move.from.row][move.from.col];
        const capturedPiece = this.engine.board[move.to.row][move.to.col];
        
        // Execute the move in the engine
        const result = this.engine.makeMove(move);
        
        // Store move for history
        this.moveHistory.push({
            move,
            from: fromPos,
            to: toPos,
            piece: movingPiece,
            captured: capturedPiece,
            result
        });
        
        // Clear selection
        this.selectedSquare = null;
        this.validMoves = [];
        
        // Animate the move
        this.animateMove(fromPos, toPos, movingPiece, () => {
            this.render();
            this.updateStatus();
            
            // Check for AI turn
            if (!this.engine.gameOver && this.engine.turn === 'black') {
                this.scheduleAI();
            }
        });
    }
    
    animateMove(from, to, piece, callback) {
        this.animating = true;
        
        // Simple flash animation: just re-render with highlight
        this.animations.push({
            from, to, piece,
            startTime: Date.now(),
            duration: 200,
            callback
        });
        
        if (this.animations.length === 1) {
            this.runAnimation();
        }
    }
    
    runAnimation() {
        if (this.animations.length === 0) {
            this.animating = false;
            return;
        }
        
        const anim = this.animations[0];
        const elapsed = Date.now() - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);
        
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        
        this.render();
        
        // Draw moving piece at interpolated position
        if (anim.piece) {
            const fromX = anim.from.col * this.squareSize;
            const fromY = anim.from.row * this.squareSize;
            const toX = anim.to.col * this.squareSize;
            const toY = anim.to.row * this.squareSize;
            const x = fromX + (toX - fromX) * eased;
            const y = fromY + (toY - fromY) * eased;
            
            this.drawPieceAt(anim.piece, x, y, this.squareSize);
        }
        
        if (progress >= 1) {
            this.animations.shift();
            const cb = anim.callback;
            if (cb) setTimeout(cb, 0);
            if (this.animations.length > 0) {
                this.runAnimation();
            } else {
                this.animating = false;
            }
        } else {
            requestAnimationFrame(() => this.runAnimation());
        }
    }
    
    showPromotionUI(from, to, color) {
        this.promotionPending = { from, to, color };
        this.renderPromotionUI();
    }
    
    handlePromotion(pieceType) {
        if (!this.promotionPending) return;
        
        const { from, to, color } = this.promotionPending;
        this.promotionPending = null;
        
        const moves = this.engine.generateLegalMoves(color);
        const move = moves.find(m => 
            m.from.row === from.row && m.from.col === from.col &&
            m.to.row === to.row && m.to.col === to.col &&
            m.promotion === pieceType
        );
        
        if (move) {
            this.executeMove(move);
        }
    }
    
    scheduleAI() {
        if (this.aiThinking || this.engine.turn !== 'black') return;
        this.aiThinking = true;
        this.updateStatus();
        
        // Use setTimeout to allow UI to update
        setTimeout(() => {
            try {
                const move = this.ai.getBestMove(this.engine);
                if (move) {
                    this.aiThinking = false;
                    this.executeMove(move);
                } else {
                    this.aiThinking = false;
                    this.render();
                    this.updateStatus();
                }
            } catch (e) {
                console.error('AI error:', e);
                this.aiThinking = false;
                this.render();
                this.updateStatus();
            }
        }, 100);
    }
    
    render() {
        const ctx = this.ctx;
        const size = this.boardSize;
        
        // Clear
        ctx.clearRect(0, 0, size, size);
        
        // Background
        ctx.fillStyle = this.colors.light;
        ctx.fillRect(0, 0, size, size);
        
        // Draw board
        this.drawBoard();
        
        // Draw last move highlight
        if (this.engine.lastMove) {
            this.drawLastMoveHighlight();
        }
        
        // Draw selected square highlight
        if (this.selectedSquare) {
            this.drawSquareHighlight(this.selectedSquare.row, this.selectedSquare.col, this.colors.selected);
        }
        
        // Draw valid moves
        this.drawValidMoves();
        
        // Draw pieces
        this.drawPieces();
        
        // Draw check highlight
        if (this.engine.inCheck) {
            const kingPos = this.engine.findKing(this.engine.turn);
            if (kingPos) {
                this.drawSquareHighlight(kingPos.row, kingPos.col, this.colors.check);
            }
        }
        
        // Draw game over overlay
        if (this.engine.gameOver) {
            this.drawGameOver();
        }
        
        // Draw promotion UI if pending
        if (this.promotionPending) {
            this.renderPromotionUI();
        }
    }
    
    drawBoard() {
        const ctx = this.ctx;
        const sq = this.squareSize;
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const isLight = (r + c) % 2 === 0;
                ctx.fillStyle = isLight ? this.colors.light : this.colors.dark;
                ctx.fillRect(c * sq, r * sq, sq, sq);
            }
        }
        
        // Draw border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, this.boardSize, this.boardSize);
    }
    
    drawSquareHighlight(row, col, color) {
        const ctx = this.ctx;
        const sq = this.squareSize;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(col * sq, row * sq, sq, sq);
        ctx.globalAlpha = 1.0;
    }
    
    drawLastMoveHighlight() {
        const lastMove = this.engine.lastMove;
        if (!lastMove) return;
        this.drawSquareHighlight(lastMove.from.row, lastMove.from.col, this.colors.lastMove);
        this.drawSquareHighlight(lastMove.to.row, lastMove.to.col, this.colors.lastMove);
    }
    
    drawValidMoves() {
        const ctx = this.ctx;
        const sq = this.squareSize;
        
        for (const move of this.validMoves) {
            const row = move.to.row;
            const col = move.to.col;
            const target = this.engine.board[row][col];
            
            if (target) {
                // Capture indicator
                ctx.strokeStyle = this.colors.validMove;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(col * sq + sq / 2, row * sq + sq / 2, sq / 2 - 4, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // Move indicator (small circle)
                ctx.fillStyle = this.colors.validMove;
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.arc(col * sq + sq / 2, row * sq + sq / 2, sq / 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        }
    }
    
    drawPieces() {
        const sq = this.squareSize;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.engine.board[r][c];
                if (piece) {
                    // Don't draw the piece being dragged
                    if (this.dragPiece && this.dragFrom && 
                        this.dragFrom.row === r && this.dragFrom.col === c) continue;
                    
                    this.drawPieceAt(piece, c * sq, r * sq, sq);
                }
            }
        }
    }
    
    drawPieceAt(piece, x, y, size) {
        const ctx = this.ctx;
        const symbol = piece.symbol;
        const fontSize = size * 0.85;
        
        ctx.font = `${fontSize}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Arial Unicode MS', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Shadow for depth
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillStyle = piece.color === 'white' ? '#FFFFFF' : '#000000';
        ctx.fillText(symbol, x + size / 2, y + size / 2 + 2);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Stroke for white pieces to make them visible on light squares
        if (piece.color === 'white') {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeText(symbol, x + size / 2, y + size / 2 + 2);
        }
    }
    
    drawDragPiece(pos) {
        if (!this.dragPiece) return;
        const sq = this.squareSize;
        this.drawPieceAt(
            this.dragPiece,
            pos.x - this.dragOffset.x - sq / 2 + sq / 2,
            pos.y - this.dragOffset.y - sq / 2 + sq / 2,
            sq
        );
    }
    
    renderPromotionUI() {
        if (!this.promotionPending) return;
        
        const ctx = this.ctx;
        const sq = this.squareSize;
        const color = this.promotionPending.color;
        
        // Darken background
        ctx.fillStyle = this.colors.promotionBg;
        ctx.fillRect(0, 0, this.boardSize, this.boardSize);
        
        // Draw promotion selection box
        const boxWidth = sq * 4.5;
        const boxHeight = sq * 1.5;
        const boxX = (this.boardSize - boxWidth) / 2;
        const boxY = (this.boardSize - boxHeight) / 2;
        
        ctx.fillStyle = '#2C2C2C';
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 10);
        ctx.fill();
        ctx.stroke();
        
        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Promote Pawn to:', this.boardSize / 2, boxY + 20);
        
        // Piece options
        const pieces = ['queen', 'rook', 'bishop', 'knight'];
        const symbols = [];
        for (const p of pieces) {
            symbols.push(PIECE_SYMBOLS[color][p]);
        }
        
        const pieceSize = sq * 0.9;
        const totalWidth = pieces.length * pieceSize + (pieces.length - 1) * 10;
        let startX = (this.boardSize - totalWidth) / 2;
        const optionY = boxY + boxHeight / 2 + 5;
        
        ctx.font = `${pieceSize}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Arial Unicode MS', sans-serif`;
        
        // Store clickable areas for promotion options
        this.promotionAreas = [];
        
        for (let i = 0; i < pieces.length; i++) {
            const x = startX + i * (pieceSize + 10);
            const y = optionY - pieceSize / 2;
            
            // Background circle
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.arc(x + pieceSize / 2, y + pieceSize / 2, pieceSize / 2 + 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = color === 'white' ? '#FFFFFF' : '#000000';
            ctx.fillText(symbols[i], x + pieceSize / 2, y + pieceSize / 2 + 3);
            
            // Stroke for white pieces
            if (color === 'white') {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.strokeText(symbols[i], x + pieceSize / 2, y + pieceSize / 2 + 3);
            }
            
            this.promotionAreas.push({
                x: x,
                y: y,
                w: pieceSize,
                h: pieceSize,
                pieceType: pieces[i]
            });
        }
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
    
    drawGameOver() {
        const ctx = this.ctx;
        const size = this.boardSize;
        
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, size, size);
        
        let message = '';
        if (this.engine.gameResult) {
            if (this.engine.gameResult.winner) {
                message = `${this.engine.gameResult.winner.charAt(0).toUpperCase() + this.engine.gameResult.winner.slice(1)} wins by ${this.engine.gameResult.reason}!`;
            } else {
                message = `Draw by ${this.engine.gameResult.reason}`;
            }
        }
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, size / 2, size / 2 - 20);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '18px sans-serif';
        ctx.fillText('Click to play again', size / 2, size / 2 + 30);
    }
    
    updateStatus() {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;
        
        if (this.engine.gameOver) {
            if (this.engine.gameResult) {
                if (this.engine.gameResult.winner) {
                    statusEl.textContent = `${this.engine.gameResult.winner.charAt(0).toUpperCase() + this.engine.gameResult.winner.slice(1)} wins by ${this.engine.gameResult.reason}!`;
                } else {
                    statusEl.textContent = `Draw by ${this.engine.gameResult.reason}`;
                }
            }
            statusEl.className = 'status game-over';
        } else if (this.aiThinking) {
            statusEl.textContent = 'AI is thinking...';
            statusEl.className = 'status thinking';
        } else if (this.engine.turn === 'white') {
            statusEl.textContent = 'Your turn (White)';
            statusEl.className = 'status your-turn';
        } else {
            statusEl.textContent = "Black's turn";
            statusEl.className = 'status';
        }
    }
}

// Export for browser use
window.ChessGame = ChessGame;
