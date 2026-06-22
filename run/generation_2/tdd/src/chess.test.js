// Chess Engine Tests - TDD Edition

import { describe, it, expect, beforeEach } from 'vitest';
import { ChessEngine, PIECES, COLORS } from './chess.js';

describe('ChessEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new ChessEngine();
    });

    describe('Initialization', () => {
        it('should initialize with correct starting position', () => {
            expect(engine.board[0][0].type).toBe(PIECES.ROOK);
            expect(engine.board[0][0].color).toBe(COLORS.BLACK);
            expect(engine.board[7][4].type).toBe(PIECES.KING);
            expect(engine.board[7][4].color).toBe(COLORS.WHITE);
        });

        it('should start with white to move', () => {
            expect(engine.turn).toBe(COLORS.WHITE);
        });

        it('should have all pawns in starting position', () => {
            for (let c = 0; c < 8; c++) {
                expect(engine.board[1][c].type).toBe(PIECES.PAWN);
                expect(engine.board[1][c].color).toBe(COLORS.BLACK);
                expect(engine.board[6][c].type).toBe(PIECES.PAWN);
                expect(engine.board[6][c].color).toBe(COLORS.WHITE);
            }
        });
    });

    describe('Move Generation', () => {
        it('should generate correct number of opening moves', () => {
            const moves = engine.genMoves(COLORS.WHITE);
            expect(moves.length).toBe(20);
        });

        it('should generate pawn moves', () => {
            const moves = engine.genMoves(COLORS.WHITE);
            const pawnMoves = moves.filter(m => m.fr === 6);
            expect(pawnMoves.length).toBeGreaterThan(0);
        });

        it('should generate knight moves', () => {
            const moves = engine.genMoves(COLORS.WHITE);
            const knightMoves = moves.filter(m => engine.board[m.fr][m.fc]?.type === PIECES.KNIGHT);
            expect(knightMoves.length).toBe(4);
        });

        it('should not generate moves for opponent pieces', () => {
            const moves = engine.genMoves(COLORS.WHITE);
            const blackMoves = moves.filter(m => engine.board[m.fr][m.fc]?.color === COLORS.BLACK);
            expect(blackMoves.length).toBe(0);
        });
    });

    describe('Move Execution', () => {
        it('should execute a basic move', () => {
            const move = { fr: 6, fc: 4, tr: 4, tc: 4 };
            engine.makeMove(move);
            expect(engine.board[4][4]).toBeTruthy();
            expect(engine.board[4][4].type).toBe(PIECES.PAWN);
            expect(engine.board[6][4]).toBeNull();
        });

        it('should switch turns after move', () => {
            const move = { fr: 6, fc: 4, tr: 4, tc: 4 };
            engine.makeMove(move);
            expect(engine.turn).toBe(COLORS.BLACK);
        });

        it('should handle captures', () => {
            engine.board[3][3] = { type: PIECES.PAWN, color: COLORS.BLACK };
            const move = { fr: 4, fc: 4, tr: 3, tc: 3 };
            engine.makeMove(move);
            expect(engine.board[3][3].color).toBe(COLORS.WHITE);
        });
    });

    describe('Special Moves', () => {
        it('should handle en passant', () => {
            engine.board[3][3] = { type: PIECES.PAWN, color: COLORS.WHITE };
            engine.board[3][4] = { type: PIECES.PAWN, color: COLORS.BLACK };
            engine.enPassant = { row: 2, col: 4 };
            const move = { fr: 3, fc: 3, tr: 2, tc: 4, sp: 'ep' };
            engine.makeMove(move);
            expect(engine.board[3][4]).toBeNull();
            expect(engine.board[2][4].type).toBe(PIECES.PAWN);
        });

        it('should handle castling', () => {
            engine.board[7][5] = null;
            engine.board[7][6] = null;
            engine.castling.wK = true;
            const move = { fr: 7, fc: 4, tr: 7, tc: 6, sp: 'O-O' };
            engine.makeMove(move);
            expect(engine.board[7][6].type).toBe(PIECES.KING);
            expect(engine.board[7][5].type).toBe(PIECES.ROOK);
        });

        it('should handle pawn promotion', () => {
            engine.board[1][0] = { type: PIECES.PAWN, color: COLORS.WHITE };
            const move = { fr: 1, fc: 0, tr: 0, tc: 0, sp: 'promo' };
            engine.makeMove(move);
            expect(engine.board[0][0].type).toBe(PIECES.QUEEN);
        });
    });

    describe('Check and Checkmate', () => {
        it('should detect check', () => {
            engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
            engine.board[7][4] = { type: PIECES.KING, color: COLORS.WHITE };
            engine.board[0][4] = { type: PIECES.KING, color: COLORS.BLACK };
            engine.board[5][4] = { type: PIECES.QUEEN, color: COLORS.BLACK };
            expect(engine.inCheck(COLORS.WHITE)).toBe(true);
        });

        it('should detect checkmate', () => {
            engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
            engine.board[0][0] = { type: PIECES.KING, color: COLORS.BLACK };
            engine.board[7][7] = { type: PIECES.KING, color: COLORS.WHITE };
            engine.board[6][6] = { type: PIECES.QUEEN, color: COLORS.WHITE };
            engine.board[6][7] = { type: PIECES.ROOK, color: COLORS.WHITE };
            engine.turn = COLORS.BLACK;
            expect(engine.isCheckmate()).toBe(true);
        });

        it('should detect stalemate', () => {
            engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
            engine.board[0][0] = { type: PIECES.KING, color: COLORS.BLACK };
            engine.board[1][2] = { type: PIECES.QUEEN, color: COLORS.WHITE };
            engine.board[7][7] = { type: PIECES.KING, color: COLORS.WHITE };
            engine.turn = COLORS.BLACK;
            expect(engine.isStalemate()).toBe(true);
        });
    });

    describe('Undo Move', () => {
        it('should undo a move correctly', () => {
            const move = { fr: 6, fc: 4, tr: 4, tc: 4 };
            engine.makeMove(move);
            engine.undoMove(move);
            expect(engine.board[6][4].type).toBe(PIECES.PAWN);
            expect(engine.board[4][4]).toBeNull();
            expect(engine.turn).toBe(COLORS.WHITE);
        });

        it('should undo a capture correctly', () => {
            engine.board[3][3] = { type: PIECES.PAWN, color: COLORS.BLACK };
            const move = { fr: 4, fc: 4, tr: 3, tc: 3 };
            engine.makeMove(move);
            engine.undoMove(move);
            expect(engine.board[3][3].color).toBe(COLORS.BLACK);
            expect(engine.board[4][4].color).toBe(COLORS.WHITE);
        });
    });

    describe('Insufficient Material', () => {
        it('should detect king vs king', () => {
            engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
            engine.board[0][0] = { type: PIECES.KING, color: COLORS.BLACK };
            engine.board[7][7] = { type: PIECES.KING, color: COLORS.WHITE };
            expect(engine.isInsufficientMaterial()).toBe(true);
        });

        it('should detect king + bishop vs king', () => {
            engine.board = Array(8).fill(null).map(() => Array(8).fill(null));
            engine.board[0][0] = { type: PIECES.KING, color: COLORS.BLACK };
            engine.board[7][7] = { type: PIECES.KING, color: COLORS.WHITE };
            engine.board[7][6] = { type: PIECES.BISHOP, color: COLORS.WHITE };
            expect(engine.isInsufficientMaterial()).toBe(true);
        });
    });
});
