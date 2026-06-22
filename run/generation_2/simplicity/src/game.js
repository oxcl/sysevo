// Chess Game - Simplicity Edition

import { ChessEngine, UNICODE, COLORS } from './chess.js';
import { ChessAI } from './ai.js';

class Game {
    constructor(id) {
        this.cv = document.getElementById(id);
        this.cx = this.cv.getContext('2d');
        this.eng = new ChessEngine();
        this.ai = new ChessAI(4, 240);
        this.sel = null;
        this.mvs = [];
        this.last = null;
        this.over = false;
        this.st = document.getElementById('status');
        this.sz = 640;
        this.sq = 80;
        this.rs();
        this.ev();
        this.dr();
    }

    rs() {
        this.sz = Math.min(innerWidth - 40, innerHeight - 120, 640);
        this.sq = this.sz / 8;
        this.cv.width = this.cv.height = this.sz;
    }

    ev() {
        this.cv.onclick = e => this.cl(e);
        this.cv.ontouchstart = e => { e.preventDefault(); this.cl(e.touches[0]); };
        addEventListener('resize', () => { this.rs(); this.dr(); });
    }

    cl(e) {
        if (this.over || this.eng.turn !== COLORS.WHITE) return;
        const r = this.cv.getBoundingClientRect();
        const c = Math.floor((e.clientX - r.left) / this.sq);
        const rw = Math.floor((e.clientY - r.top) / this.sq);
        if (rw < 0 || rw > 7 || c < 0 || c > 7) return;
        if (this.sel) {
            const m = this.mvs.find(m => m.tr === rw && m.tc === c);
            if (m) { this.mk(m); return; }
            if (this.eng.g(rw, c)?.cl === COLORS.WHITE) { this.sl(rw, c); return; }
            this.clr(); return;
        }
        if (this.eng.g(rw, c)?.cl === COLORS.WHITE) this.sl(rw, c);
    }

    sl(r, c) {
        this.sel = { r, c };
        this.mvs = this.eng.gm(COLORS.WHITE).filter(m => m.fr === r && m.fc === c);
        this.dr();
    }

    clr() { this.sel = null; this.mvs = []; this.dr(); }

    async mk(m) {
        this.eng.mm(m);
        this.last = m;
        this.clr();
        this.us();
        this.dr();
        if (!this.over) await this.aiM();
    }

    async aiM() {
        this.st.textContent = 'AI thinking...';
        await new Promise(r => setTimeout(r, 50));
        const m = this.ai.fb(this.eng);
        if (m) {
            this.eng.mm(m);
            this.last = m;
            this.us();
            this.dr();
        }
    }

    us() {
        const s = this.eng.status();
        this.st.textContent = s;
        if (s.includes('wins') || s.includes('Draw')) this.over = true;
    }

    dr() {
        const { cx, sq } = this;
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++) {
                cx.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#b58863';
                cx.fillRect(c * sq, r * sq, sq, sq);
            }
        if (this.last) {
            cx.fillStyle = 'rgba(155, 199, 0, 0.4)';
            cx.fillRect(this.last.fc * sq, this.last.fr * sq, sq, sq);
            cx.fillRect(this.last.tc * sq, this.last.tr * sq, sq, sq);
        }
        if (this.sel) {
            cx.fillStyle = 'rgba(20, 85, 30, 0.5)';
            cx.fillRect(this.sel.c * sq, this.sel.r * sq, sq, sq);
        }
        for (const m of this.mvs) {
            cx.fillStyle = this.eng.b[m.tr][m.tc] ? 'rgba(255, 0, 0, 0.4)' : 'rgba(20, 85, 30, 0.3)';
            cx.beginPath();
            cx.arc(m.tc * sq + sq / 2, m.tr * sq + sq / 2, this.eng.b[m.tr][m.tc] ? sq / 2 - 4 : sq / 6, 0, Math.PI * 2);
            cx.fill();
        }
        cx.font = `${sq * 0.8}px serif`;
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (this.eng.b[r][c])
                    cx.fillText(UNICODE[this.eng.b[r][c].cl + this.eng.b[r][c].t], c * sq + sq / 2, r * sq + sq / 2 + 4);
    }
}

new Game('chess-board');
