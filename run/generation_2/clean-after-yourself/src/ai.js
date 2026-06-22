/**
 * Chess AI Module
 * Minimax with Alpha-Beta Pruning and iterative deepening
 */

import { PIECE_TYPES, COLORS, BOARD_SIZE } from './chess.js';

const PIECE_VALUES = Object.freeze({
    [PIECE_TYPES.PAWN]: 100,
    [PIECE_TYPES.KNIGHT]: 320,
    [PIECE_TYPES.BISHOP]: 330,
    [PIECE_TYPES.ROOK]: 500,
    [PIECE_TYPES.QUEEN]: 900,
    [PIECE_TYPES.KING]: 20000
});

const POSITION_TABLES = Object.freeze({
    [PIECE_TYPES.PAWN]: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    [PIECE_TYPES.KNIGHT]: [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 0, 0, 0, -20, -40],
        [-30, 0, 10, 15, 15, 10, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 15, 20, 20, 15, 0, -30],
        [-30, 5, 10, 15, 15, 10, 5, -30],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50]
    ],
    [PIECE_TYPES.BISHOP]: [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 5, 5, 10, 10, 5, 5, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 10, 10, 10, 10, 10, 10, -10],
        [-10, 5, 0, 0, 0, 0, 5, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20]
    ],
    [PIECE_TYPES.ROOK]: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [5, 10, 10, 10, 10, 10, 10, 5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [0, 0, 0, 5, 5, 0, 0, 0]
    ],
    [PIECE_TYPES.QUEEN]: [
        [-20, -10, -10, -5, -5, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 5, 5, 5, 0, -10],
        [-5, 0, 5, 5, 5, 5, 0, -5],
        [0, 0, 5, 5, 5, 5, 0, -5],
        [-10, 5, 5, 5, 5, 5, 0, -10],
        [-10, 0, 5, 0, 0, 0, 0, -10],
        [-20, -10, -10, -5, -5, -10, -10, -20]
    ],
    [PIECE_TYPES.KING]: [
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [20, 30, 10, 0, 0, 10, 30, 20]
    ],
    KING_END: [
        [-50, -40, -30, -20, -20, -30, -40, -50],
        [-30, -20, -10, 0, 0, -10, -20, -30],
        [-30, -10, 20, 30, 30, 20, -10, -30],
        [-30, -10, 30, 40, 40, 30, -10, -30],
        [-30, -10, 30, 40, 40, 30, -10, -30],
        [-30, -10, 20, 30, 30, 20, -10, -30],
        [-30, -30, 0, 0, 0, 0, -30, -30],
        [-50, -30, -30, -30, -30, -30, -30, -50]
    ]
});

export class ChessAI {
    #maxDepth;
    #timeLimit;
    #nodesSearched;
    #startTime;
    #isTimeUp;

    constructor(maxDepth = 4, timeLimit = 240) {
        this.#maxDepth = maxDepth;
        this.#timeLimit = timeLimit;
        this.#nodesSearched = 0;
        this.#startTime = 0;
        this.#isTimeUp = false;
    }

    #evaluate(engine) {
        let score = 0;
        let whiteMaterial = 0;
        let blackMaterial = 0;

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = engine.board[row][col];
                if (piece) {
                    const value = this.#calculatePieceValue(piece, row, col, engine);
                    if (piece.color === COLORS.WHITE) {
                        score += value;
                        whiteMaterial += PIECE_VALUES[piece.type];
                    } else {
                        score -= value;
                        blackMaterial += PIECE_VALUES[piece.type];
                    }
                }
            }
        }

        return this.#applyEndgameBonus(score, whiteMaterial, blackMaterial);
    }

    #calculatePieceValue(piece, row, col, engine) {
        const materialValue = PIECE_VALUES[piece.type];
        const table = POSITION_TABLES[piece.type];
        const positionValue = table ? (piece.color === COLORS.WHITE ? table[row][col] : table[7 - row][col]) : 0;
        return materialValue + positionValue;
    }

    #applyEndgameBonus(score, whiteMaterial, blackMaterial) {
        const isEndgame = whiteMaterial < 1500 || blackMaterial < 1500;
        if (!isEndgame) return score;

        const table = POSITION_TABLES.KING_END;
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = engine.board[row][col];
                if (piece?.type === PIECE_TYPES.KING) {
                    const posVal = piece.color === COLORS.WHITE ? table[row][col] : table[7 - row][col];
                    score += piece.color === COLORS.WHITE ? posVal : -posVal;
                }
            }
        }
        return score;
    }

    #orderMoves(engine, moves) {
        return [...moves].sort((a, b) => {
            let scoreA = 0, scoreB = 0;

            const capturedA = engine.board[a.toRow][a.toCol];
            const capturedB = engine.board[b.toRow][b.toCol];
            if (capturedA) scoreA += PIECE_VALUES[capturedA.type];
            if (capturedB) scoreB += PIECE_VALUES[capturedB.type];

            if (a.special === 'promotion') scoreA += PIECE_VALUES[PIECE_TYPES.QUEEN];
            if (b.special === 'promotion') scoreB += PIECE_VALUES[PIECE_TYPES.QUEEN];

            return scoreB - scoreA;
        });
    }

    #minimax(engine, depth, alpha, beta, isMaximizing) {
        this.#nodesSearched++;

        if (this.#isTimeUp || Date.now() - this.#startTime > this.#timeLimit) {
            this.#isTimeUp = true;
            return null;
        }

        if (depth === 0) return this.#evaluate(engine);

        const moves = this.#orderMoves(engine, engine.generateLegalMoves());
        if (moves.length === 0) {
            return engine.isInCheck(engine.turn)
                ? (isMaximizing ? -100000 + (this.#maxDepth - depth) : 100000 - (this.#maxDepth - depth))
                : 0;
        }

        return isMaximizing
            ? this.#maximizeScore(engine, moves, depth, alpha, beta)
            : this.#minimizeScore(engine, moves, depth, alpha, beta);
    }

    #maximizeScore(engine, moves, depth, alpha, beta) {
        let maxEval = -Infinity;
        for (const move of moves) {
            engine.makeMove(move);
            const eval_ = this.#minimax(engine, depth - 1, alpha, beta, false);
            engine.undoMove(move);

            if (eval_ === null) return null;
            maxEval = Math.max(maxEval, eval_);
            alpha = Math.max(alpha, eval_);
            if (beta <= alpha) break;
        }
        return maxEval;
    }

    #minimizeScore(engine, moves, depth, alpha, beta) {
        let minEval = Infinity;
        for (const move of moves) {
            engine.makeMove(move);
            const eval_ = this.#minimax(engine, depth - 1, alpha, beta, true);
            engine.undoMove(move);

            if (eval_ === null) return null;
            minEval = Math.min(minEval, eval_);
            beta = Math.min(beta, eval_);
            if (beta <= alpha) break;
        }
        return minEval;
    }

    findBestMove(engine) {
        this.#startTime = Date.now();
        this.#nodesSearched = 0;
        this.#isTimeUp = false;

        const moves = engine.generateLegalMoves(COLORS.BLACK);
        if (moves.length === 0) return null;

        let bestMove = moves[0];

        for (let depth = 1; depth <= this.#maxDepth; depth++) {
            const result = this.#searchAtDepth(engine, moves, depth);
            if (result && !this.#isTimeUp) {
                bestMove = result;
            }
            if (this.#isTimeUp || Date.now() - this.#startTime > this.#timeLimit * 0.7) break;
        }

        console.log(`AI searched ${this.#nodesSearched} nodes in ${Date.now() - this.#startTime}ms`);
        return bestMove;
    }

    #searchAtDepth(engine, moves, depth) {
        let currentBest = null;
        let currentBestScore = Infinity;

        for (const move of moves) {
            engine.makeMove(move);
            const score = this.#minimax(engine, depth - 1, -Infinity, Infinity, true);
            engine.undoMove(move);

            if (score === null) break;
            if (score < currentBestScore) {
                currentBestScore = score;
                currentBest = move;
            }
        }

        return currentBest;
    }
}
