// Chess Game - UI and Game Controller

import { ChessEngine, UNICODE_PIECES, COLORS, PIECES } from './chess.js';
import { ChessAI } from './ai.js';

export class ChessGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.engine = new ChessEngine();
        this.ai = new ChessAI(4, 240);
        
        this.boardSize = Math.min(window.innerWidth - 40, window.innerHeight - 120, 640);
        this.squareSize = this.boardSize / 8;
        this.canvas.width = this.boardSize;
        this.canvas.height = this.boardSize;
        
        this.selectedSquare = null;
        this.legalMoves = [];
        this.lastMove = null;
        this.gameOver = false;
        this.animatingPiece = null;
        this.animationProgress = 0;
        
        this.statusElement = document.getElementById('status');
        
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        this.boardSize = Math.min(window.innerWidth - 40, window.innerHeight - 120, 640);
        this.squareSize = this.boardSize / 8;
        this.canvas.width = this.boardSize;
        this.canvas.height = this.boardSize;
        this.render();
    }

    getSquareFromEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / this.squareSize);
        const row = Math.floor(y / this.squareSize);
        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            return { row, col };
        }
        return null;
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const col = Math.floor(x / this.squareSize);
        const row = Math.floor(y / this.squareSize);
        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            this.handleClick({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    handleClick(e) {
        if (this.gameOver || this.engine.turn === COLORS.BLACK) return;

        const square = this.getSquareFromEvent(e);
        if (!square) return;

        const piece = this.engine.getPiece(square.row, square.col);

        if (this.selectedSquare) {
            const move = this.legalMoves.find(m => 
                m.toRow === square.row && m.toCol === square.col
            );

            if (move) {
                this.makePlayerMove(move);
                return;
            }

            if (piece && piece.color === COLORS.WHITE) {
                this.selectSquare(square);
                return;
            }

            this.clearSelection();
            return;
        }

        if (piece && piece.color === COLORS.WHITE) {
            this.selectSquare(square);
        }
    }

    selectSquare(square) {
        this.selectedSquare = square;
        this.legalMoves = this.engine.generateLegalMoves(COLORS.WHITE)
            .filter(m => m.fromRow === square.row && m.fromCol === square.col);
        this.render();
    }

    clearSelection() {
        this.selectedSquare = null;
        this.legalMoves = [];
        this.render();
    }

    async makePlayerMove(move) {
        this.engine.makeMove(move);
        this.lastMove = move;
        this.clearSelection();
        this.updateStatus();
        this.render();

        if (!this.gameOver) {
            await this.makeAIMove();
        }
    }

    async makeAIMove() {
        this.statusElement.textContent = 'AI is thinking...';
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const move = this.ai.findBestMove(this.engine);
        if (move) {
            this.engine.makeMove(move);
            this.lastMove = move;
            this.updateStatus();
            this.render();
        }
    }

    updateStatus() {
        const status = this.engine.getGameStatus();
        this.statusElement.textContent = status;
        
        if (status.includes('checkmate') || status.includes('Draw')) {
            this.gameOver = true;
        }
    }

    render() {
        this.drawBoard();
        this.drawHighlights();
        this.drawPieces();
    }

    drawBoard() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const isLight = (row + col) % 2 === 0;
                this.ctx.fillStyle = isLight ? '#f0d9b5' : '#b58863';
                this.ctx.fillRect(col * this.squareSize, row * this.squareSize, this.squareSize, this.squareSize);
            }
        }
    }

    drawHighlights() {
        // Highlight last move
        if (this.lastMove) {
            this.ctx.fillStyle = 'rgba(155, 199, 0, 0.4)';
            this.ctx.fillRect(
                this.lastMove.fromCol * this.squareSize,
                this.lastMove.fromRow * this.squareSize,
                this.squareSize,
                this.squareSize
            );
            this.ctx.fillRect(
                this.lastMove.toCol * this.squareSize,
                this.lastMove.toRow * this.squareSize,
                this.squareSize,
                this.squareSize
            );
        }

        // Highlight selected square
        if (this.selectedSquare) {
            this.ctx.fillStyle = 'rgba(20, 85, 30, 0.5)';
            this.ctx.fillRect(
                this.selectedSquare.col * this.squareSize,
                this.selectedSquare.row * this.squareSize,
                this.squareSize,
                this.squareSize
            );
        }

        // Highlight legal moves
        for (const move of this.legalMoves) {
            const piece = this.engine.getPiece(move.toRow, move.toCol);
            if (piece) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            } else {
                this.ctx.fillStyle = 'rgba(20, 85, 30, 0.3)';
            }
            this.ctx.beginPath();
            this.ctx.arc(
                move.toCol * this.squareSize + this.squareSize / 2,
                move.toRow * this.squareSize + this.squareSize / 2,
                piece ? this.squareSize / 2 - 4 : this.squareSize / 6,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
    }

    drawPieces() {
        this.ctx.font = `${this.squareSize * 0.8}px serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.engine.getPiece(row, col);
                if (piece) {
                    const key = `${piece.color}${piece.type}`;
                    const symbol = UNICODE_PIECES[key];
                    this.ctx.fillText(
                        symbol,
                        col * this.squareSize + this.squareSize / 2,
                        row * this.squareSize + this.squareSize / 2 + 4
                    );
                }
            }
        }
    }
}

// Initialize game
const game = new ChessGame('chess-board');
