// Chess AI - Minimax with Alpha-Beta Pruning

import { PIECES, COLORS } from './chess.js';

const PIECE_VALUES = {
    [PIECES.PAWN]: 100,
    [PIECES.KNIGHT]: 320,
    [PIECES.BISHOP]: 330,
    [PIECES.ROOK]: 500,
    [PIECES.QUEEN]: 900,
    [PIECES.KING]: 20000
};

const PAWN_TABLE = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_TABLE = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_TABLE = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_TABLE = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_TABLE = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_MIDDLE_TABLE = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
];

const KING_END_TABLE = [
    [-50,-40,-30,-20,-20,-30,-40,-50],
    [-30,-20,-10,  0,  0,-10,-20,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-30,  0,  0,  0,  0,-30,-30],
    [-50,-30,-30,-30,-30,-30,-30,-50]
];

const PIECE_TABLES = {
    [PIECES.PAWN]: PAWN_TABLE,
    [PIECES.KNIGHT]: KNIGHT_TABLE,
    [PIECES.BISHOP]: BISHOP_TABLE,
    [PIECES.ROOK]: ROOK_TABLE,
    [PIECES.QUEEN]: QUEEN_TABLE,
    [PIECES.KING]: KING_MIDDLE_TABLE
};

export class ChessAI {
    constructor(maxDepth = 4, timeLimit = 240) {
        this.maxDepth = maxDepth;
        this.timeLimit = timeLimit;
        this.nodesSearched = 0;
        this.transpositionTable = new Map();
    }

    evaluate(engine) {
        let score = 0;
        let whiteMaterial = 0;
        let blackMaterial = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = engine.board[row][col];
                if (piece) {
                    const materialValue = PIECE_VALUES[piece.type];
                    const table = PIECE_TABLES[piece.type];
                    const positionValue = table ? (piece.color === COLORS.WHITE ? table[row][col] : table[7 - row][col]) : 0;

                    if (piece.color === COLORS.WHITE) {
                        score += materialValue + positionValue;
                        whiteMaterial += materialValue;
                    } else {
                        score -= materialValue + positionValue;
                        blackMaterial += materialValue;
                    }
                }
            }
        }

        // Endgame bonus for king safety
        const isEndgame = whiteMaterial < 1500 || blackMaterial < 1500;
        if (isEndgame) {
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = engine.board[row][col];
                    if (piece && piece.type === PIECES.KING) {
                        const table = KING_END_TABLE;
                        const posVal = piece.color === COLORS.WHITE ? table[row][col] : table[7 - row][col];
                        score += piece.color === COLORS.WHITE ? posVal : -posVal;
                    }
                }
            }
        }

        return score;
    }

    orderMoves(engine, moves) {
        return moves.sort((a, b) => {
            let scoreA = 0, scoreB = 0;

            // Captures first
            const capturedA = engine.board[a.toRow][a.toCol];
            const capturedB = engine.board[b.toRow][b.toCol];
            if (capturedA) scoreA += PIECE_VALUES[capturedA.type];
            if (capturedB) scoreB += PIECE_VALUES[capturedB.type];

            // Promotions
            if (a.special === 'promotion') scoreA += PIECE_VALUES[PIECES.QUEEN];
            if (b.special === 'promotion') scoreB += PIECE_VALUES[PIECES.QUEEN];

            return scoreB - scoreA;
        });
    }

    minimax(engine, depth, alpha, beta, isMaximizing, startTime) {
        this.nodesSearched++;

        if (Date.now() - startTime > this.timeLimit) {
            return null;
        }

        if (depth === 0) {
            return this.evaluate(engine);
        }

        const moves = this.orderMoves(engine, engine.generateLegalMoves());

        if (moves.length === 0) {
            if (engine.isInCheck(engine.turn)) {
                return isMaximizing ? -100000 + (this.maxDepth - depth) : 100000 - (this.maxDepth - depth);
            }
            return 0;
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                engine.makeMove(move);
                const eval_ = this.minimax(engine, depth - 1, alpha, beta, false, startTime);
                engine.undoMove(move);

                if (eval_ === null) return null;
                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                engine.makeMove(move);
                const eval_ = this.minimax(engine, depth - 1, alpha, beta, true, startTime);
                engine.undoMove(move);

                if (eval_ === null) return null;
                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    findBestMove(engine) {
        const startTime = Date.now();
        this.nodesSearched = 0;
        let bestMove = null;
        let bestScore = Infinity;

        const moves = engine.generateLegalMoves(COLORS.BLACK);
        if (moves.length === 0) return null;

        // Iterative deepening
        for (let depth = 1; depth <= this.maxDepth; depth++) {
            let currentBest = null;
            let currentBestScore = Infinity;

            for (const move of moves) {
                engine.makeMove(move);
                const score = this.minimax(engine, depth - 1, -Infinity, Infinity, true, startTime);
                engine.undoMove(move);

                if (score === null) break;

                if (score < currentBestScore) {
                    currentBestScore = score;
                    currentBest = move;
                }
            }

            if (currentBest && Date.now() - startTime < this.timeLimit) {
                bestMove = currentBest;
                bestScore = currentBestScore;
            }

            if (Date.now() - startTime > this.timeLimit * 0.7) break;
        }

        console.log(`AI searched ${this.nodesSearched} nodes in ${Date.now() - startTime}ms`);
        return bestMove || moves[0];
    }
}
