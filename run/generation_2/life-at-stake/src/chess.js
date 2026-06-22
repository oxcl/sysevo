// Chess Engine with comprehensive validation and error handling

const PIECES = { KING: 'K', QUEEN: 'Q', ROOK: 'R', BISHOP: 'B', KNIGHT: 'N', PAWN: 'P' };
const COLORS = { WHITE: 'w', BLACK: 'b' };
const UNICODE = { wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙', bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟' };
const BOARD_SIZE = 8;

export class ChessEngine {
    constructor() {
        this.board = this.initBoard();
        this.turn = COLORS.WHITE;
        this.history = [];
        this.castling = { wK: true, wQ: true, bK: true, bQ: true };
        this.enPassant = null;
        this.halfMove = 0;
        this.fullMove = 1;
        this.gameState = 'playing';
        this.lastError = null;
    }

    initBoard() {
        const b = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
        const back = [PIECES.ROOK, PIECES.KNIGHT, PIECES.BISHOP, PIECES.QUEEN, PIECES.KING, PIECES.BISHOP, PIECES.KNIGHT, PIECES.ROOK];
        for (let c = 0; c < BOARD_SIZE; c++) {
            b[0][c] = { type: back[c], color: COLORS.BLACK };
            b[1][c] = { type: PIECES.PAWN, color: COLORS.BLACK };
            b[6][c] = { type: PIECES.PAWN, color: COLORS.WHITE };
            b[7][c] = { type: back[c], color: COLORS.WHITE };
        }
        return b;
    }

    validatePosition(r, c) {
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
            this.lastError = `Invalid position: (${r}, ${c})`;
            return false;
        }
        return true;
    }

    validatePiece(r, c) {
        if (!this.validatePosition(r, c)) return null;
        return this.board[r][c];
    }

    validateMove(fromR, fromC, toR, toC) {
        if (!this.validatePosition(fromR, fromC) || !this.validatePosition(toR, toC)) return null;
        const piece = this.board[fromR][fromC];
        if (!piece) { this.lastError = 'No piece at source'; return null; }
        if (piece.color !== this.turn) { this.lastError = "Not your piece"; return null; }
        if (this.gameState !== 'playing') { this.lastError = 'Game is over'; return null; }
        return piece;
    }

    get(r, c) { return this.validatePosition(r, c) ? this.board[r][c] : null; }
    inBounds(r, c) { return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE; }

    findKing(color) {
        for (let r = 0; r < BOARD_SIZE; r++)
            for (let c = 0; c < BOARD_SIZE; c++)
                if (this.board[r][c]?.type === PIECES.KING && this.board[r][c]?.color === color)
                    return { row: r, col: c };
        return null;
    }

    attacked(r, c, by) {
        if (!this.validatePosition(r, c)) return false;
        
        const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (this.inBounds(nr, nc)) {
                const p = this.board[nr][nc];
                if (p) {
                    if (p.color === by) {
                        if ((p.type === PIECES.ROOK || p.type === PIECES.QUEEN) && (dr === 0 || dc === 0)) return true;
                        if ((p.type === PIECES.BISHOP || p.type === PIECES.QUEEN) && dr !== 0 && dc !== 0) return true;
                    }
                    break;
                }
                nr += dr; nc += dc;
            }
        }
        
        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of knightMoves) {
            const p = this.get(r + dr, c + dc);
            if (p?.color === by && p.type === PIECES.KNIGHT) return true;
        }
        
        const pd = by === COLORS.WHITE ? 1 : -1;
        for (const dc of [-1, 1]) {
            const p = this.get(r + pd, c + dc);
            if (p?.color === by && p.type === PIECES.PAWN) return true;
        }
        
        for (const [dr, dc] of dirs) {
            const p = this.get(r + dr, c + dc);
            if (p?.color === by && p.type === PIECES.KING) return true;
        }
        
        return false;
    }

    inCheck(color) {
        const k = this.findKing(color);
        if (!k) { this.lastError = `King not found for ${color}`; return false; }
        return this.attacked(k.row, k.col, color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE);
    }

    genMoves(color = this.turn) {
        const moves = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const p = this.board[r][c];
                if (p?.color === color) this.pieceMoves(r, c, p, moves);
            }
        }
        return moves.filter(m => {
            this.makeMove(m, true);
            const legal = !this.inCheck(color);
            this.undoMove(m, true);
            return legal;
        });
    }

    pieceMoves(r, c, p, moves) {
        const add = (tr, tc, sp = null) => {
            if (!this.inBounds(tr, tc)) return;
            const t = this.board[tr][tc];
            if (!t || t.color !== p.color) moves.push({ fr: r, fc: c, tr, tc, sp });
        };
        
        const slide = (dirs) => {
            for (const [dr, dc] of dirs) {
                let nr = r + dr, nc = c + dc;
                while (this.inBounds(nr, nc)) {
                    const t = this.board[nr][nc];
                    if (t) { if (t.color !== p.color) moves.push({ fr: r, fc: c, tr: nr, tc: nc }); break; }
                    moves.push({ fr: r, fc: c, tr: nr, tc: nc });
                    nr += dr; nc += dc;
                }
            }
        };

        switch (p.type) {
            case PIECES.PAWN: {
                const dir = p.color === COLORS.WHITE ? -1 : 1;
                const start = p.color === COLORS.WHITE ? 6 : 1;
                const promo = p.color === COLORS.WHITE ? 0 : 7;
                
                if (this.inBounds(r + dir, c) && !this.board[r + dir][c]) {
                    if (r + dir === promo) moves.push({ fr: r, fc: c, tr: r + dir, tc: c, sp: 'promo' });
                    else {
                        moves.push({ fr: r, fc: c, tr: r + dir, tc: c });
                        if (r === start && !this.board[r + dir * 2][c])
                            moves.push({ fr: r, fc: c, tr: r + dir * 2, tc: c, sp: 'double' });
                    }
                }
                for (const dc of [-1, 1]) {
                    const tr = r + dir, tc = c + dc;
                    if (this.inBounds(tr, tc)) {
                        const t = this.board[tr][tc];
                        if (t?.color !== p.color) {
                            moves.push({ fr: r, fc: c, tr, tc, sp: tr === promo ? 'promo' : null });
                        }
                        if (this.enPassant?.row === tr && this.enPassant?.col === tc)
                            moves.push({ fr: r, fc: c, tr, tc, sp: 'ep' });
                    }
                }
                break;
            }
            case PIECES.KNIGHT:
                for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(r + dr, c + dc);
                break;
            case PIECES.BISHOP: slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
            case PIECES.ROOK: slide([[-1,0],[1,0],[0,-1],[0,1]]); break;
            case PIECES.QUEEN: slide([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]); break;
            case PIECES.KING: {
                for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) add(r + dr, c + dc);
                const opp = p.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
                const row = p.color === COLORS.WHITE ? 7 : 0;
                if (r === row && c === 4) {
                    if (this.castling[p.color + 'K'] && !this.board[row][5] && !this.board[row][6] &&
                        this.board[row][7]?.type === PIECES.ROOK && !this.inCheck(p.color) &&
                        !this.attacked(row, 5, opp) && !this.attacked(row, 6, opp))
                        moves.push({ fr: r, fc: c, tr: row, tc: 6, sp: 'O-O' });
                    if (this.castling[p.color + 'Q'] && !this.board[row][3] && !this.board[row][2] && !this.board[row][1] &&
                        this.board[row][0]?.type === PIECES.ROOK && !this.inCheck(p.color) &&
                        !this.attacked(row, 3, opp) && !this.attacked(row, 2, opp))
                        moves.push({ fr: r, fc: c, tr: row, tc: 2, sp: 'O-O-O' });
                }
                break;
            }
        }
    }

    makeMove(m, test = false) {
        const piece = this.board[m.fr][m.fc];
        const captured = this.board[m.tr][m.tc];
        if (!test) this.history.push({ m, piece, captured, castling: {...this.castling}, ep: this.enPassant });
        
        this.board[m.tr][m.tc] = piece;
        this.board[m.fr][m.fc] = null;
        
        if (m.sp === 'ep') this.board[m.fr][m.tc] = null;
        if (m.sp === 'O-O') { this.board[m.tr][5] = this.board[m.tr][7]; this.board[m.tr][7] = null; }
        if (m.sp === 'O-O-O') { this.board[m.tr][3] = this.board[m.tr][0]; this.board[m.tr][0] = null; }
        if (m.sp === 'promo') this.board[m.tr][m.tc] = { type: PIECES.QUEEN, color: piece.color };
        
        if (!test) {
            this.enPassant = m.sp === 'double' ? { row: (m.fr + m.tr) / 2, col: m.fc } : null;
            if (piece.type === PIECES.KING) this.castling[piece.color + 'K'] = this.castling[piece.color + 'Q'] = false;
            if (piece.type === PIECES.ROOK) {
                if (m.fr === 7 && m.fc === 0) this.castling.wQ = false;
                if (m.fr === 7 && m.fc === 7) this.castling.wK = false;
                if (m.fr === 0 && m.fc === 0) this.castling.bQ = false;
                if (m.fr === 0 && m.fc === 7) this.castling.bK = false;
            }
            this.halfMove = (piece.type === PIECES.PAWN || captured) ? 0 : this.halfMove + 1;
            if (this.turn === COLORS.BLACK) this.fullMove++;
            this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        }
    }

    undoMove(m, test = false) {
        const entry = test ? null : this.history.pop();
        const piece = test ? this.board[m.tr][m.tc] : entry?.piece;
        const captured = test ? null : entry?.captured;
        
        this.board[m.fr][m.fc] = piece;
        this.board[m.tr][m.tc] = captured;
        
        if (m.sp === 'ep') { this.board[m.fr][m.tc] = { type: PIECES.PAWN, color: piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE }; this.board[m.tr][m.tc] = null; }
        if (m.sp === 'O-O') { this.board[m.tr][7] = this.board[m.tr][5]; this.board[m.tr][5] = null; }
        if (m.sp === 'O-O-O') { this.board[m.tr][0] = this.board[m.tr][3]; this.board[m.tr][3] = null; }
        if (m.sp === 'promo') this.board[m.fr][m.fc] = { type: PIECES.PAWN, color: piece.color };
        
        if (!test && entry) {
            this.castling = entry.castling;
            this.enPassant = entry.ep;
            this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
            if (this.turn === COLORS.BLACK) this.fullMove--;
        }
    }

    isCheckmate() { return this.inCheck(this.turn) && this.genMoves().length === 0; }
    isStalemate() { return !this.inCheck(this.turn) && this.genMoves().length === 0; }
    
    isInsufficientMaterial() {
        const p = { w: [], b: [] };
        for (let r = 0; r < BOARD_SIZE; r++)
            for (let c = 0; c < BOARD_SIZE; c++)
                if (this.board[r][c]) p[this.board[r][c].color].push(this.board[r][c].type);
        
        if (p.w.length === 1 && p.b.length === 1) return true;
        const minorOnly = (arr) => arr.length === 2 && arr.every(t => t === PIECES.KING || t === PIECES.BISHOP || t === PIECES.KNIGHT);
        return minorOnly(p.w) || minorOnly(p.b);
    }

    status() {
        if (this.isCheckmate()) { this.gameState = 'checkmate'; return this.turn === COLORS.WHITE ? 'Black wins by checkmate!' : 'White wins by checkmate!'; }
        if (this.isStalemate()) { this.gameState = 'stalemate'; return 'Draw by stalemate'; }
        if (this.isInsufficientMaterial()) { this.gameState = 'draw'; return 'Draw by insufficient material'; }
        if (this.halfMove >= 100) { this.gameState = 'draw'; return 'Draw by 50-move rule'; }
        if (this.inCheck(this.turn)) return `${this.turn === COLORS.WHITE ? 'White' : 'Black'} is in CHECK!`;
        return `${this.turn === COLORS.WHITE ? 'White' : 'Black'}'s turn`;
    }

    getLastError() { const e = this.lastError; this.lastError = null; return e; }
}

export { PIECES, COLORS, UNICODE };
