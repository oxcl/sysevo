// Chess - Prototype 2: Full chess rules
// Check, checkmate, stalemate, castling, en passant, pawn promotion, insufficient material

const PIECES = {
  KING: 'k', QUEEN: 'q', ROOK: 'r', BISHOP: 'b', KNIGHT: 'n', PAWN: 'p',
  WHITE: 'w', BLACK: 'b'
};

const UNICODE_PIECES = {
  'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
  'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
};

const COLORS = { light: '#f0d9b5', dark: '#b58863', selected: '#829769', 
                 highlight: '#aad751', check: '#e04f4f', lastMove: '#d4c685' };

class ChessGame {
  constructor() {
    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');
    this.promotionOverlay = document.getElementById('promotionOverlay');
    this.promotionDialog = document.getElementById('promotionDialog');
    
    this.size = 480;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.sq = this.size / 8;
    
    this.reset();
    this.setupEvents();
    this.render();
  }
  
  reset() {
    this.board = this.createInitialBoard();
    this.turn = PIECES.WHITE;
    this.selected = null;
    this.validMoves = [];
    this.gameOver = false;
    this.gameResult = '';
    this.moveHistory = [];
    this.castlingRights = { 
      wK: true, wQ: true, bK: true, bQ: true 
    };
    this.enPassantTarget = null; // { row, col } or null
    this.kingPositions = {
      w: { row: 7, col: 4 },
      b: { row: 0, col: 4 }
    };
    this.lastMove = null;
    this.inCheck = false;
    this.promotionPending = null;
    
    this.render();
    this.updateStatus();
  }
  
  createInitialBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const backRank = [PIECES.ROOK, PIECES.KNIGHT, PIECES.BISHOP, PIECES.QUEEN,
                      PIECES.KING, PIECES.BISHOP, PIECES.KNIGHT, PIECES.ROOK];
    for (let col = 0; col < 8; col++) {
      board[0][col] = { type: backRank[col], color: PIECES.BLACK };
      board[1][col] = { type: PIECES.PAWN, color: PIECES.BLACK };
      board[6][col] = { type: PIECES.PAWN, color: PIECES.WHITE };
      board[7][col] = { type: backRank[col], color: PIECES.WHITE };
    }
    return board;
  }
  
  setupEvents() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    window.addEventListener('resize', () => this.render());
  }
  
  getSquareFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / this.sq);
    const row = Math.floor(y / this.sq);
    if (col >= 0 && col < 8 && row >= 0 && row < 8) return { row, col };
    return null;
  }
  
  handleClick(e) {
    if (this.gameOver || this.promotionPending) return;
    const sq = this.getSquareFromEvent(e);
    if (!sq) return;
    
    const piece = this.board[sq.row][sq.col];
    
    if (this.selected) {
      const moveIdx = this.validMoves.findIndex(m => m.row === sq.row && m.col === sq.col);
      if (moveIdx !== -1) {
        const move = this.validMoves[moveIdx];
        this.executeMove(this.selected.row, this.selected.col, sq.row, sq.col, move.special);
        this.selected = null;
        this.validMoves = [];
        return;
      }
      if (piece && piece.color === this.turn) {
        this.selected = sq;
        this.validMoves = this.getLegalMoves(sq.row, sq.col);
        this.render();
        return;
      }
      this.selected = null;
      this.validMoves = [];
      this.render();
      return;
    }
    
    if (piece && piece.color === this.turn) {
      this.selected = sq;
      this.validMoves = this.getLegalMoves(sq.row, sq.col);
      this.render();
    }
  }
  
  // ---- Move Generation ----
  
  getPseudoLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];
    const moves = [];
    const addMove = (r, c, special) => {
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const target = this.board[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ row: r, col: c, special: special || null });
          return true;
        }
        return false;
      }
      return false;
    };
    
    switch (piece.type) {
      case PIECES.PAWN: {
        const dir = piece.color === PIECES.WHITE ? -1 : 1;
        const startRow = piece.color === PIECES.WHITE ? 6 : 1;
        
        if (this.inBounds(row + dir, col) && !this.board[row + dir][col]) {
          moves.push({ row: row + dir, col, special: null });
          if (row === startRow && !this.board[row + 2 * dir][col]) {
            moves.push({ row: row + 2 * dir, col, special: 'double' });
          }
        }
        for (const dc of [-1, 1]) {
          const nc = col + dc;
          if (this.inBounds(row + dir, nc)) {
            const target = this.board[row + dir][nc];
            if (target && target.color !== piece.color) {
              moves.push({ row: row + dir, col: nc, special: 'capture' });
            }
            // En passant
            if (this.enPassantTarget && this.enPassantTarget.row === row + dir && this.enPassantTarget.col === nc) {
              moves.push({ row: row + dir, col: nc, special: 'enpassant' });
            }
          }
        }
        break;
      }
      case PIECES.KNIGHT: {
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
          addMove(row + dr, col + dc);
        }
        break;
      }
      case PIECES.BISHOP: {
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
          for (let i = 1; i < 8; i++) {
            if (!addMove(row + dr * i, col + dc * i)) break;
          }
        }
        break;
      }
      case PIECES.ROOK: {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          for (let i = 1; i < 8; i++) {
            if (!addMove(row + dr * i, col + dc * i)) break;
          }
        }
        break;
      }
      case PIECES.QUEEN: {
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
          for (let i = 1; i < 8; i++) {
            if (!addMove(row + dr * i, col + dc * i)) break;
          }
        }
        break;
      }
      case PIECES.KING: {
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
          addMove(row + dr, col + dc);
        }
        // Castling
        const color = piece.color;
        if (row === (color === PIECES.WHITE ? 7 : 0) && col === 4) {
          // Kingside
          if (this.castlingRights[color === PIECES.WHITE ? 'wK' : 'bK']) {
            const rookCol = 7;
            const rook = this.board[row][rookCol];
            if (rook && rook.type === PIECES.ROOK && rook.color === color) {
              if (!this.board[row][5] && !this.board[row][6]) {
                // Check that king doesn't move through check
                if (!this.isSquareAttacked(row, 4, color) && 
                    !this.isSquareAttacked(row, 5, color) && 
                    !this.isSquareAttacked(row, 6, color)) {
                  moves.push({ row, col: 6, special: 'castle-kingside' });
                }
              }
            }
          }
          // Queenside
          if (this.castlingRights[color === PIECES.WHITE ? 'wQ' : 'bQ']) {
            const rookCol = 0;
            const rook = this.board[row][rookCol];
            if (rook && rook.type === PIECES.ROOK && rook.color === color) {
              if (!this.board[row][1] && !this.board[row][2] && !this.board[row][3]) {
                if (!this.isSquareAttacked(row, 4, color) && 
                    !this.isSquareAttacked(row, 3, color) && 
                    !this.isSquareAttacked(row, 2, color)) {
                  moves.push({ row, col: 2, special: 'castle-queenside' });
                }
              }
            }
          }
        }
        break;
      }
    }
    return moves;
  }
  
  // Filter moves that leave king in check
  getLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];
    const pseudoMoves = this.getPseudoLegalMoves(row, col);
    return pseudoMoves.filter(move => {
      // Simulate the move
      const boardCopy = this.cloneBoard(this.board);
      const enPassantCopy = this.enPassantTarget;
      const castlingCopy = { ...this.castlingRights };
      
      // Make move on copy
      let kingPos = { ...this.kingPositions[piece.color] };
      const capturedEnPassant = move.special === 'enpassant';
      const castling = move.special && move.special.startsWith('castle');
      
      boardCopy[move.row][move.col] = boardCopy[row][col];
      boardCopy[row][col] = null;
      
      if (capturedEnPassant) {
        boardCopy[row][move.col] = null; // Remove the captured pawn
      }
      
      if (castling) {
        if (move.special === 'castle-kingside') {
          boardCopy[move.row][5] = boardCopy[move.row][7];
          boardCopy[move.row][7] = null;
        } else {
          boardCopy[move.row][3] = boardCopy[move.row][0];
          boardCopy[move.row][0] = null;
        }
      }
      
      if (piece.type === PIECES.KING) {
        kingPos = { row: move.row, col: move.col };
      }
      
      // Update king position on copy for pawn promotion detection
      const currentKingPos = kingPos;
      
      // Check if king is in check after the move
      const inCheck = this.isKingInCheckOnBoard(boardCopy, currentKingPos, piece.color);
      
      return !inCheck;
    });
  }
  
  // Check if a square is attacked by the opponent
  isSquareAttacked(row, col, color) {
    const opponent = color === PIECES.WHITE ? PIECES.BLACK : PIECES.WHITE;
    const board = this.board;
    
    // Check knight attacks
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r = row + dr, c = col + dc;
      if (this.inBounds(r, c) && board[r][c] && board[r][c].type === PIECES.KNIGHT && board[r][c].color === opponent)
        return true;
    }
    
    // Check king attacks
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
      const r = row + dr, c = col + dc;
      if (this.inBounds(r, c) && board[r][c] && board[r][c].type === PIECES.KING && board[r][c].color === opponent)
        return true;
    }
    
    // Check sliding pieces (bishop, rook, queen)
    // Bishop/Queen diagonals
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      for (let i = 1; i < 8; i++) {
        const r = row + dr * i, c = col + dc * i;
        if (!this.inBounds(r, c)) break;
        if (board[r][c]) {
          if (board[r][c].color === opponent && 
              (board[r][c].type === PIECES.BISHOP || board[r][c].type === PIECES.QUEEN))
            return true;
          break;
        }
      }
    }
    // Rook/Queen straight
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      for (let i = 1; i < 8; i++) {
        const r = row + dr * i, c = col + dc * i;
        if (!this.inBounds(r, c)) break;
        if (board[r][c]) {
          if (board[r][c].color === opponent && 
              (board[r][c].type === PIECES.ROOK || board[r][c].type === PIECES.QUEEN))
            return true;
          break;
        }
      }
    }
    
    // Check pawn attacks
    const pawnDir = opponent === PIECES.WHITE ? -1 : 1;
    for (const dc of [-1, 1]) {
      const r = row + pawnDir, c = col + dc;
      if (this.inBounds(r, c) && board[r][c] && board[r][c].type === PIECES.PAWN && board[r][c].color === opponent)
        return true;
    }
    
    return false;
  }
  
  isKingInCheckOnBoard(board, kingPos, color) {
    return this.isSquareAttackedOnBoard(board, kingPos.row, kingPos.col, color);
  }
  
  isSquareAttackedOnBoard(board, row, col, color) {
    const opponent = color === PIECES.WHITE ? PIECES.BLACK : PIECES.WHITE;
    
    // Knight attacks
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r = row + dr, c = col + dc;
      if (this.inBounds(r, c) && board[r][c] && board[r][c].type === PIECES.KNIGHT && board[r][c].color === opponent)
        return true;
    }
    
    // King attacks
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
      const r = row + dr, c = col + dc;
      if (this.inBounds(r, c) && board[r][c] && board[r][c].type === PIECES.KING && board[r][c].color === opponent)
        return true;
    }
    
    // Sliding pieces
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      for (let i = 1; i < 8; i++) {
        const r = row + dr * i, c = col + dc * i;
        if (!this.inBounds(r, c)) break;
        if (board[r][c]) {
          if (board[r][c].color === opponent && 
              (board[r][c].type === PIECES.BISHOP || board[r][c].type === PIECES.QUEEN))
            return true;
          break;
        }
      }
    }
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      for (let i = 1; i < 8; i++) {
        const r = row + dr * i, c = col + dc * i;
        if (!this.inBounds(r, c)) break;
        if (board[r][c]) {
          if (board[r][c].color === opponent && 
              (board[r][c].type === PIECES.ROOK || board[r][c].type === PIECES.QUEEN))
            return true;
          break;
        }
      }
    }
    
    // Pawn attacks
    const pawnDir = opponent === PIECES.WHITE ? -1 : 1;
    for (const dc of [-1, 1]) {
      const r = row + pawnDir, c = col + dc;
      if (this.inBounds(r, c) && board[r][c] && board[r][c].type === PIECES.PAWN && board[r][c].color === opponent)
        return true;
    }
    
    return false;
  }
  
  inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }
  
  cloneBoard(board) {
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
  }
  
  // ---- Executing Moves ----
  
  executeMove(fromRow, fromCol, toRow, toCol, special) {
    const piece = this.board[fromRow][fromCol];
    const captured = this.board[toRow][toCol];
    const isEnPassant = special === 'enpassant';
    const isCastling = special && special.startsWith('castle');
    const isDoublePawn = special === 'double';
    
    // Determine if this is a capture
    let capturePiece = captured;
    if (isEnPassant) {
      capturePiece = this.board[fromRow][toCol]; // Pawn being captured en passant
    }
    
    // Save move for en passant tracking
    this.lastMove = { fromRow, fromCol, toRow, toCol, piece, captured: capturePiece, special };
    
    // Execute the move
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;
    
    // En passant capture
    if (isEnPassant) {
      this.board[fromRow][toCol] = null;
    }
    
    // Castling
    if (isCastling) {
      if (special === 'castle-kingside') {
        this.board[toRow][5] = this.board[toRow][7];
        this.board[toRow][7] = null;
      } else {
        this.board[toRow][3] = this.board[toRow][0];
        this.board[toRow][0] = null;
      }
    }
    
    // Update king position
    if (piece.type === PIECES.KING) {
      this.kingPositions[piece.color] = { row: toRow, col: toCol };
    }
    
    // Update castling rights
    if (piece.type === PIECES.KING) {
      if (piece.color === PIECES.WHITE) {
        this.castlingRights.wK = false;
        this.castlingRights.wQ = false;
      } else {
        this.castlingRights.bK = false;
        this.castlingRights.bQ = false;
      }
    }
    if (piece.type === PIECES.ROOK) {
      if (fromRow === 7 && fromCol === 0) this.castlingRights.wQ = false;
      if (fromRow === 7 && fromCol === 7) this.castlingRights.wK = false;
      if (fromRow === 0 && fromCol === 0) this.castlingRights.bQ = false;
      if (fromRow === 0 && fromCol === 7) this.castlingRights.bK = false;
    }
    // If a rook is captured
    if (toRow === 7 && toCol === 0) this.castlingRights.wQ = false;
    if (toRow === 7 && toCol === 7) this.castlingRights.wK = false;
    if (toRow === 0 && toCol === 0) this.castlingRights.bQ = false;
    if (toRow === 0 && toCol === 7) this.castlingRights.bK = false;
    
    // Set en passant target
    this.enPassantTarget = null;
    if (isDoublePawn) {
      this.enPassantTarget = { 
        row: (fromRow + toRow) / 2, 
        col: fromCol 
      };
    }
    
    // Move history for en passant (store previous move's en passant info)
    this.moveHistory.push({
      fromRow, fromCol, toRow, toCol,
      piece: { ...piece },
      captured: capturePiece ? { ...capturePiece } : null,
      special,
      enPassantTarget: this.enPassantTarget,
      castlingRights: { ...this.castlingRights }
    });
    
    // Pawn promotion
    if (piece.type === PIECES.PAWN && (toRow === 0 || toRow === 7)) {
      this.promotionPending = { row: toRow, col: toCol, color: piece.color };
      this.showPromotionDialog(piece.color);
      return; // Don't switch turns yet
    }
    
    this.finishTurn();
  }
  
  finishTurn() {
    // Switch turns
    this.turn = this.turn === PIECES.WHITE ? PIECES.BLACK : PIECES.WHITE;
    
    // Check game state
    this.checkGameState();
    
    this.render();
    this.updateStatus();
    this.selected = null;
    this.validMoves = [];
  }
  
  promotePawn(row, col, pieceType) {
    const color = this.promotionPending.color;
    this.board[row][col] = { type: pieceType, color };
    this.promotionPending = null;
    this.promotionOverlay.style.display = 'none';
    
    this.finishTurn();
  }
  
  showPromotionDialog(color) {
    const dialog = this.promotionDialog;
    dialog.innerHTML = '';
    const pieces = [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT];
    const self = this;
    const { row, col } = this.promotionPending;
    
    pieces.forEach(type => {
      const btn = document.createElement('button');
      btn.className = 'promotion-btn';
      const key = color + type;
      btn.textContent = UNICODE_PIECES[key];
      btn.addEventListener('click', () => self.promotePawn(row, col, type));
      dialog.appendChild(btn);
    });
    
    this.promotionOverlay.style.display = 'flex';
  }
  
  // ---- Game State Checks ----
  
  checkGameState() {
    // Check if the current player has any legal moves
    const hasLegalMove = this.hasAnyLegalMove(this.turn);
    
    // Check if current player's king is in check
    const kingPos = this.kingPositions[this.turn];
    this.inCheck = this.isSquareAttacked(kingPos.row, kingPos.col, this.turn);
    
    if (!hasLegalMove) {
      this.gameOver = true;
      if (this.inCheck) {
        // Checkmate
        const winner = this.turn === PIECES.WHITE ? 'Black' : 'White';
        this.gameResult = `Checkmate! ${winner} wins!`;
      } else {
        // Stalemate
        this.gameResult = 'Stalemate! Draw!';
      }
    } else if (this.isInsufficientMaterial()) {
      this.gameOver = true;
      this.gameResult = 'Draw by insufficient material!';
    }
  }
  
  hasAnyLegalMove(color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === color) {
          const moves = this.getLegalMoves(row, col);
          if (moves.length > 0) return true;
        }
      }
    }
    return false;
  }
  
  isInsufficientMaterial() {
    const pieces = { w: [], b: [] };
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const p = this.board[row][col];
        if (p) pieces[p.color].push(p.type);
      }
    }
    
    const all = [...pieces.w, ...pieces.b];
    
    // King vs King
    if (all.length === 2) return true;
    
    // King + minor piece vs King
    if (all.length === 3) {
      const minors = all.filter(t => t === PIECES.BISHOP || t === PIECES.KNIGHT);
      if (minors.length === 1) return true;
    }
    
    // King + Bishop vs King + Bishop (same color bishops)
    if (all.length === 4) {
      const bishops = all.filter(t => t === PIECES.BISHOP);
      if (bishops.length === 2) {
        // Check if bishops are on same color
        const bishopPositions = [];
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            const p = this.board[row][col];
            if (p && p.type === PIECES.BISHOP) {
              bishopPositions.push({ row, col });
            }
          }
        }
        if (bishopPositions.length === 2) {
          const sq1 = (bishopPositions[0].row + bishopPositions[0].col) % 2;
          const sq2 = (bishopPositions[1].row + bishopPositions[1].col) % 2;
          if (sq1 === sq2) return true;
        }
      }
    }
    
    return false;
  }
  
  updateStatus() {
    if (this.gameOver) {
      this.statusEl.textContent = this.gameResult;
      return;
    }
    
    const turnName = this.turn === PIECES.WHITE ? 'White' : 'Black';
    let status = `${turnName}'s turn`;
    if (this.inCheck) {
      status += ' — Check!';
    }
    this.statusEl.textContent = status;
  }
  
  // ---- Rendering ----
  
  render() {
    const ctx = this.ctx;
    const sq = this.sq;
    
    // Draw board
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        ctx.fillStyle = isLight ? COLORS.light : COLORS.dark;
        ctx.fillRect(col * sq, row * sq, sq, sq);
      }
    }
    
    // Highlight last move
    if (this.lastMove && !this.gameOver) {
      ctx.fillStyle = COLORS.lastMove;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(this.lastMove.fromCol * sq, this.lastMove.fromRow * sq, sq, sq);
      ctx.fillRect(this.lastMove.toCol * sq, this.lastMove.toRow * sq, sq, sq);
      ctx.globalAlpha = 1.0;
    }
    
    // Highlight selected square
    if (this.selected) {
      ctx.fillStyle = COLORS.selected;
      ctx.fillRect(this.selected.col * sq, this.selected.row * sq, sq, sq);
    }
    
    // Highlight king in check
    if (this.inCheck) {
      const kingPos = this.kingPositions[this.turn];
      ctx.fillStyle = COLORS.check;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(kingPos.col * sq + sq / 2, kingPos.row * sq + sq / 2, sq / 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    
    // Highlight valid moves
    for (const move of this.validMoves) {
      const target = this.board[move.row][move.col];
      ctx.fillStyle = COLORS.highlight;
      if (target) {
        // Capture indicator
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(move.col * sq + sq / 2, move.row * sq + sq / 2, sq / 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      } else {
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(move.col * sq + sq / 2, move.row * sq + sq / 2, sq / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
    
    // Draw pieces
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece) {
          const key = piece.color + piece.type;
          const unicode = UNICODE_PIECES[key];
          ctx.save();
          ctx.font = `${sq * 0.8}px 'Segoe UI', 'Arial Unicode MS', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 3;
          if (piece.color === PIECES.WHITE) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
          } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
          }
          ctx.fillText(unicode, col * sq + sq / 2, row * sq + sq / 2 + 2);
          ctx.restore();
        }
      }
    }
  }
}

// Start game
const game = new ChessGame();
