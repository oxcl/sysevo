/**
 * Chess AI using Minimax with Alpha-Beta Pruning
 * Plays as Black
 */

// Piece values for evaluation
const PIECE_VALUES = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000
};

// Position tables for evaluation
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
    [-10,  0,  5, 10, 10,  5,  0,-10],
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

const KING_TABLE_MIDDLE = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
];

const KING_TABLE_END = [
    [-50,-40,-30,-20,-20,-30,-40,-50],
    [-30,-20,-10,  0,  0,-10,-20,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-30,  0,  0,  0,  0,-30,-30],
    [-50,-30,-30,-30,-30,-30,-30,-50]
];

// Flip for black
function flipTable(table) {
    return [...table].reverse();
}

const PST = {
    pawn: { white: PAWN_TABLE, black: flipTable(PAWN_TABLE) },
    knight: { white: KNIGHT_TABLE, black: flipTable(KNIGHT_TABLE) },
    bishop: { white: BISHOP_TABLE, black: flipTable(BISHOP_TABLE) },
    rook: { white: ROOK_TABLE, black: flipTable(ROOK_TABLE) },
    queen: { white: QUEEN_TABLE, black: flipTable(QUEEN_TABLE) },
    king: { white: KING_TABLE_MIDDLE, black: flipTable(KING_TABLE_MIDDLE) }
};

class ChessAI {
    constructor() {
        this.nodesSearched = 0;
        this.timeLimit = 250; // ms
        this.startTime = 0;
        this.bestMove = null;
        this.maxDepth = 3;
    }

    // Get the best move for the given position
    getBestMove(engine) {
        this.startTime = Date.now();
        this.nodesSearched = 0;
        this.bestMove = null;
        this.maxDepth = 4; // Try depth 4 first, maybe reduce if time is tight

        const color = engine.turn; // Should be BLACK for AI
        const legalMoves = engine.generateLegalMoves(color);

        if (legalMoves.length === 0) return null;
        if (legalMoves.length === 1) return legalMoves[0];

        // Iterative deepening
        let bestMove = legalMoves[0];
        let bestScore = -Infinity;

        try {
            // Try increasing depths
            const maxDepth = this.maxDepth;
            for (let depth = 1; depth <= maxDepth; depth++) {
                const result = this.minimax(engine, depth, -Infinity, Infinity, true, color);
                if (this.bestMove) {
                    bestMove = this.bestMove;
                    bestScore = result;
                }
                // Check if we're running out of time
                if (Date.now() - this.startTime > this.timeLimit * 0.7) {
                    break;
                }
            }
        } catch (e) {
            // Timeout, use previous best move
        }

        return bestMove;
    }

    // Minimax with alpha-beta pruning
    minimax(engine, depth, alpha, beta, isMaximizing, aiColor) {
        // Time check
        if (Date.now() - this.startTime > this.timeLimit) {
            throw new Error('timeout');
        }

        this.nodesSearched++;

        if (depth === 0) {
            return this.evaluate(engine, aiColor);
        }

        const color = isMaximizing ? aiColor : (aiColor === 'white' ? 'black' : 'white');
        const moves = engine.generateLegalMoves(color);

        // Sort moves for better pruning (captures first, then center control)
        moves.sort((a, b) => {
            const aCapture = engine.board[a.to.row][a.to.col] ? PIECE_VALUES[engine.board[a.to.row][a.to.col].type] : 0;
            const bCapture = engine.board[b.to.row][b.to.col] ? PIECE_VALUES[engine.board[b.to.row][b.to.col].type] : 0;
            return bCapture - aCapture;
        });

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                const copy = engine.clone();
                copy.makeMove(move);
                const eval = this.minimax(copy, depth - 1, alpha, beta, false, aiColor);
                if (eval > maxEval) {
                    maxEval = eval;
                    if (depth === this.maxDepth) {
                        this.bestMove = move;
                    }
                }
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const copy = engine.clone();
                copy.makeMove(move);
                const eval = this.minimax(copy, depth - 1, alpha, beta, true, aiColor);
                if (eval < minEval) {
                    minEval = eval;
                }
                beta = Math.min(beta, eval);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    // Evaluate the board position from the perspective of aiColor
    evaluate(engine, aiColor) {
        const enemy = aiColor === 'white' ? 'black' : 'white';
        let score = 0;

        // Material and position evaluation
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = engine.board[r][c];
                if (!piece) continue;

                let value = PIECE_VALUES[piece.type];
                
                // Position bonus
                const pst = PST[piece.type];
                if (pst) {
                    value += pst[piece.color][r][c];
                }

                if (piece.color === aiColor) {
                    score += value;
                } else {
                    score -= value;
                }
            }
        }

        // Mobility bonus (simplified: count legal moves)
        const aiMoves = engine.generateLegalMoves(aiColor);
        const enemyMoves = engine.generateLegalMoves(enemy);
        score += aiMoves.length * 2;
        score -= enemyMoves.length * 2;

        // King safety (simplified)
        const aiKing = engine.findKing(aiColor);
        const enemyKing = engine.findKing(enemy);
        if (aiKing) {
            // Penalize if king is in open file in middlegame
            const piecesCount = this.countMaterial(engine);
            if (piecesCount > 6) {
                // Middlegame: prefer king safety
                if (aiKing.col < 2 || aiKing.col > 5) score += 20; // castled
            }
        }

        // Check/checkmate bonuses
        if (engine.inCheck) {
            if (engine.turn === aiColor) {
                score -= 50; // We are in check
            } else {
                score += 50; // Opponent is in check
            }
        }

        return score;
    }

    countMaterial(engine) {
        let count = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (engine.board[r][c]) count++;
            }
        }
        return count;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChessAI };
}
