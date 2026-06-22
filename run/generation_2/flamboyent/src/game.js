// Chess Game with stunning visuals and animations

import { ChessEngine, UNICODE, COLORS, PIECES } from './chess.js';
import { ChessAI } from './ai.js';

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.02;
        this.size = Math.random() * 4 + 2;
        this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= this.decay; this.vy += 0.1; }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class ChessGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.engine = new ChessEngine();
        this.ai = new ChessAI(4, 240);
        this.particles = [];
        this.selected = null;
        this.legalMoves = [];
        this.lastMove = null;
        this.gameOver = false;
        this.status = document.getElementById('status');
        this.boardSize = 640;
        this.squareSize = 80;
        this.theme = {
            light: '#f0d9b5',
            dark: '#b58863',
            highlight: 'rgba(147, 51, 234, 0.4)',
            selected: 'rgba(147, 51, 234, 0.6)',
            move: 'rgba(52, 211, 153, 0.5)',
            capture: 'rgba(239, 68, 68, 0.5)'
        };
        
        this.resize();
        this.setupEvents();
        this.animate();
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
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const col = Math.floor(x / this.squareSize), row = Math.floor(y / this.squareSize);
        if (row < 0 || row > 7 || col < 0 || col > 7) return;

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
        const fromX = move.fc * this.squareSize + this.squareSize / 2;
        const fromY = move.fr * this.squareSize + this.squareSize / 2;
        const toX = move.tc * this.squareSize + this.squareSize / 2;
        const toY = move.tr * this.squareSize + this.squareSize / 2;
        
        this.spawnParticles(fromX, fromY, '#9333ea');
        this.spawnParticles(toX, toY, '#34d399');
        
        this.engine.makeMove(move);
        this.lastMove = move;
        this.clear();
        this.updateStatus();
        this.draw();
        if (!this.gameOver) await this.makeAIMove();
    }

    async makeAIMove() {
        this.status.textContent = 'AI thinking...';
        await new Promise(r => setTimeout(r, 50));
        const move = this.ai.findBestMove(this.engine);
        if (move) {
            const toX = move.tc * this.squareSize + this.squareSize / 2;
            const toY = move.tr * this.squareSize + this.squareSize / 2;
            this.spawnParticles(toX, toY, '#ef4444');
            this.engine.makeMove(move);
            this.lastMove = move;
            this.updateStatus();
            this.draw();
        }
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 20; i++) this.particles.push(new Particle(x, y, color));
    }

    updateStatus() {
        const s = this.engine.status();
        this.status.textContent = s;
        if (s.includes('wins') || s.includes('Draw')) this.gameOver = true;
    }

    animate() {
        if (this.particles.length) {
            this.draw();
            this.particles = this.particles.filter(p => p.life > 0);
            this.particles.forEach(p => { p.update(); p.draw(this.ctx); });
        }
        requestAnimationFrame(() => this.animate());
    }

    draw() {
        const { ctx, squareSize, boardSize } = this;
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                ctx.fillStyle = (r + c) % 2 === 0 ? this.theme.light : this.theme.dark;
                ctx.fillRect(c * squareSize, r * squareSize, squareSize, squareSize);
            }
        }

        if (this.lastMove) {
            ctx.fillStyle = this.theme.highlight;
            ctx.fillRect(this.lastMove.fc * squareSize, this.lastMove.fr * squareSize, squareSize, squareSize);
            ctx.fillRect(this.lastMove.tc * squareSize, this.lastMove.tr * squareSize, squareSize, squareSize);
        }

        if (this.selected) {
            ctx.fillStyle = this.theme.selected;
            ctx.fillRect(this.selected.col * squareSize, this.selected.row * squareSize, squareSize, squareSize);
        }

        for (const m of this.legalMoves) {
            const cap = this.engine.board[m.tr][m.tc];
            ctx.fillStyle = cap ? this.theme.capture : this.theme.move;
            ctx.beginPath();
            ctx.arc(m.tc * squareSize + squareSize / 2, m.tr * squareSize + squareSize / 2,
                cap ? squareSize / 2 - 4 : squareSize / 6, 0, Math.PI * 2);
            ctx.fill();
        }

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
