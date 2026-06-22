// Chess Engine - Simplicity Edition

const P = { K:'K', Q:'Q', R:'R', B:'B', N:'N', P:'P' };
const C = { W:'w', B:'b' };
const U = { wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙', bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟' };

export class ChessEngine {
    constructor() {
        this.b = this.init();
        this.turn = C.W;
        this.hist = [];
        this.cast = { wK:true, wQ:true, bK:true, bQ:true };
        this.ep = null;
        this.hm = 0;
        this.fm = 1;
    }

    init() {
        const b = Array(8).fill(null).map(() => Array(8).fill(null));
        const r = [P.R,P.N,P.B,P.Q,P.K,P.B,P.N,P.R];
        for (let c = 0; c < 8; c++) {
            b[0][c] = { t: r[c], cl: C.B };
            b[1][c] = { t: P.P, cl: C.B };
            b[6][c] = { t: P.P, cl: C.W };
            b[7][c] = { t: r[c], cl: C.W };
        }
        return b;
    }

    g(r, c) { return (r >= 0 && r < 8 && c >= 0 && c < 8) ? this.b[r][c] : null; }
    ib(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

    fk(cl) {
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (this.b[r][c]?.t === P.K && this.b[r][c]?.cl === cl) return { r, c };
        return null;
    }

    att(r, c, by) {
        const d = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        for (const [dr, dc] of d) {
            let nr = r + dr, nc = c + dc;
            while (this.ib(nr, nc)) {
                const p = this.b[nr][nc];
                if (p) {
                    if (p.cl === by && (p.t === P.R || p.t === P.Q) && (dr === 0 || dc === 0)) return true;
                    if (p.cl === by && (p.t === P.B || p.t === P.Q) && dr !== 0 && dc !== 0) return true;
                    break;
                }
                nr += dr; nc += dc;
            }
        }
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
            const p = this.g(r + dr, c + dc);
            if (p?.cl === by && p.t === P.N) return true;
        }
        const pd = by === C.W ? 1 : -1;
        for (const dc of [-1, 1]) {
            const p = this.g(r + pd, c + dc);
            if (p?.cl === by && p.t === P.P) return true;
        }
        for (const [dr, dc] of d) {
            const p = this.g(r + dr, c + dc);
            if (p?.cl === by && p.t === P.K) return true;
        }
        return false;
    }

    ic(cl) {
        const k = this.fk(cl);
        return k ? this.att(k.r, k.c, cl === C.W ? C.B : C.W) : false;
    }

    gm(cl = this.turn) {
        const m = [];
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (this.b[r][c]?.cl === cl) this.pm(r, c, this.b[r][c], m);
        return m.filter(mv => {
            this.mm(mv, true);
            const ok = !this.ic(cl);
            this.um(mv, true);
            return ok;
        });
    }

    pm(r, c, p, m) {
        const a = (tr, tc, sp = null) => {
            if (this.ib(tr, tc) && (!this.b[tr][tc] || this.b[tr][tc].cl !== p.cl))
                m.push({ fr: r, fc: c, tr, tc, sp });
        };
        const s = (dirs) => {
            for (const [dr, dc] of dirs) {
                let nr = r + dr, nc = c + dc;
                while (this.ib(nr, nc)) {
                    const t = this.b[nr][nc];
                    if (t) { if (t.cl !== p.cl) m.push({ fr: r, fc: c, tr: nr, tc: nc }); break; }
                    m.push({ fr: r, fc: c, tr: nr, tc: nc });
                    nr += dr; nc += dc;
                }
            }
        };
        switch (p.t) {
            case P.P: {
                const d = p.cl === C.W ? -1 : 1;
                const st = p.cl === C.W ? 6 : 1;
                const pr = p.cl === C.W ? 0 : 7;
                if (this.ib(r + d, c) && !this.b[r + d][c]) {
                    if (r + d === pr) m.push({ fr: r, fc: c, tr: r + d, tc: c, sp: 'promo' });
                    else {
                        m.push({ fr: r, fc: c, tr: r + d, tc: c });
                        if (r === st && !this.b[r + d * 2][c])
                            m.push({ fr: r, fc: c, tr: r + d * 2, tc: c, sp: 'dbl' });
                    }
                }
                for (const dc of [-1, 1]) {
                    const tr = r + d, tc = c + dc;
                    if (this.ib(tr, tc)) {
                        const t = this.b[tr][tc];
                        if (t?.cl !== p.cl) m.push({ fr: r, fc: c, tr, tc, sp: tr === pr ? 'promo' : null });
                        if (this.ep?.r === tr && this.ep?.c === tc)
                            m.push({ fr: r, fc: c, tr, tc, sp: 'ep' });
                    }
                }
                break;
            }
            case P.N:
                for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) a(r + dr, c + dc);
                break;
            case P.B: s([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
            case P.R: s([[-1,0],[1,0],[0,-1],[0,1]]); break;
            case P.Q: s([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]); break;
            case P.K: {
                for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) a(r + dr, c + dc);
                const op = p.cl === C.W ? C.B : C.W;
                const rw = p.cl === C.W ? 7 : 0;
                if (r === rw && c === 4) {
                    if (this.cast[p.cl + 'K'] && !this.b[rw][5] && !this.b[rw][6] &&
                        this.b[rw][7]?.t === P.R && !this.ic(p.cl) && !this.att(rw, 5, op) && !this.att(rw, 6, op))
                        m.push({ fr: r, fc: c, tr: rw, tc: 6, sp: 'ks' });
                    if (this.cast[p.cl + 'Q'] && !this.b[rw][3] && !this.b[rw][2] && !this.b[rw][1] &&
                        this.b[rw][0]?.t === P.R && !this.ic(p.cl) && !this.att(rw, 3, op) && !this.att(rw, 2, op))
                        m.push({ fr: r, fc: c, tr: rw, tc: 2, sp: 'qs' });
                }
                break;
            }
        }
    }

    mm(m, test = false) {
        const pc = this.b[m.fr][m.fc];
        const cap = this.b[m.tr][m.tc];
        if (!test) this.hist.push({ m, pc, cap, cast: {...this.cast}, ep: this.ep });
        this.b[m.tr][m.tc] = pc;
        this.b[m.fr][m.fc] = null;
        if (m.sp === 'ep') this.b[m.fr][m.tc] = null;
        if (m.sp === 'ks') { this.b[m.tr][5] = this.b[m.tr][7]; this.b[m.tr][7] = null; }
        if (m.sp === 'qs') { this.b[m.tr][3] = this.b[m.tr][0]; this.b[m.tr][0] = null; }
        if (m.sp === 'promo') this.b[m.tr][m.tc] = { t: P.Q, cl: pc.cl };
        if (!test) {
            this.ep = m.sp === 'dbl' ? { r: (m.fr + m.tr) / 2, c: m.fc } : null;
            if (pc.t === P.K) this.cast[pc.cl + 'K'] = this.cast[pc.cl + 'Q'] = false;
            if (pc.t === P.R) {
                if (m.fr === 7 && m.fc === 0) this.cast.wQ = false;
                if (m.fr === 7 && m.fc === 7) this.cast.wK = false;
                if (m.fr === 0 && m.fc === 0) this.cast.bQ = false;
                if (m.fr === 0 && m.fc === 7) this.cast.bK = false;
            }
            this.hm = (pc.t === P.P || cap) ? 0 : this.hm + 1;
            if (this.turn === C.B) this.fm++;
            this.turn = this.turn === C.W ? C.B : C.W;
        }
    }

    um(m, test = false) {
        const e = test ? null : this.hist.pop();
        const pc = test ? this.b[m.tr][m.tc] : e?.pc;
        const cap = test ? null : e?.cap;
        this.b[m.fr][m.fc] = pc;
        this.b[m.tr][m.tc] = cap;
        if (m.sp === 'ep') { this.b[m.fr][m.tc] = { t: P.P, cl: pc.cl === C.W ? C.B : C.W }; this.b[m.tr][m.tc] = null; }
        if (m.sp === 'ks') { this.b[m.tr][7] = this.b[m.tr][5]; this.b[m.tr][5] = null; }
        if (m.sp === 'qs') { this.b[m.tr][0] = this.b[m.tr][3]; this.b[m.tr][3] = null; }
        if (m.sp === 'promo') this.b[m.fr][m.fc] = { t: P.P, cl: pc.cl };
        if (!test && e) {
            this.cast = e.cast;
            this.ep = e.ep;
            this.turn = this.turn === C.W ? C.B : C.W;
            if (this.turn === C.B) this.fm--;
        }
    }

    isCM() { return this.ic(this.turn) && this.gm().length === 0; }
    isSM() { return !this.ic(this.turn) && this.gm().length === 0; }
    isIM() {
        const p = { w: [], b: [] };
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (this.b[r][c]) p[this.b[r][c].cl].push(this.b[r][c].t);
        if (p.w.length === 1 && p.b.length === 1) return true;
        const mo = (a) => a.length === 2 && a.every(t => t === P.K || t === P.B || t === P.N);
        return mo(p.w) || mo(p.b);
    }

    status() {
        if (this.isCM()) return this.turn === C.W ? 'Black wins!' : 'White wins!';
        if (this.isSM()) return 'Draw - Stalemate';
        if (this.isIM()) return 'Draw - Insufficient material';
        if (this.hm >= 100) return 'Draw - 50 move rule';
        if (this.ic(this.turn)) return `${this.turn === C.W ? 'White' : 'Black'} in check!`;
        return `${this.turn === C.W ? 'White' : 'Black'}'s turn`;
    }
}

export { P as PIECES, C as COLORS, U as UNICODE };
