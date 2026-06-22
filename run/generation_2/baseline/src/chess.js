// Chess Engine - Board representation and move generation

export const PIECES = {
    KING: 'K',
    QUEEN: 'Q',
    ROOK: 'R',
    BISHOP: 'B',
    KNIGHT: 'N',
    PAWN: 'P'
};

export const COLORS = {
    WHITE: 'w',
    BLACK: 'b'
};

export const UNICODE_PIECES = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

export class ChessEngine {
    constructor() {
        this.board = this.createInitialBoard();
        this.turn = COLORS.WHITE;
        this.moveHistory = [];
        this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
        this.enPassantSquare = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
    }

    createInitialBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Black pieces
        board[0] = [
            { type: PIECES.ROOK, color: COLORS.BLACK },
            { type: PIECES.KNIGHT, color: COLORS.BLACK },
            { type: PIECES.BISHOP, color: COLORS.BLACK },
            { type: PIECES.QUEEN, color: COLORS.BLACK },
            { type: PIECES.KING, color: COLORS.BLACK },
            { type: PIECES.BISHOP, color: COLORS.BLACK },
            { type: PIECES.KNIGHT, color: COLORS.BLACK },
            { type: PIECES.ROOK, color: COLORS.BLACK }
        ];
        for (let col = 0; col < 8; col++) {
            board[1][col] = { type: PIECES.PAWN, color: COLORS.BLACK };
        }

        // White pieces
        board[7] = [
            { type: PIECES.ROOK, color: COLORS.WHITE },
            { type: PIECES.KNIGHT, color: COLORS.WHITE },
            { type: PIECES.BISHOP, color: COLORS.WHITE },
            { type: PIECES.QUEEN, color: COLORS.WHITE },
            { type: PIECES.KING, color: COLORS.WHITE },
            { type: PIECES.BISHOP, color: COLORS.WHITE },
            { type: PIECES.KNIGHT, color: COLORS.WHITE },
            { type: PIECES.ROOK, color: COLORS.WHITE }
        ];
        for (let col = 0; col < 8; col++) {
            board[6][col] = { type: PIECES.PAWN, color: COLORS.WHITE };
        }

        return board;
    }

    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    isInBounds(row, col) {
        return row >= 0 && row <= 7 && col >= 0 && col <= 7;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === PIECES.KING && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isSquareAttacked(row, col, byColor) {
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
        ];

        // Check for rook/queen attacks (straight lines)
        for (const { dr, dc } of directions.slice(0, 4)) {
            let r = row + dr, c = col + dc;
            while (this.isInBounds(r, c)) {
                const piece = this.board[r][c];
                if (piece) {
                    if (piece.color === byColor && 
                        (piece.type === PIECES.ROOK || piece.type === PIECES.QUEEN)) {
                        return true;
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        // Check for bishop/queen attacks (diagonals)
        for (const { dr, dc } of directions.slice(4)) {
            let r = row + dr, c = col + dc;
            while (this.isInBounds(r, c)) {
                const piece = this.board[r][c];
                if (piece) {
                    if (piece.color === byColor && 
                        (piece.type === PIECES.BISHOP || piece.type === PIECES.QUEEN)) {
                        return true;
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        // Check for knight attacks
        const knightMoves = [
            { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
            { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
            { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
            { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
        ];
        for (const { dr, dc } of knightMoves) {
            const r = row + dr, c = col + dc;
            if (this.isInBounds(r, c)) {
                const piece = this.board[r][c];
                if (piece && piece.color === byColor && piece.type === PIECES.KNIGHT) {
                    return true;
                }
            }
        }

        // Check for pawn attacks
        const pawnDir = byColor === COLORS.WHITE ? 1 : -1;
        for (const dc of [-1, 1]) {
            const r = row + pawnDir, c = col + dc;
            if (this.isInBounds(r, c)) {
                const piece = this.board[r][c];
                if (piece && piece.color === byColor && piece.type === PIECES.PAWN) {
                    return true;
                }
            }
        }

        // Check for king attacks
        for (const { dr, dc } of directions) {
            const r = row + dr, c = col + dc;
            if (this.isInBounds(r, c)) {
                const piece = this.board[r][c];
                if (piece && piece.color === byColor && piece.type === PIECES.KING) {
                    return true;
                }
            }
        }

        return false;
    }

    isInCheck(color) {
        const king = this.findKing(color);
        if (!king) return false;
        const opponent = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        return this.isSquareAttacked(king.row, king.col, opponent);
    }

    generatePseudoLegalMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const { type, color } = piece;
        const opponent = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

        const addMove = (toRow, toCol, special = null) => {
            if (!this.isInBounds(toRow, toCol)) return false;
            const target = this.board[toRow][toCol];
            if (target && target.color === color) return false;
            moves.push({ fromRow: row, fromCol: col, toRow, toCol, special });
            return !target;
        };

        const addSlidingMoves = (directions) => {
            for (const { dr, dc } of directions) {
                let r = row + dr, c = col + dc;
                while (addMove(r, c)) {
                    r += dr;
                    c += dc;
                }
            }
        };

        switch (type) {
            case PIECES.PAWN: {
                const dir = color === COLORS.WHITE ? -1 : 1;
                const startRow = color === COLORS.WHITE ? 6 : 1;
                const promoRow = color === COLORS.WHITE ? 0 : 7;

                // Forward move
                if (addMove(row + dir, col)) {
                    // Double move from start
                    if (row === startRow && !this.board[row + dir * 2][col]) {
                        addMove(row + dir * 2, col, 'enPassantTarget');
                    }
                }

                // Captures
                for (const dc of [-1, 1]) {
                    const tr = row + dir, tc = col + dc;
                    if (this.isInBounds(tr, tc)) {
                        const target = this.board[tr][tc];
                        if (target && target.color === opponent) {
                            if (tr === promoRow) {
                                moves.push({ fromRow: row, fromCol: col, toRow: tr, toCol: tc, special: 'promotion' });
                            } else {
                                moves.push({ fromRow: row, fromCol: col, toRow: tr, toCol: tc });
                            }
                        }
                        // En passant
                        if (this.enPassantSquare && tr === this.enPassantSquare.row && tc === this.enPassantSquare.col) {
                            moves.push({ fromRow: row, fromCol: col, toRow: tr, toCol: tc, special: 'enPassant' });
                        }
                    }
                }
                break;
            }

            case PIECES.KNIGHT: {
                const knightMoves = [
                    { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
                    { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
                    { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
                    { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
                ];
                for (const { dr, dc } of knightMoves) {
                    addMove(row + dr, col + dc);
                }
                break;
            }

            case PIECES.BISHOP: {
                addSlidingMoves([
                    { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
                    { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
                ]);
                break;
            }

            case PIECES.ROOK: {
                addSlidingMoves([
                    { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                    { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
                ]);
                break;
            }

            case PIECES.QUEEN: {
                addSlidingMoves([
                    { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
                    { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                    { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
                ]);
                break;
            }

            case PIECES.KING: {
                const directions = [
                    { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
                    { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                    { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
                ];
                for (const { dr, dc } of directions) {
                    addMove(row + dr, col + dc);
                }

                // Castling
                if (color === COLORS.WHITE) {
                    if (this.castlingRights.wK && !this.board[7][5] && !this.board[7][6] &&
                        this.board[7][7]?.type === PIECES.ROOK && !this.isInCheck(color) &&
                        !this.isSquareAttacked(7, 5, opponent) && !this.isSquareAttacked(7, 6, opponent)) {
                        moves.push({ fromRow: 7, fromCol: 4, toRow: 7, toCol: 6, special: 'castleKingside' });
                    }
                    if (this.castlingRights.wQ && !this.board[7][3] && !this.board[7][2] && !this.board[7][1] &&
                        this.board[7][0]?.type === PIECES.ROOK && !this.isInCheck(color) &&
                        !this.isSquareAttacked(7, 3, opponent) && !this.isSquareAttacked(7, 2, opponent)) {
                        moves.push({ fromRow: 7, fromCol: 4, toRow: 7, toCol: 2, special: 'castleQueenside' });
                    }
                } else {
                    if (this.castlingRights.bK && !this.board[0][5] && !this.board[0][6] &&
                        this.board[0][7]?.type === PIECES.ROOK && !this.isInCheck(color) &&
                        !this.isSquareAttacked(0, 5, opponent) && !this.isSquareAttacked(0, 6, opponent)) {
                        moves.push({ fromRow: 0, fromCol: 4, toRow: 0, toCol: 6, special: 'castleKingside' });
                    }
                    if (this.castlingRights.bQ && !this.board[0][3] && !this.board[0][2] && !this.board[0][1] &&
                        this.board[0][0]?.type === PIECES.ROOK && !this.isInCheck(color) &&
                        !this.isSquareAttacked(0, 3, opponent) && !this.isSquareAttacked(0, 2, opponent)) {
                        moves.push({ fromRow: 0, fromCol: 4, toRow: 0, toCol: 2, special: 'castleQueenside' });
                    }
                }
                break;
            }
        }

        return moves;
    }

    generateLegalMoves(color = this.turn) {
        const allMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    allMoves.push(...this.generatePseudoLegalMoves(row, col));
                }
            }
        }

        // Filter moves that leave king in check
        return allMoves.filter(move => {
            this.makeMove(move, true);
            const inCheck = this.isInCheck(color);
            this.undoMove(move, true);
            return !inCheck;
        });
    }

    makeMove(move, testOnly = false) {
        const piece = this.board[move.fromRow][move.fromCol];
        const captured = this.board[move.toRow][move.toCol];

        if (!testOnly) {
            this.moveHistory.push({
                move,
                piece,
                captured,
                castlingRights: { ...this.castlingRights },
                enPassantSquare: this.enPassantSquare
            });
        }

        // Move piece
        this.board[move.toRow][move.toCol] = piece;
        this.board[move.fromRow][move.fromCol] = null;

        // Handle special moves
        if (move.special === 'enPassant') {
            const capturedRow = move.fromRow;
            this.board[capturedRow][move.toCol] = null;
        }

        if (move.special === 'castleKingside') {
            const rookFromCol = 7;
            const rookToCol = 5;
            this.board[move.toRow][rookToCol] = this.board[move.toRow][rookFromCol];
            this.board[move.toRow][rookFromCol] = null;
        }

        if (move.special === 'castleQueenside') {
            const rookFromCol = 0;
            const rookToCol = 3;
            this.board[move.toRow][rookToCol] = this.board[move.toRow][rookFromCol];
            this.board[move.toRow][rookFromCol] = null;
        }

        if (move.special === 'promotion') {
            this.board[move.toRow][move.toCol] = { type: PIECES.QUEEN, color: piece.color };
        }

        if (!testOnly) {
            // Update en passant square
            if (move.special === 'enPassantTarget') {
                this.enPassantSquare = { row: (move.fromRow + move.toRow) / 2, col: move.fromCol };
            } else {
                this.enPassantSquare = null;
            }

            // Update castling rights
            if (piece.type === PIECES.KING) {
                if (piece.color === COLORS.WHITE) {
                    this.castlingRights.wK = false;
                    this.castlingRights.wQ = false;
                } else {
                    this.castlingRights.bK = false;
                    this.castlingRights.bQ = false;
                }
            }
            if (piece.type === PIECES.ROOK) {
                if (move.fromRow === 7 && move.fromCol === 0) this.castlingRights.wQ = false;
                if (move.fromRow === 7 && move.fromCol === 7) this.castlingRights.wK = false;
                if (move.fromRow === 0 && move.fromCol === 0) this.castlingRights.bQ = false;
                if (move.fromRow === 0 && move.fromCol === 7) this.castlingRights.bK = false;
            }
            if (captured?.type === PIECES.ROOK) {
                if (move.toRow === 7 && move.toCol === 0) this.castlingRights.wQ = false;
                if (move.toRow === 7 && move.toCol === 7) this.castlingRights.wK = false;
                if (move.toRow === 0 && move.toCol === 0) this.castlingRights.bQ = false;
                if (move.toRow === 0 && move.toCol === 7) this.castlingRights.bK = false;
            }

            // Update clocks
            if (piece.type === PIECES.PAWN || captured) {
                this.halfMoveClock = 0;
            } else {
                this.halfMoveClock++;
            }

            if (this.turn === COLORS.BLACK) {
                this.fullMoveNumber++;
            }
            this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        }
    }

    undoMove(move, testOnly = false) {
        const historyEntry = testOnly ? null : this.moveHistory.pop();
        const piece = testOnly ? this.board[move.toRow][move.toCol] : historyEntry?.piece;
        const captured = testOnly ? null : historyEntry?.captured;

        // Move piece back
        this.board[move.fromRow][move.fromCol] = piece;
        this.board[move.toRow][move.toCol] = captured;

        // Handle special moves
        if (move.special === 'enPassant') {
            const capturedRow = move.fromRow;
            this.board[capturedRow][move.toCol] = { type: PIECES.PAWN, color: piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE };
            this.board[move.toRow][move.toCol] = null;
        }

        if (move.special === 'castleKingside') {
            this.board[move.toRow][7] = this.board[move.toRow][5];
            this.board[move.toRow][5] = null;
        }

        if (move.special === 'castleQueenside') {
            this.board[move.toRow][0] = this.board[move.toRow][3];
            this.board[move.toRow][3] = null;
        }

        if (move.special === 'promotion') {
            this.board[move.fromRow][move.fromCol] = { type: PIECES.PAWN, color: piece.color };
        }

        if (!testOnly && historyEntry) {
            this.castlingRights = historyEntry.castlingRights;
            this.enPassantSquare = historyEntry.enPassantSquare;
            this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
            if (this.turn === COLORS.BLACK) {
                this.fullMoveNumber--;
            }
            this.halfMoveClock = this.moveHistory.length > 0 ? 
                this.moveHistory[this.moveHistory.length - 1].move?.special === 'enPassantTarget' ? 0 : this.halfMoveClock : 0;
        }
    }

    isCheckmate(color = this.turn) {
        return this.isInCheck(color) && this.generateLegalMoves(color).length === 0;
    }

    isStalemate(color = this.turn) {
        return !this.isInCheck(color) && this.generateLegalMoves(color).length === 0;
    }

    isInsufficientMaterial() {
        const pieces = { w: [], b: [] };
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    pieces[piece.color].push({ type: piece.type, row, col });
                }
            }
        }

        // King vs King
        if (pieces.w.length === 1 && pieces.b.length === 1) return true;

        // King + Bishop vs King or King + Knight vs King
        if (pieces.w.length === 1 && pieces.b.length === 2) {
            const nonKing = pieces.b.find(p => p.type !== PIECES.KING);
            if (nonKing && (nonKing.type === PIECES.BISHOP || nonKing.type === PIECES.KNIGHT)) return true;
        }
        if (pieces.b.length === 1 && pieces.w.length === 2) {
            const nonKing = pieces.w.find(p => p.type !== PIECES.KING);
            if (nonKing && (nonKing.type === PIECES.BISHOP || nonKing.type === PIECES.KNIGHT)) return true;
        }

        return false;
    }

    getGameStatus() {
        if (this.isCheckmate(this.turn)) {
            return this.turn === COLORS.WHITE ? 'Black wins by checkmate' : 'White wins by checkmate';
        }
        if (this.isStalemate(this.turn)) {
            return 'Draw by stalemate';
        }
        if (this.isInsufficientMaterial()) {
            return 'Draw by insufficient material';
        }
        if (this.halfMoveClock >= 100) {
            return 'Draw by 50-move rule';
        }
        if (this.isInCheck(this.turn)) {
            return `${this.turn === COLORS.WHITE ? 'White' : 'Black'} is in check`;
        }
        return `${this.turn === COLORS.WHITE ? 'White' : 'Black'}'s turn`;
    }

    clone() {
        const cloned = new ChessEngine();
        cloned.board = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
        cloned.turn = this.turn;
        cloned.castlingRights = { ...this.castlingRights };
        cloned.enPassantSquare = this.enPassantSquare ? { ...this.enPassantSquare } : null;
        cloned.halfMoveClock = this.halfMoveClock;
        cloned.fullMoveNumber = this.fullMoveNumber;
        return cloned;
    }

    toFEN() {
        let fen = '';
        for (let row = 0; row < 8; row++) {
            let empty = 0;
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (empty > 0) {
                        fen += empty;
                        empty = 0;
                    }
                    const letter = piece.type;
                    fen += piece.color === COLORS.WHITE ? letter.toUpperCase() : letter.toLowerCase();
                } else {
                    empty++;
                }
            }
            if (empty > 0) fen += empty;
            if (row < 7) fen += '/';
        }
        fen += ` ${this.turn}`;
        fen += ` ${this.castlingRights.wK ? 'K' : ''}${this.castlingRights.wQ ? 'Q' : ''}${this.castlingRights.bK ? 'k' : ''}${this.castlingRights.bQ ? 'q' : ''}` || '-';
        fen += ` ${this.enPassantSquare ? String.fromCharCode(97 + this.enPassantSquare.col) + (8 - this.enPassantSquare.row) : '-'}`;
        fen += ` ${this.halfMoveClock} ${this.fullMoveNumber}`;
        return fen;
    }
}
