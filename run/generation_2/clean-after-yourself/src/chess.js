/**
 * Chess Engine Module
 * Handles board representation, move generation, and game rules
 */

const PIECE_TYPES = Object.freeze({
    KING: 'K',
    QUEEN: 'Q',
    ROOK: 'R',
    BISHOP: 'B',
    KNIGHT: 'N',
    PAWN: 'P'
});

const COLORS = Object.freeze({
    WHITE: 'w',
    BLACK: 'b'
});

const UNICODE_PIECES = Object.freeze({
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
});

const BOARD_SIZE = 8;

const DIRECTIONS = Object.freeze({
    STRAIGHT: [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 }
    ],
    DIAGONAL: [
        { dr: -1, dc: -1 },
        { dr: -1, dc: 1 },
        { dr: 1, dc: -1 },
        { dr: 1, dc: 1 }
    ],
    ALL: [
        { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
    ]
});

const KNIGHT_MOVES = Object.freeze([
    { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
    { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
    { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
    { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
]);

export class ChessEngine {
    #board;
    #turn;
    #moveHistory;
    #castlingRights;
    #enPassantSquare;
    #halfMoveClock;
    #fullMoveNumber;

    constructor() {
        this.#board = this.#createInitialBoard();
        this.#turn = COLORS.WHITE;
        this.#moveHistory = [];
        this.#castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
        this.#enPassantSquare = null;
        this.#halfMoveClock = 0;
        this.#fullMoveNumber = 1;
    }

    #createInitialBoard() {
        const board = Array(BOARD_SIZE).fill(null)
            .map(() => Array(BOARD_SIZE).fill(null));

        this.#placePiecesInRow(board, 0, COLORS.BLACK);
        this.#placePawnsInRow(board, 1, COLORS.BLACK);
        this.#placePawnsInRow(board, 6, COLORS.WHITE);
        this.#placePiecesInRow(board, 7, COLORS.WHITE);

        return board;
    }

    #placePiecesInRow(board, row, color) {
        const backRank = [
            PIECE_TYPES.ROOK, PIECE_TYPES.KNIGHT, PIECE_TYPES.BISHOP, PIECE_TYPES.QUEEN,
            PIECE_TYPES.KING, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT, PIECE_TYPES.ROOK
        ];
        backRank.forEach((type, col) => {
            board[row][col] = { type, color };
        });
    }

    #placePawnsInRow(board, row, color) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            board[row][col] = { type: PIECE_TYPES.PAWN, color };
        }
    }

    #isInBounds(row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }

    getPiece(row, col) {
        return this.#isInBounds(row, col) ? this.#board[row][col] : null;
    }

    #findKing(color) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = this.#board[row][col];
                if (piece?.type === PIECE_TYPES.KING && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    #isSquareAttacked(row, col, byColor) {
        return this.#hasSlidingAttackers(row, col, byColor) ||
               this.#hasKnightAttackers(row, col, byColor) ||
               this.#hasPawnAttackers(row, col, byColor) ||
               this.#hasKingAttackers(row, col, byColor);
    }

    #hasSlidingAttackers(row, col, byColor) {
        return this.#checkDirectionalAttacks(row, col, byColor, DIRECTIONS.STRAIGHT, 
            [PIECE_TYPES.ROOK, PIECE_TYPES.QUEEN]) ||
               this.#checkDirectionalAttacks(row, col, byColor, DIRECTIONS.DIAGONAL,
            [PIECE_TYPES.BISHOP, PIECE_TYPES.QUEEN]);
    }

    #checkDirectionalAttacks(row, col, byColor, directions, pieceTypes) {
        for (const { dr, dc } of directions) {
            let r = row + dr, c = col + dc;
            while (this.#isInBounds(r, c)) {
                const piece = this.#board[r][c];
                if (piece) {
                    return piece.color === byColor && pieceTypes.includes(piece.type);
                }
                r += dr;
                c += dc;
            }
        }
        return false;
    }

    #hasKnightAttackers(row, col, byColor) {
        return KNIGHT_MOVES.some(({ dr, dc }) => {
            const r = row + dr, c = col + dc;
            const piece = this.#isInBounds(r, c) ? this.#board[r][c] : null;
            return piece?.color === byColor && piece.type === PIECE_TYPES.KNIGHT;
        });
    }

    #hasPawnAttackers(row, col, byColor) {
        const pawnDirection = byColor === COLORS.WHITE ? 1 : -1;
        return [-1, 1].some(dc => {
            const r = row + pawnDirection, c = col + dc;
            const piece = this.#isInBounds(r, c) ? this.#board[r][c] : null;
            return piece?.color === byColor && piece.type === PIECE_TYPES.PAWN;
        });
    }

    #hasKingAttackers(row, col, byColor) {
        return DIRECTIONS.ALL.some(({ dr, dc }) => {
            const r = row + dr, c = col + dc;
            const piece = this.#isInBounds(r, c) ? this.#board[r][c] : null;
            return piece?.color === byColor && piece.type === PIECE_TYPES.KING;
        });
    }

    isInCheck(color) {
        const king = this.#findKing(color);
        if (!king) return false;
        const opponent = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        return this.#isSquareAttacked(king.row, king.col, opponent);
    }

    #generatePseudoLegalMoves(row, col) {
        const piece = this.#board[row][col];
        if (!piece) return [];

        switch (piece.type) {
            case PIECE_TYPES.PAWN:
                return this.#generatePawnMoves(row, col, piece);
            case PIECE_TYPES.KNIGHT:
                return this.#generateKnightMoves(row, col, piece);
            case PIECE_TYPES.BISHOP:
                return this.#generateSlidingMoves(row, col, piece, DIRECTIONS.DIAGONAL);
            case PIECE_TYPES.ROOK:
                return this.#generateSlidingMoves(row, col, piece, DIRECTIONS.STRAIGHT);
            case PIECE_TYPES.QUEEN:
                return this.#generateSlidingMoves(row, col, piece, DIRECTIONS.ALL);
            case PIECE_TYPES.KING:
                return this.#generateKingMoves(row, col, piece);
            default:
                return [];
        }
    }

    #generatePawnMoves(row, col, piece) {
        const moves = [];
        const direction = piece.color === COLORS.WHITE ? -1 : 1;
        const startRow = piece.color === COLORS.WHITE ? 6 : 1;
        const promoRow = piece.color === COLORS.WHITE ? 0 : 7;
        const opponent = piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

        if (this.#addPawnMoveIfValid(moves, row, col, row + direction, col, piece.color, promoRow)) {
            if (row === startRow && !this.#board[row + direction * 2][col]) {
                this.#addMove(moves, row, col, row + direction * 2, col, 'enPassantTarget');
            }
        }

        [-1, 1].forEach(dc => {
            const tr = row + direction, tc = col + dc;
            if (!this.#isInBounds(tr, tc)) return;

            const target = this.#board[tr][tc];
            if (target?.color === opponent) {
                if (tr === promoRow) {
                    this.#addMove(moves, row, col, tr, tc, 'promotion');
                } else {
                    this.#addMove(moves, row, col, tr, tc);
                }
            }

            if (this.#isEnPassantTarget(tr, tc)) {
                this.#addMove(moves, row, col, tr, tc, 'enPassant');
            }
        });

        return moves;
    }

    #addPawnMoveIfValid(moves, fromRow, fromCol, toRow, toCol, color, promoRow) {
        if (!this.#isInBounds(toRow, toCol) || this.#board[toRow][toCol]) return false;
        if (toRow === promoRow) {
            this.#addMove(moves, fromRow, fromCol, toRow, toCol, 'promotion');
        } else {
            this.#addMove(moves, fromRow, fromCol, toRow, toCol);
        }
        return true;
    }

    #isEnPassantTarget(row, col) {
        return this.#enPassantSquare?.row === row && this.#enPassantSquare?.col === col;
    }

    #generateKnightMoves(row, col, piece) {
        const moves = [];
        KNIGHT_MOVES.forEach(({ dr, dc }) => {
            const tr = row + dr, tc = col + dc;
            if (this.#isInBounds(tr, tc)) {
                const target = this.#board[tr][tc];
                if (!target || target.color !== piece.color) {
                    this.#addMove(moves, row, col, tr, tc);
                }
            }
        });
        return moves;
    }

    #generateSlidingMoves(row, col, piece, directions) {
        const moves = [];
        directions.forEach(({ dr, dc }) => {
            let r = row + dr, c = col + dc;
            while (this.#isInBounds(r, c)) {
                const target = this.#board[r][c];
                if (target) {
                    if (target.color !== piece.color) {
                        this.#addMove(moves, row, col, r, c);
                    }
                    break;
                }
                this.#addMove(moves, row, col, r, c);
                r += dr;
                c += dc;
            }
        });
        return moves;
    }

    #generateKingMoves(row, col, piece) {
        const moves = [];
        DIRECTIONS.ALL.forEach(({ dr, dc }) => {
            const tr = row + dr, tc = col + dc;
            if (this.#isInBounds(tr, tc)) {
                const target = this.#board[tr][tc];
                if (!target || target.color !== piece.color) {
                    this.#addMove(moves, row, col, tr, tc);
                }
            }
        });
        this.#addCastlingMoves(moves, row, col, piece);
        return moves;
    }

    #addCastlingMoves(moves, row, col, piece) {
        const opponent = piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        const isWhite = piece.color === COLORS.WHITE;

        if (isWhite && this.#castlingRights.wK && this.#canCastleKingSide(7, opponent)) {
            this.#addMove(moves, row, col, 7, 6, 'castleKingside');
        }
        if (isWhite && this.#castlingRights.wQ && this.#canCastleQueenSide(7, opponent)) {
            this.#addMove(moves, row, col, 7, 2, 'castleQueenside');
        }
        if (!isWhite && this.#castlingRights.bK && this.#canCastleKingSide(0, opponent)) {
            this.#addMove(moves, row, col, 0, 6, 'castleKingside');
        }
        if (!isWhite && this.#castlingRights.bQ && this.#canCastleQueenSide(0, opponent)) {
            this.#addMove(moves, row, col, 0, 2, 'castleQueenside');
        }
    }

    #canCastleKingSide(row, opponent) {
        return !this.#board[row][5] && !this.#board[row][6] &&
               this.#board[row][7]?.type === PIECE_TYPES.ROOK &&
               !this.isInCheck(this.#turn) &&
               !this.#isSquareAttacked(row, 5, opponent) &&
               !this.#isSquareAttacked(row, 6, opponent);
    }

    #canCastleQueenSide(row, opponent) {
        return !this.#board[row][3] && !this.#board[row][2] && !this.#board[row][1] &&
               this.#board[row][0]?.type === PIECE_TYPES.ROOK &&
               !this.isInCheck(this.#turn) &&
               !this.#isSquareAttacked(row, 3, opponent) &&
               !this.#isSquareAttacked(row, 2, opponent);
    }

    #addMove(moves, fromRow, fromCol, toRow, toCol, special = null) {
        moves.push({ fromRow, fromCol, toRow, toCol, special });
    }

    generateLegalMoves(color = this.#turn) {
        const allMoves = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = this.#board[row][col];
                if (piece?.color === color) {
                    allMoves.push(...this.#generatePseudoLegalMoves(row, col));
                }
            }
        }
        return allMoves.filter(move => this.#isMoveLegal(move, color));
    }

    #isMoveLegal(move, color) {
        this.makeMove(move, true);
        const legal = !this.isInCheck(color);
        this.undoMove(move, true);
        return legal;
    }

    makeMove(move, testOnly = false) {
        const piece = this.#board[move.fromRow][move.fromCol];
        const captured = this.#board[move.toRow][move.toCol];

        if (!testOnly) {
            this.#saveMoveState(move, piece, captured);
        }

        this.#executeMove(move, piece, captured);
        this.#handleSpecialMoves(move, piece);
        this.#updateGameState(move, piece, captured, testOnly);
    }

    #saveMoveState(move, piece, captured) {
        this.#moveHistory.push({
            move,
            piece,
            captured,
            castlingRights: { ...this.#castlingRights },
            enPassantSquare: this.#enPassantSquare
        });
    }

    #executeMove(move, piece) {
        this.#board[move.toRow][move.toCol] = piece;
        this.#board[move.fromRow][move.fromCol] = null;
    }

    #handleSpecialMoves(move, piece) {
        if (move.special === 'enPassant') {
            this.#board[move.fromRow][move.toCol] = null;
        }
        if (move.special === 'castleKingside') {
            this.#executeRookMove(move.toRow, 7, 5);
        }
        if (move.special === 'castleQueenside') {
            this.#executeRookMove(move.toRow, 0, 3);
        }
        if (move.special === 'promotion') {
            this.#board[move.toRow][move.toCol] = { type: PIECE_TYPES.QUEEN, color: piece.color };
        }
    }

    #executeRookMove(row, fromCol, toCol) {
        this.#board[row][toCol] = this.#board[row][fromCol];
        this.#board[row][fromCol] = null;
    }

    #updateGameState(move, piece, captured, testOnly) {
        if (testOnly) return;

        this.#updateEnPassant(move);
        this.#updateCastlingRights(move, piece, captured);
        this.#updateClocks(piece, captured);
        this.#switchTurn();
    }

    #updateEnPassant(move) {
        this.#enPassantSquare = move.special === 'enPassantTarget'
            ? { row: (move.fromRow + move.toRow) / 2, col: move.fromCol }
            : null;
    }

    #updateCastlingRights(move, piece, captured) {
        if (piece.type === PIECE_TYPES.KING) {
            if (piece.color === COLORS.WHITE) {
                this.#castlingRights.wK = false;
                this.#castlingRights.wQ = false;
            } else {
                this.#castlingRights.bK = false;
                this.#castlingRights.bQ = false;
            }
        }
        if (piece.type === PIECE_TYPES.ROOK) {
            this.#updateRookCastlingRights(move.fromRow, move.fromCol);
        }
        if (captured?.type === PIECE_TYPES.ROOK) {
            this.#updateRookCastlingRights(move.toRow, move.toCol);
        }
    }

    #updateRookCastlingRights(row, col) {
        if (row === 7 && col === 0) this.#castlingRights.wQ = false;
        if (row === 7 && col === 7) this.#castlingRights.wK = false;
        if (row === 0 && col === 0) this.#castlingRights.bQ = false;
        if (row === 0 && col === 7) this.#castlingRights.bK = false;
    }

    #updateClocks(piece, captured) {
        this.#halfMoveClock = (piece.type === PIECE_TYPES.PAWN || captured) ? 0 : this.#halfMoveClock + 1;
        if (this.#turn === COLORS.BLACK) this.#fullMoveNumber++;
    }

    #switchTurn() {
        this.#turn = this.#turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    }

    undoMove(move, testOnly = false) {
        const historyEntry = testOnly ? null : this.#moveHistory.pop();
        const piece = testOnly ? this.#board[move.toRow][move.toCol] : historyEntry?.piece;
        const captured = testOnly ? null : historyEntry?.captured;

        this.#board[move.fromRow][move.fromCol] = piece;
        this.#board[move.toRow][move.toCol] = captured;
        this.#undoSpecialMove(move, piece);

        if (!testOnly && historyEntry) {
            this.#restoreGameState(historyEntry);
        }
    }

    #undoSpecialMove(move, piece) {
        if (move.special === 'enPassant') {
            this.#board[move.fromRow][move.toCol] = {
                type: PIECE_TYPES.PAWN,
                color: piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE
            };
            this.#board[move.toRow][move.toCol] = null;
        }
        if (move.special === 'castleKingside') {
            this.#executeRookMove(move.toRow, 5, 7);
        }
        if (move.special === 'castleQueenside') {
            this.#executeRookMove(move.toRow, 3, 0);
        }
        if (move.special === 'promotion') {
            this.#board[move.fromRow][move.fromCol] = { type: PIECE_TYPES.PAWN, color: piece.color };
        }
    }

    #restoreGameState(historyEntry) {
        this.#castlingRights = historyEntry.castlingRights;
        this.#enPassantSquare = historyEntry.enPassantSquare;
        this.#turn = this.#turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        if (this.#turn === COLORS.BLACK) this.#fullMoveNumber--;
    }

    isCheckmate(color = this.#turn) {
        return this.isInCheck(color) && this.generateLegalMoves(color).length === 0;
    }

    isStalemate(color = this.#turn) {
        return !this.isInCheck(color) && this.generateLegalMoves(color).length === 0;
    }

    isInsufficientMaterial() {
        const pieces = this.#countPieces();
        return this.#isKingVsKing(pieces) || this.#isKingMinorVsKing(pieces);
    }

    #countPieces() {
        const result = { w: [], b: [] };
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const piece = this.#board[row][col];
                if (piece) result[piece.color].push({ type: piece.type, row, col });
            }
        }
        return result;
    }

    #isKingVsKing(pieces) {
        return pieces.w.length === 1 && pieces.b.length === 1;
    }

    #isKingMinorVsKing(pieces) {
        const hasMinorOnly = (color) => {
            if (pieces[color].length !== 2) return false;
            const minor = pieces[color].find(p => p.type !== PIECE_TYPES.KING);
            return minor?.type === PIECE_TYPES.BISHOP || minor?.type === PIECE_TYPES.KNIGHT;
        };
        return hasMinorOnly('w') || hasMinorOnly('b');
    }

    getGameStatus() {
        if (this.isCheckmate(this.#turn)) {
            return this.#turn === COLORS.WHITE ? 'Black wins by checkmate' : 'White wins by checkmate';
        }
        if (this.isStalemate(this.#turn)) return 'Draw by stalemate';
        if (this.isInsufficientMaterial()) return 'Draw by insufficient material';
        if (this.#halfMoveClock >= 100) return 'Draw by 50-move rule';
        if (this.isInCheck(this.#turn)) {
            return `${this.#turn === COLORS.WHITE ? 'White' : 'Black'} is in check`;
        }
        return `${this.#turn === COLORS.WHITE ? 'White' : 'Black'}'s turn`;
    }

    get turn() { return this.#turn; }
    get board() { return this.#board; }

    clone() {
        const cloned = new ChessEngine();
        cloned.#board = this.#board.map(row => row.map(cell => cell ? { ...cell } : null));
        cloned.#turn = this.#turn;
        cloned.#castlingRights = { ...this.#castlingRights };
        cloned.#enPassantSquare = this.#enPassantSquare ? { ...this.#enPassantSquare } : null;
        cloned.#halfMoveClock = this.#halfMoveClock;
        cloned.#fullMoveNumber = this.#fullMoveNumber;
        return cloned;
    }
}

export { PIECE_TYPES, COLORS, UNICODE_PIECES, BOARD_SIZE };
