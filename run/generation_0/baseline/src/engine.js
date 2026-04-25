/**
 * Chess Engine - Full implementation of chess rules
 * Handles board state, move generation, validation, check/checkmate/stalemate
 */

// Piece types
const PAWN = 'pawn', KNIGHT = 'knight', BISHOP = 'bishop', ROOK = 'rook', QUEEN = 'queen', KING = 'king';
const WHITE = 'white', BLACK = 'black';

// Unicode pieces
const PIECE_SYMBOLS = {
    [WHITE]: { [KING]: '♔', [QUEEN]: '♕', [ROOK]: '♖', [BISHOP]: '♗', [KNIGHT]: '♘', [PAWN]: '♙' },
    [BLACK]: { [KING]: '♚', [QUEEN]: '♛', [ROOK]: '♜', [BISHOP]: '♝', [KNIGHT]: '♞', [PAWN]: '♟' }
};

function createPiece(type, color) {
    return { type, color, symbol: PIECE_SYMBOLS[color][type] };
}

function isWhite(piece) { return piece && piece.color === WHITE; }
function isBlack(piece) { return piece && piece.color === BLACK; }
function sameColor(p1, p2) { return p1 && p2 && p1.color === p2.color; }

class ChessEngine {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = this.createInitialBoard();
        this.turn = WHITE;
        this.moveHistory = [];
        this.enPassantTarget = null; // { row, col } or null
        this.castlingRights = {
            [WHITE]: { kingSide: true, queenSide: true },
            [BLACK]: { kingSide: true, queenSide: true }
        };
        this.gameOver = false;
        this.gameResult = null; // 'white', 'black', 'draw'
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.lastMove = null;
        this.inCheck = false;
        this.inDoubleCheck = false;
        this.pins = [];
        this.checks = [];
    }

    createInitialBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        const backRow = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
        for (let c = 0; c < 8; c++) {
            board[0][c] = createPiece(backRow[c], BLACK);
            board[1][c] = createPiece(PAWN, BLACK);
            board[6][c] = createPiece(PAWN, WHITE);
            board[7][c] = createPiece(backRow[c], WHITE);
        }
        return board;
    }

    // Deep clone
    clone() {
        const copy = new ChessEngine();
        copy.board = this.board.map(row => row.map(p => p ? { ...p } : null));
        copy.turn = this.turn;
        copy.moveHistory = this.moveHistory.map(m => ({ ...m }));
        copy.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
        copy.castlingRights = {
            [WHITE]: { ...this.castlingRights[WHITE] },
            [BLACK]: { ...this.castlingRights[BLACK] }
        };
        copy.gameOver = this.gameOver;
        copy.gameResult = this.gameResult;
        copy.halfMoveClock = this.halfMoveClock;
        copy.fullMoveNumber = this.fullMoveNumber;
        copy.lastMove = this.lastMove ? { ...this.lastMove } : null;
        copy.inCheck = this.inCheck;
        copy.inDoubleCheck = this.inDoubleCheck;
        copy.pins = this.pins ? [...this.pins] : [];
        copy.checks = this.checks ? [...this.checks] : [];
        return copy;
    }

    // Get king position for a color
    findKing(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p && p.type === KING && p.color === color) return { row: r, col: c };
            }
        }
        return null;
    }

    // Is a square attacked by the given color?
    isAttacked(row, col, byColor) {
        // Check all enemy pieces if they can attack this square
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (!p || p.color !== byColor) continue;
                // For each piece type, check if it can move to (row, col)
                // without considering self-check (this is the attack detection)
                if (this.canPieceAttack(r, c, row, col)) return true;
            }
        }
        return false;
    }

    // Check if piece at (fromRow, fromCol) can attack (toRow, toCol)
    // This ignores self-check, just movement capability
    canPieceAttack(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        if (!piece) return false;
        const dr = toRow - fromRow;
        const dc = toCol - fromCol;
        const absDr = Math.abs(dr);
        const absDc = Math.abs(dc);

        switch (piece.type) {
            case PAWN: {
                const dir = piece.color === WHITE ? -1 : 1;
                // Attack diagonally one square
                if (dr === dir && absDc === 1) return true;
                return false;
            }
            case KNIGHT: {
                if ((absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2)) return true;
                return false;
            }
            case BISHOP: {
                if (absDr !== absDc || dr === 0) return false;
                return this.isRayClear(fromRow, fromCol, dr > 0 ? 1 : -1, dc > 0 ? 1 : -1, absDr);
            }
            case ROOK: {
                if (dr !== 0 && dc !== 0) return false;
                if (dr === 0) return this.isRayClear(fromRow, fromCol, 0, dc > 0 ? 1 : -1, absDc);
                return this.isRayClear(fromRow, fromCol, dr > 0 ? 1 : -1, 0, absDr);
            }
            case QUEEN: {
                if (dr === 0 || dc === 0) {
                    // Rook-like
                    if (dr === 0) return this.isRayClear(fromRow, fromCol, 0, dc > 0 ? 1 : -1, absDc);
                    return this.isRayClear(fromRow, fromCol, dr > 0 ? 1 : -1, 0, absDr);
                } else if (absDr === absDc) {
                    return this.isRayClear(fromRow, fromCol, dr > 0 ? 1 : -1, dc > 0 ? 1 : -1, absDr);
                }
                return false;
            }
            case KING: {
                if (absDr <= 1 && absDc <= 1) return true;
                return false;
            }
            default:
                return false;
        }
    }

    // Check if ray between (r,c) and (r+dr*steps, c+dc*steps) is clear (excluding target)
    isRayClear(fromRow, fromCol, dr, dc, steps) {
        for (let i = 1; i < steps; i++) {
            const r = fromRow + dr * i;
            const c = fromCol + dc * i;
            if (this.board[r][c]) return false;
        }
        return true;
    }

    // Generate all pseudo-legal moves for a color (moves that follow piece movement rules)
    generatePseudoMoves(color) {
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (!p || p.color !== color) continue;
                this.generatePieceMoves(r, c, moves);
            }
        }
        return moves;
    }

    // Generate moves for a specific piece
    generatePieceMoves(fromRow, fromCol, moves) {
        const piece = this.board[fromRow][fromCol];
        if (!piece) return;

        const color = piece.color;

        switch (piece.type) {
            case PAWN: this.generatePawnMoves(fromRow, fromCol, color, moves); break;
            case KNIGHT: this.generateKnightMoves(fromRow, fromCol, color, moves); break;
            case BISHOP: this.generateSlidingMoves(fromRow, fromCol, color, moves, [[1,1],[1,-1],[-1,1],[-1,-1]]); break;
            case ROOK: this.generateSlidingMoves(fromRow, fromCol, color, moves, [[1,0],[-1,0],[0,1],[0,-1]]); break;
            case QUEEN: this.generateSlidingMoves(fromRow, fromCol, color, moves, [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]); break;
            case KING: this.generateKingMoves(fromRow, fromCol, color, moves); break;
        }
    }

    generatePawnMoves(fromRow, fromCol, color, moves) {
        const dir = color === WHITE ? -1 : 1;
        const startRow = color === WHITE ? 6 : 1;
        const enemy = color === WHITE ? BLACK : WHITE;

        // Forward one
        const r1 = fromRow + dir;
        if (r1 >= 0 && r1 < 8 && !this.board[r1][fromCol]) {
            moves.push({ from: { row: fromRow, col: fromCol }, to: { row: r1, col: fromCol } });
            // Forward two from start
            if (fromRow === startRow) {
                const r2 = fromRow + 2 * dir;
                if (!this.board[r2][fromCol]) {
                    moves.push({ from: { row: fromRow, col: fromCol }, to: { row: r2, col: fromCol } });
                }
            }
        }

        // Captures
        for (const dc of [-1, 1]) {
            const c = fromCol + dc;
            if (c < 0 || c >= 8) continue;
            const r = fromRow + dir;
            if (r < 0 || r >= 8) continue;
            const target = this.board[r][c];
            if (target && target.color === enemy) {
                moves.push({ from: { row: fromRow, col: fromCol }, to: { row: r, col: c } });
            }
            // En passant
            if (this.enPassantTarget && this.enPassantTarget.row === r && this.enPassantTarget.col === c) {
                moves.push({ from: { row: fromRow, col: fromCol }, to: { row: r, col: c }, enPassant: true });
            }
        }
    }

    generateKnightMoves(fromRow, fromCol, color, moves) {
        const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of knightOffsets) {
            const r = fromRow + dr;
            const c = fromCol + dc;
            if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
            const target = this.board[r][c];
            if (!target || target.color !== color) {
                moves.push({ from: { row: fromRow, col: fromCol }, to: { row: r, col: c } });
            }
        }
    }

    generateSlidingMoves(fromRow, fromCol, color, moves, directions) {
        for (const [dr, dc] of directions) {
            let r = fromRow + dr;
            let c = fromCol + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = this.board[r][c];
                if (!target) {
                    moves.push({ from: { row: fromRow, col: fromCol }, to: { row: r, col: c } });
                } else {
                    if (target.color !== color) {
                        moves.push({ from: { row: fromRow, col: fromCol }, to: { row: r, col: c } });
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }
    }

    generateKingMoves(fromRow, fromCol, color, moves) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = fromRow + dr;
                const c = fromCol + dc;
                if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
                const target = this.board[r][c];
                if (!target || target.color !== color) {
                    moves.push({ from: { row: fromRow, col: fromCol }, to: { row: r, col: c } });
                }
            }
        }

        // Castling
        const enemy = color === WHITE ? BLACK : WHITE;
        const row = color === WHITE ? 7 : 0;
        if (fromRow === row && fromCol === 4) {
            // King-side
            if (this.castlingRights[color].kingSide) {
                const rook = this.board[row][7];
                if (rook && rook.type === ROOK && rook.color === color) {
                    // Check squares between king and rook are empty
                    if (!this.board[row][5] && !this.board[row][6]) {
                        // Check king doesn't move through check
                        if (!this.isAttacked(row, 4, enemy) &&
                            !this.isAttacked(row, 5, enemy) &&
                            !this.isAttacked(row, 6, enemy)) {
                            moves.push({ from: { row, col: 4 }, to: { row, col: 6 }, castling: 'kingSide' });
                        }
                    }
                }
            }
            // Queen-side
            if (this.castlingRights[color].queenSide) {
                const rook = this.board[row][0];
                if (rook && rook.type === ROOK && rook.color === color) {
                    if (!this.board[row][1] && !this.board[row][2] && !this.board[row][3]) {
                        if (!this.isAttacked(row, 4, enemy) &&
                            !this.isAttacked(row, 3, enemy) &&
                            !this.isAttacked(row, 2, enemy)) {
                            moves.push({ from: { row, col: 4 }, to: { row, col: 2 }, castling: 'queenSide' });
                        }
                    }
                }
            }
        }
    }

    // Make a move (assumes legal), returns the move with result info
    makeMove(move) {
        const { from, to, promotion } = move;
        const piece = this.board[from.row][from.col];
        const captured = this.board[to.row][to.col];
        
        // Store state for undo
        const state = {
            from: { ...from },
            to: { ...to },
            piece: { ...piece },
            captured: captured ? { ...captured } : null,
            enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
            castlingRights: {
                [WHITE]: { ...this.castlingRights[WHITE] },
                [BLACK]: { ...this.castlingRights[BLACK] }
            },
            halfMoveClock: this.halfMoveClock,
            enPassantCapture: null,
            rookFrom: null,
            rookTo: null
        };

        // Handle en passant capture
        if (move.enPassant) {
            state.enPassantCapture = { row: from.row, col: to.col };
            this.board[from.row][to.col] = null; // Remove the captured pawn
        }

        // Handle castling - move the rook
        if (move.castling) {
            const row = from.row;
            if (move.castling === 'kingSide') {
                state.rookFrom = { row, col: 7 };
                state.rookTo = { row, col: 5 };
                this.board[row][5] = this.board[row][7];
                this.board[row][7] = null;
            } else {
                state.rookFrom = { row, col: 0 };
                state.rookTo = { row, col: 3 };
                this.board[row][3] = this.board[row][0];
                this.board[row][0] = null;
            }
        }

        // Move the piece
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;

        // Handle pawn promotion
        if (move.promotion) {
            this.board[to.row][to.col] = createPiece(move.promotion, piece.color);
        }

        // Handle en passant target for next move
        this.enPassantTarget = null;
        if (piece.type === PAWN && Math.abs(to.row - from.row) === 2) {
            this.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
        }

        // Update castling rights
        if (piece.type === KING) {
            this.castlingRights[piece.color].kingSide = false;
            this.castlingRights[piece.color].queenSide = false;
        }
        if (piece.type === ROOK) {
            if (from.col === 0) this.castlingRights[piece.color].queenSide = false;
            if (from.col === 7) this.castlingRights[piece.color].kingSide = false;
        }
        // If a rook is captured
        if (captured && captured.type === ROOK) {
            if (to.col === 0) this.castlingRights[captured.color].queenSide = false;
            if (to.col === 7) this.castlingRights[captured.color].kingSide = false;
        }

        // Update move history
        const moveRecord = {
            from: { ...from },
            to: { ...to },
            piece: piece.type,
            color: piece.color,
            captured: captured ? captured.type : null,
            promotion: move.promotion || null,
            castling: move.castling || null,
            enPassant: move.enPassant || false,
            san: '' // Will generate later
        };
        this.moveHistory.push(moveRecord);
        this.lastMove = moveRecord;

        // Half-move clock
        if (piece.type === PAWN || captured) {
            this.halfMoveClock = 0;
        } else {
            this.halfMoveClock++;
        }

        // Switch turn
        this.turn = this.turn === WHITE ? BLACK : WHITE;
        if (this.turn === WHITE) this.fullMoveNumber++;

        // Update check and game state
        this.updateGameState();

        return { move, state, captured, ...this.getGameResult() };
    }

    // Update check/checkmate/stalemate state
    updateGameState() {
        const color = this.turn;
        const enemy = color === WHITE ? BLACK : WHITE;
        
        // Find king
        const kingPos = this.findKing(color);
        this.inCheck = kingPos ? this.isAttacked(kingPos.row, kingPos.col, enemy) : false;

        // Generate legal moves
        const legalMoves = this.generateLegalMoves(color);
        
        if (legalMoves.length === 0) {
            this.gameOver = true;
            if (this.inCheck) {
                // Checkmate
                this.gameResult = { winner: enemy, reason: 'checkmate' };
            } else {
                // Stalemate
                this.gameOver = true;
                this.gameResult = { winner: null, reason: 'stalemate' };
            }
        } else if (this.isInsufficientMaterial()) {
            this.gameOver = true;
            this.gameResult = { winner: null, reason: 'insufficient material' };
        } else {
            this.gameOver = false;
            this.gameResult = null;
        }
    }

    // Generate all legal moves for a color (respects check)
    generateLegalMoves(color) {
        const pseudoMoves = this.generatePseudoMoves(color);
        const legalMoves = [];

        for (const move of pseudoMoves) {
            // Make the move on a copy to check if it leaves king in check
            const copy = this.clone();
            copy.makeMoveInternal(move);
            const kingPos = copy.findKing(color);
            const enemy = color === WHITE ? BLACK : WHITE;
            if (kingPos && !copy.isAttacked(kingPos.row, kingPos.col, enemy)) {
                // For pawns reaching promotion rank, generate promotion moves
                const piece = this.board[move.from.row][move.from.col];
                if (piece && piece.type === PAWN) {
                    const promotionRow = color === WHITE ? 0 : 7;
                    if (move.to.row === promotionRow) {
                        for (const promo of [QUEEN, ROOK, BISHOP, KNIGHT]) {
                            legalMoves.push({ ...move, promotion: promo });
                        }
                    } else {
                        legalMoves.push(move);
                    }
                } else {
                    legalMoves.push(move);
                }
            }
        }
        return legalMoves;
    }

    // Internal move (no validation, no state tracking)
    makeMoveInternal(move) {
        const { from, to, promotion, enPassant } = move;
        const piece = this.board[from.row][from.col];
        
        if (enPassant) {
            this.board[from.row][to.col] = null;
        }

        // Castling - also move rook
        if (move.castling) {
            const row = from.row;
            if (move.castling === 'kingSide') {
                this.board[row][5] = this.board[row][7];
                this.board[row][7] = null;
            } else {
                this.board[row][3] = this.board[row][0];
                this.board[row][0] = null;
            }
        }

        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;

        if (promotion) {
            this.board[to.row][to.col] = createPiece(promotion, piece.color);
        }

        // Update en passant target
        if (piece && piece.type === PAWN && Math.abs(to.row - from.row) === 2) {
            this.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
        } else {
            this.enPassantTarget = null;
        }

        // Update castling rights (simplified for internal use)
        if (piece && piece.type === KING) {
            this.castlingRights[piece.color].kingSide = false;
            this.castlingRights[piece.color].queenSide = false;
        }
        if (piece && piece.type === ROOK) {
            if (from.col === 0) this.castlingRights[piece.color].queenSide = false;
            if (from.col === 7) this.castlingRights[piece.color].kingSide = false;
        }
    }

    // Check for insufficient material (draw)
    isInsufficientMaterial() {
        const pieces = { white: [], black: [] };
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p) pieces[p.color].push(p);
            }
        }

        const w = pieces[WHITE];
        const b = pieces[BLACK];

        // Both sides: just kings
        if (w.length === 1 && b.length === 1) return true;

        // King vs king + bishop/knight
        const isMinor = (p) => p.type === BISHOP || p.type === KNIGHT;

        if (w.length === 1 && b.length === 2 && b.some(isMinor)) return true;
        if (b.length === 1 && w.length === 2 && w.some(isMinor)) return true;

        // Both sides have only bishops of same color
        if (w.every(p => p.type === KING || p.type === BISHOP) &&
            b.every(p => p.type === KING || p.type === BISHOP)) {
            const wBishops = w.filter(p => p.type === BISHOP);
            const bBishops = b.filter(p => p.type === BISHOP);
            if (wBishops.length <= 1 && bBishops.length <= 1) return true;
        }

        return false;
    }

    getGameResult() {
        if (this.gameOver) {
            return { gameOver: true, result: this.gameResult };
        }
        return { gameOver: false, result: null };
    }

    // Get algebraic notation for a move
    getMoveSAN(move) {
        const piece = this.board[move.from.row][move.from.col] || { type: PAWN, color: this.turn === WHITE ? BLACK : WHITE };
        const isCapture = this.board[move.to.row][move.to.col] !== null || move.enPassant;
        const color = piece.color;

        let notation = '';
        
        if (move.castling === 'kingSide') notation = 'O-O';
        else if (move.castling === 'queenSide') notation = 'O-O-O';
        else {
            const pieceChar = piece.type === PAWN ? '' : 
                piece.type === KNIGHT ? 'N' :
                piece.type === BISHOP ? 'B' :
                piece.type === ROOK ? 'R' :
                piece.type === QUEEN ? 'Q' : '';

            // Disambiguation (simplified)
            notation = pieceChar;

            if (isCapture) {
                if (piece.type === PAWN) notation += String.fromCharCode(97 + move.from.col);
                notation += 'x';
            }

            notation += String.fromCharCode(97 + move.to.col) + (8 - move.to.row);

            if (move.promotion) {
                notation += '=' + (move.promotion === KNIGHT ? 'N' :
                    move.promotion === BISHOP ? 'B' :
                    move.promotion === ROOK ? 'R' : 'Q');
            }
        }

        // Check/checkmate symbols
        const copy = this.clone();
        copy.makeMove(move);
        if (copy.gameOver && copy.gameResult && copy.gameResult.winner) {
            notation += '#';
        } else if (copy.inCheck) {
            notation += '+';
        }

        return notation;
    }
}

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChessEngine, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, WHITE, BLACK, PIECE_SYMBOLS, createPiece };
}
