// Chess Game - Todoist Edition (Tracked)

import { ChessEngine, UNICODE, COLORS } from './chess.js';
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
        this.gameLog = [];
        
        this.resize();
        this.setupEvents();
        this.draw();
        this.log('Game initialized');
    }

    log(msg) {
        this.gameLog.push({ time: Date.now(), msg });
        console.log(`[Chess] ${msg}`);
    }

    resize() {
        this.boardSize = Math.min(window.innerWidth - 40, window.innerHeight - 120, 640);
        this.squareSize = this.boardSize / 8;
        this.canvas.width = this.boardSize;
        this.canvas.height = this.boardSize;
    }

    setupEvents() {
        this.canvas.addEventListener('click', (e) => this.click(e));
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.click(e.touches[0]); });
        window.addEventListener('resize', () => { this.resize(); this.draw(); });
    }

    click(e) {
        if (this.gameOver || this.engine.turn !== COLORS.WHITE) return;
        const rect = this.canvas.getBoundingClientRect();
        const col = Math.floor((e.clientX - rect.left) / this.squareSize);
        const row = Math.floor((e.clientY - rect.top) / this.squareSize);
        if (row < 0 || row > 7 || col < 0 || col > 7) return;

        if (this.selected) {
            const move = this.legalMoves.find(m => m.tr === row && m.tc === col);
            if (move) { this.makeMove(move); return; }
            if (this.engine.get(row, col)?.color === COLORS.WHITE) { this.select(row, col); return; }
            this.clear(); return;
        }

        if (this.engine.get(row, col)?.color === COLORS.WHITE) this.select(row, col);
    }

    select(row, col) {
        this.selected = { row, col };
        this.legalMoves = this.engine.genMoves(COLORS.WHITE).filter(m => m.fr === row && m.fc === col);
        this.log(`Selected piece at ${String.fromCharCode(97 + col)}${8 - row}`);
        this.draw();
    }

    clear() { this.selected = null; this.legalMoves = []; this.draw(); }

    async makeMove(move) {
        const moveStr = `${String.fromCharCode(97 + move.fc)}${8 - move.fr}-${String.fromCharCode(97 + move.tc)}${8 - move.tr}`;
        this.engine.makeMove(move);
        this.lastMove = move;
        this.clear();
        this.updateStatus();
        this.draw();
        this.log(`Player moved: ${moveStr}`);
        if (!this.gameOver) await this.aiMove();
    }

    async aiMove() {
        this.statusEl.textContent = 'AI thinking...';
        await new Promise(r => setTimeout(r, 50));
        const move = this.ai.findBestMove(this.engine);
        if (move) {
            const moveStr = `${String.fromCharCode(97 + move.fc)}${8 - move.fr}-${String.fromCharCode(97 + move.tc)}${8 - move.tr}`;
            this.engine.makeMove(move);
            this.lastMove = move;
            this.updateStatus();
            this.draw();
            this.log(`AI moved: ${moveStr} (search: ${JSON.stringify(this.ai.getSearchLog())})`);
        }
    }

    updateStatus() {
        const s = this.engine.status();
        this.statusEl.textContent = s;
        if (s.includes('wins') || s.includes('Draw')) {
            this.gameOver = true;
            this.log(`Game over: ${s}`);
        }
    }

    draw() {
        const { ctx, squareSize } = this;
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++) {
                ctx.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#b58863';
                ctx.fillRect(c * squareSize, r * squareSize, squareSize, squareSize);
            }
        if (this.lastMove) {
            ctx.fillStyle = 'rgba(155, 199, 0, 0.4)';
            ctx.fillRect(this.lastMove.fc * squareSize, this.lastMove.fr * squareSize, squareSize, squareSize);
            ctx.fillRect(this.lastMove.tc * squareSize, this.lastMove.tr * squareSize, squareSize, squareSize);
        }
        if (this.selected) {
            ctx.fillStyle = 'rgba(20, 85, 30, 0.5)';
            ctx.fillRect(this.selected.col * squareSize, this.selected.row * squareSize, squareSize, squareSize);
        }
        for (const m of this.legalMoves) {
            ctx.fillStyle = this.engine.board[m.tr][m.tc] ? 'rgba(255, 0, 0, 0.4)' : 'rgba(20, 85, 30, 0.3)';
            ctx.beginPath();
            ctx.arc(m.tc * squareSize + squareSize / 2, m.tr * squareSize + squareSize / 2,
                this.engine.board[m.tr][m.tc] ? squareSize / 2 - 4 : squareSize / 6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.font = `${squareSize * 0.8}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (this.engine.board[r][c])
                    ctx.fillText(UNICODE[this.engine.board[r][c].color + this.engine.board[r][c].type],
                        c * squareSize + squareSize / 2, r * squareSize + squareSize / 2 + 4);
    }

    getGameLog() { return [...this.gameLog]; }
    getMoveHistory() { return this.engine.getMoveLog(); }
}

new ChessGame('chess-board');
