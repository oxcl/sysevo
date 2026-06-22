/**
 * Chess Game Controller Module
 * Handles UI rendering and user interaction
 */

import { ChessEngine, UNICODE_PIECES, COLORS } from './chess.js';
import { ChessAI } from './ai.js';

const SQUARE_COLORS = Object.freeze({
    LIGHT: '#f0d9b5',
    DARK: '#b58863',
    SELECTED: 'rgba(20, 85, 30, 0.5)',
    LAST_MOVE: 'rgba(155, 199, 0, 0.4)',
    LEGAL_MOVE: 'rgba(20, 85, 30, 0.3)',
    CAPTURE: 'rgba(255, 0, 0, 0.4)'
});

export class ChessGame {
    #canvas;
    #ctx;
    #engine;
    #ai;
    #boardSize;
    #squareSize;
    #selectedSquare;
    #legalMoves;
    #lastMove;
    #gameOver;
    #statusElement;

    constructor(canvasId) {
        this.#canvas = document.getElementById(canvasId);
        this.#ctx = this.#canvas.getContext('2d');
        this.#engine = new ChessEngine();
        this.#ai = new ChessAI(4, 240);
        this.#selectedSquare = null;
        this.#legalMoves = [];
        this.#lastMove = null;
        this.#gameOver = false;
        this.#statusElement = document.getElementById('status');

        this.#initializeCanvas();
        this.#setupEventListeners();
        this.#render();
    }

    #initializeCanvas() {
        this.#boardSize = Math.min(window.innerWidth - 40, window.innerHeight - 120, 640);
        this.#squareSize = this.#boardSize / 8;
        this.#canvas.width = this.#boardSize;
        this.#canvas.height = this.#boardSize;
    }

    #setupEventListeners() {
        this.#canvas.addEventListener('click', (e) => this.#handleClick(e));
        this.#canvas.addEventListener('touchstart', (e) => this.#handleTouch(e));
        window.addEventListener('resize', () => this.#handleResize());
    }

    #handleResize() {
        this.#initializeCanvas();
        this.#render();
    }

    #handleClick(e) {
        if (this.#gameOver || this.#engine.turn === COLORS.BLACK) return;
        const square = this.#getSquareFromEvent(e);
        if (square) this.#processSquareSelection(square);
    }

    #handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.#canvas.getBoundingClientRect();
        const square = this.#getSquareFromCoordinates(touch.clientX - rect.left, touch.clientY - rect.top);
        if (square) this.#processSquareSelection(square);
    }

    #getSquareFromEvent(e) {
        const rect = this.#canvas.getBoundingClientRect();
        return this.#getSquareFromCoordinates(e.clientX - rect.left, e.clientY - rect.top);
    }

    #getSquareFromCoordinates(x, y) {
        const col = Math.floor(x / this.#squareSize);
        const row = Math.floor(y / this.#squareSize);
        return (row >= 0 && row < 8 && col >= 0 && col < 8) ? { row, col } : null;
    }

    #processSquareSelection(square) {
        if (this.#selectedSquare) {
            const move = this.#findLegalMove(square);
            if (move) {
                this.#executePlayerMove(move);
                return;
            }
            if (this.#isOwnPieceAtSquare(square)) {
                this.#selectSquare(square);
                return;
            }
            this.#clearSelection();
            return;
        }
        if (this.#isOwnPieceAtSquare(square)) {
            this.#selectSquare(square);
        }
    }

    #findLegalMove(square) {
        return this.#legalMoves.find(m => m.toRow === square.row && m.toCol === square.col);
    }

    #isOwnPieceAtSquare(square) {
        const piece = this.#engine.getPiece(square.row, square.col);
        return piece?.color === COLORS.WHITE;
    }

    #selectSquare(square) {
        this.#selectedSquare = square;
        this.#legalMoves = this.#engine.generateLegalMoves(COLORS.WHITE)
            .filter(m => m.fromRow === square.row && m.fromCol === square.col);
        this.#render();
    }

    #clearSelection() {
        this.#selectedSquare = null;
        this.#legalMoves = [];
        this.#render();
    }

    async #executePlayerMove(move) {
        this.#engine.makeMove(move);
        this.#lastMove = move;
        this.#clearSelection();
        this.#updateStatus();
        this.#render();

        if (!this.#gameOver) {
            await this.#executeAIMove();
        }
    }

    async #executeAIMove() {
        this.#statusElement.textContent = 'AI is thinking...';
        await new Promise(resolve => setTimeout(resolve, 50));

        const move = this.#ai.findBestMove(this.#engine);
        if (move) {
            this.#engine.makeMove(move);
            this.#lastMove = move;
            this.#updateStatus();
            this.#render();
        }
    }

    #updateStatus() {
        const status = this.#engine.getGameStatus();
        this.#statusElement.textContent = status;
        this.#gameOver = status.includes('checkmate') || status.includes('Draw');
    }

    #render() {
        this.#drawBoard();
        this.#drawHighlights();
        this.#drawPieces();
    }

    #drawBoard() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                this.#ctx.fillStyle = (row + col) % 2 === 0 ? SQUARE_COLORS.LIGHT : SQUARE_COLORS.DARK;
                this.#ctx.fillRect(col * this.#squareSize, row * this.#squareSize, this.#squareSize, this.#squareSize);
            }
        }
    }

    #drawHighlights() {
        this.#drawLastMoveHighlight();
        this.#drawSelectedSquareHighlight();
        this.#drawLegalMoveIndicators();
    }

    #drawLastMoveHighlight() {
        if (!this.#lastMove) return;
        this.#ctx.fillStyle = SQUARE_COLORS.LAST_MOVE;
        this.#fillSquare(this.#lastMove.fromRow, this.#lastMove.fromCol);
        this.#fillSquare(this.#lastMove.toRow, this.#lastMove.toCol);
    }

    #drawSelectedSquareHighlight() {
        if (!this.#selectedSquare) return;
        this.#ctx.fillStyle = SQUARE_COLORS.SELECTED;
        this.#fillSquare(this.#selectedSquare.row, this.#selectedSquare.col);
    }

    #drawLegalMoveIndicators() {
        for (const move of this.#legalMoves) {
            const isCapture = this.#engine.getPiece(move.toRow, move.toCol);
            this.#ctx.fillStyle = isCapture ? SQUARE_COLORS.CAPTURE : SQUARE_COLORS.LEGAL_MOVE;
            this.#drawMoveIndicator(move.toRow, move.toCol, isCapture);
        }
    }

    #fillSquare(row, col) {
        this.#ctx.fillRect(col * this.#squareSize, row * this.#squareSize, this.#squareSize, this.#squareSize);
    }

    #drawMoveIndicator(row, col, isCapture) {
        const centerX = col * this.#squareSize + this.#squareSize / 2;
        const centerY = row * this.#squareSize + this.#squareSize / 2;
        const radius = isCapture ? this.#squareSize / 2 - 4 : this.#squareSize / 6;

        this.#ctx.beginPath();
        this.#ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.#ctx.fill();
    }

    #drawPieces() {
        this.#ctx.font = `${this.#squareSize * 0.8}px serif`;
        this.#ctx.textAlign = 'center';
        this.#ctx.textBaseline = 'middle';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.#engine.getPiece(row, col);
                if (piece) {
                    this.#drawPiece(piece, row, col);
                }
            }
        }
    }

    #drawPiece(piece, row, col) {
        const key = `${piece.color}${piece.type}`;
        const symbol = UNICODE_PIECES[key];
        this.#ctx.fillText(
            symbol,
            col * this.#squareSize + this.#squareSize / 2,
            row * this.#squareSize + this.#squareSize / 2 + 4
        );
    }
}

const game = new ChessGame('chess-board');
