// Chess Game with comprehensive error handling and validation

import { ChessEngine, UNICODE, COLORS, PIECES } from './chess.js';
import { ChessAI } from './ai.js';

class ChessGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.engine = new ChessEngine();
        this.ai = new ChessAI(4, 240);
        this.selected = null;
        this.legalMoves = [];
        this.lastMove = null;
        this.gameOver = false;
        this.statusEl = document.getElementById('status');
        this.boardSize = 640;
        this.squareSize = 80;
        
        this.init();
    }

    init() {
        this.resize();
        this.setupEvents();
        this.draw();
    }

    resize() {
        this.boardSize = Math.min(window.innerWidth - 40, window.innerHeight - 120, 640);
        this.squareSize = this.boardSize / 8;
        this.canvas.width = this.boardSize;
        this.canvas.height = this.boardSize;
    }

    setupEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleClick(e.touches[0]); });
        window.addEventListener('resize', () => { this.resize(); this.draw(); });
    }

    handleClick(e) {
        if (this.gameOver || this.engine.turn !== COLORS.WHITE) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / this.squareSize);
        const row = Math.floor(y / this.squareSize);
        
        if (!this.engine.validatePosition(row, col)) return;

        if (this.selected) {
            const move = this.legalMoves.find(m => m.tr === row && m.tc === col);
            if (move) { this.makePlayerMove(move); return; }
            const piece = this.engine.get(row, col);
            if (piece?.color === COLORS.WHITE) { this.select(row, col); return; }
            this.clear(); return;
        }

        const piece = this.engine.get(row, col);
        if (piece?.color === COLORS.WHITE) this.select(row, col);
    }

    select(row, col) {
        this.selected = { row, col };
        this.legalMoves = this.engine.genMoves(COLORS.WHITE).filter(m => m.fr === row && m.fc === col);
        this.draw();
    }

    clear() { this.selected = null; this.legalMoves = []; this.draw(); }

    async makePlayerMove(move) {
        this.engine.makeMove(move);
        this.lastMove = move;
        this.clear();
        this.updateStatus();
        this.draw();
        if (!this.gameOver) await this.makeAIMove();
    }

    async makeAIMove() {
        this.statusEl.textContent = 'AI thinking...';
        await new Promise(r => setTimeout(r, 50));
        const move = this.ai.findBestMove(this.engine);
        if (move) {
            this.engine.makeMove(move);
            this.lastMove = move;
            this.updateStatus();
            this.draw();
        }
    }

    updateStatus() {
        const s = this.engine.status();
        this.statusEl.textContent = s;
        if (s.includes('wins') || s.includes('Draw')) this.gameOver = true;
    }

    draw() {
        const { ctx, squareSize } = this;
        
        // Draw board
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                ctx.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#b58863';
                ctx.fillRect(c * squareSize, r * squareSize, squareSize, squareSize);
            }
        }

        // Highlight last move
        if (this.lastMove) {
            ctx.fillStyle = 'rgba(155, 199, 0, 0.4)';
            ctx.fillRect(this.lastMove.fc * squareSize, this.lastMove.fr * squareSize, squareSize, squareSize);
            ctx.fillRect(this.lastMove.tc * squareSize, this.lastMove.tr * squareSize, squareSize, squareSize);
        }

        // Highlight selected
        if (this.selected) {
            ctx.fillStyle = 'rgba(20, 85, 30, 0.5)';
            ctx.fillRect(this.selected.col * squareSize, this.selected.row * squareSize, squareSize, squareSize);
        }

        // Highlight legal moves
        for (const m of this.legalMoves) {
            const cap = this.engine.board[m.tr][m.tc];
            ctx.fillStyle = cap ? 'rgba(255, 0, 0, 0.4)' : 'rgba(20, 85, 30, 0.3)';
            ctx.beginPath();
            ctx.arc(m.tc * squareSize + squareSize / 2, m.tr * squareSize + squareSize / 2,
                cap ? squareSize / 2 - 4 : squareSize / 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw pieces
        ctx.font = `${squareSize * 0.8}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.engine.board[r][c];
                if (p) ctx.fillText(UNICODE[p.color + p.type], c * squareSize + squareSize / 2, r * squareSize + squareSize / 2 + 4);
            }
        }
    }
}

new ChessGame('chess-board');
