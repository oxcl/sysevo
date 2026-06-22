// Chess AI with elegant minimax and alpha-beta pruning

import { PIECES, COLORS } from './chess.js';

const VALUES = { K: 20000, Q: 900, R: 500, B: 330, N: 320, P: 100 };

const TABLES = {
    P: [
        [0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
        [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
        [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]
    ],
    N: [
        [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],
        [-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
        [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
        [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    B: [
        [-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
        [-10,0,10,10,10,10,0,-10],[-10,5,5,10,10,5,5,-10],
        [-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],
        [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    R: [
        [0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],
        [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
        [-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]
    ],
    Q: [
        [-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
        [-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],
        [0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],
        [-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]
    ],
    K: [
        [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],
        [20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]
    ],
    KE: [
        [-50,-40,-30,-20,-20,-30,-40,-50],[-30,-20,-10,0,0,-10,-20,-30],
        [-30,-10,20,30,30,20,-10,-30],[-30,-10,30,40,40,30,-10,-30],
        [-30,-10,30,40,40,30,-10,-30],[-30,-10,20,30,30,20,-10,-30],
        [-30,-30,0,0,0,0,-30,-30],[-50,-30,-30,-30,-30,-30,-30,-50]
    ]
};

export class ChessAI {
    constructor(depth = 4, timeLimit = 240) {
        this.maxDepth = depth;
        this.timeLimit = timeLimit;
        this.nodes = 0;
        this.start = 0;
        this.timeout = false;
    }

    evaluate(engine) {
        let score = 0, wm = 0, bm = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = engine.board[r][c];
                if (p) {
                    const val = VALUES[p.type] + (TABLES[p.type]?.[p.color === COLORS.WHITE ? r : 7-r]?.[c] || 0);
                    if (p.color === COLORS.WHITE) { score += val; wm += VALUES[p.type]; }
                    else { score -= val; bm += VALUES[p.type]; }
                }
            }
        }
        if (wm < 1500 || bm < 1500) {
            for (let r = 0; r < 8; r++)
                for (let c = 0; c < 8; c++)
                    if (engine.board[r][c]?.type === PIECES.KING) {
                        const v = TABLES.KE[engine.board[r][c].color === COLORS.WHITE ? r : 7-r][c];
                        score += engine.board[r][c].color === COLORS.WHITE ? v : -v;
                    }
        }
        return score;
    }

    orderMoves(engine, moves) {
        return moves.sort((a, b) => {
            let sa = 0, sb = 0;
            if (engine.board[a.tr][a.tc]) sa += VALUES[engine.board[a.tr][a.tc].type];
            if (engine.board[b.tr][b.tc]) sb += VALUES[engine.board[b.tr][b.tc].type];
            if (a.sp === 'promo') sa += VALUES.Q;
            if (b.sp === 'promo') sb += VALUES.Q;
            return sb - sa;
        });
    }

    minimax(engine, depth, alpha, beta, max) {
        this.nodes++;
        if (this.timeout || Date.now() - this.start > this.timeLimit) { this.timeout = true; return null; }
        if (depth === 0) return this.evaluate(engine);
        
        const moves = this.orderMoves(engine, engine.genMoves());
        if (!moves.length) return engine.inCheck(engine.turn) ? (max ? -100000 + this.maxDepth - depth : 100000 - this.maxDepth + depth) : 0;
        
        if (max) {
            let best = -Infinity;
            for (const m of moves) {
                engine.makeMove(m);
                const v = this.minimax(engine, depth - 1, alpha, beta, false);
                engine.undoMove(m);
                if (v === null) return null;
                best = Math.max(best, v);
                alpha = Math.max(alpha, v);
                if (beta <= alpha) break;
            }
            return best;
        } else {
            let best = Infinity;
            for (const m of moves) {
                engine.makeMove(m);
                const v = this.minimax(engine, depth - 1, alpha, beta, true);
                engine.undoMove(m);
                if (v === null) return null;
                best = Math.min(best, v);
                beta = Math.min(beta, v);
                if (beta <= alpha) break;
            }
            return best;
        }
    }

    findBestMove(engine) {
        this.start = Date.now();
        this.nodes = 0;
        this.timeout = false;
        
        const moves = engine.genMoves(COLORS.BLACK);
        if (!moves.length) return null;
        
        let best = moves[0];
        for (let d = 1; d <= this.maxDepth; d++) {
            let cur = null, curScore = Infinity;
            for (const m of moves) {
                engine.makeMove(m);
                const s = this.minimax(engine, d - 1, -Infinity, Infinity, true);
                engine.undoMove(m);
                if (s === null) break;
                if (s < curScore) { curScore = s; cur = m; }
            }
            if (cur && !this.timeout) best = cur;
            if (this.timeout || Date.now() - this.start > this.timeLimit * 0.7) break;
        }
        return best;
    }
}
