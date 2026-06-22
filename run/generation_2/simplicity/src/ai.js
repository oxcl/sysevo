// Chess AI - Simplicity Edition

import { PIECES as P, COLORS as C } from './chess.js';

const V = { K:20000, Q:900, R:500, B:330, N:320, P:100 };
const T = {
    P: [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
    N: [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
    B: [[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,10,10,10,10,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
    R: [[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
    Q: [[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
    K: [[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
};

export class ChessAI {
    constructor(d = 4, tl = 240) {
        this.md = d;
        this.tl = tl;
        this.n = 0;
        this.s = 0;
        this.to = false;
    }

    ev(e) {
        let sc = 0;
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++) {
                const p = e.b[r][c];
                if (p) sc += (p.cl === C.W ? 1 : -1) * (V[p.t] + (T[p.t]?.[p.cl === C.W ? r : 7-r]?.[c] || 0));
            }
        return sc;
    }

    om(e, m) {
        return m.sort((a, b) => {
            let sa = 0, sb = 0;
            if (e.b[a.tr][a.tc]) sa += V[e.b[a.tr][a.tc].t];
            if (e.b[b.tr][b.tc]) sb += V[e.b[b.tr][b.tc].t];
            if (a.sp === 'promo') sa += V.Q;
            if (b.sp === 'promo') sb += V.Q;
            return sb - sa;
        });
    }

    mm(e, d, a, b, mx) {
        this.n++;
        if (this.to || Date.now() - this.s > this.tl) { this.to = true; return null; }
        if (d === 0) return this.ev(e);
        const m = this.om(e, e.gm());
        if (!m.length) return e.ic(e.turn) ? (mx ? -100000 + this.md - d : 100000 - this.md + d) : 0;
        if (mx) {
            let best = -Infinity;
            for (const mv of m) {
                e.mm(mv);
                const v = this.mm(e, d - 1, a, b, false);
                e.um(mv);
                if (v === null) return null;
                best = Math.max(best, v);
                a = Math.max(a, v);
                if (b <= a) break;
            }
            return best;
        } else {
            let best = Infinity;
            for (const mv of m) {
                e.mm(mv);
                const v = this.mm(e, d - 1, a, b, true);
                e.um(mv);
                if (v === null) return null;
                best = Math.min(best, v);
                b = Math.min(b, v);
                if (b <= a) break;
            }
            return best;
        }
    }

    fb(e) {
        this.s = Date.now();
        this.n = 0;
        this.to = false;
        const m = e.gm(C.B);
        if (!m.length) return null;
        let best = m[0];
        for (let d = 1; d <= this.md; d++) {
            let cur = null, cs = Infinity;
            for (const mv of m) {
                e.mm(mv);
                const s = this.mm(e, d - 1, -Infinity, Infinity, true);
                e.um(mv);
                if (s === null) break;
                if (s < cs) { cs = s; cur = mv; }
            }
            if (cur && !this.to) best = cur;
            if (this.to || Date.now() - this.s > this.tl * 0.7) break;
        }
        return best;
    }
}
