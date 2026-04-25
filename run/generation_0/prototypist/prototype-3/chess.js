// Chess - Prototype 3: Full game with AI opponent using Minimax + Alpha-Beta Pruning

const PIECES = {
  KING: 'k', QUEEN: 'q', ROOK: 'r', BISHOP: 'b', KNIGHT: 'n', PAWN: 'p',
  WHITE: 'w', BLACK: 'b'
};

const UNICODE = {
  'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
  'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
};

const COLORS = { 
  light: '#f0d9b5', dark: '#b58863', selected: '#829769', 
  highlight: '#aad751', check: '#e04f4f', lastMove: '#d4c685',
  lightHover: '#e6d4b5', darkHover: '#c9a87c'
};

// Piece values for evaluation
const PIECE_VALUES = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
};

// Piece-square tables (from White's perspective, flipped for Black)
const PST = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5,-10, 0, 0,-10, -5, 5],
    [5, 10, 10,-20,-20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20, 0, 0, 0, 0,-20,-40],
    [-30, 0, 10, 15, 15, 10, 0,-30],
    [-30, 5, 15, 20, 20, 15, 5,-30],
    [-30, 0, 15, 20, 20, 15, 0,-30],
    [-30, 5, 10, 15, 15, 10, 5,-30],
    [-40,-20, 0, 5, 5, 0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10, 0, 0, 0, 0, 0, 0,-10],
    [-10, 0, 10, 10, 10, 10, 0,-10],
    [-10, 5, 5, 10, 10, 5, 5,-10],
    [-10, 0, 5, 10, 10, 5, 0,-10],
    [-10, 10, 5, 10, 10, 5, 10,-10],
    [-10, 5, 0, 0, 0, 0, 5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0]
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10, 0, 0, 0, 0, 0, 0,-10],
    [-10, 0, 5, 5, 5, 5, 0,-10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0,-10],
    [-10, 0, 5, 0, 0, 0, 0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20]
  ]
};

// ---- Main Game Class ----

class ChessGame {
  constructor() {
    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');
    this.aiThinkingEl = document.getElementById('aiThinking');
    this.newGameBtn = document.getElementById('newGameBtn');
    this.whiteInfo = document.getElementById('whiteInfo');
    this.blackInfo = document.getElementById('blackInfo');
    this.promotionOverlay = document.getElementById('promotionOverlay');
    this.promotionDialog = document.getElementById('promotionDialog');
    
    this.BOARD_SIZE = 480;
    this.canvas.width = this.BOARD_SIZE;
    this.canvas.height = this.BOARD_SIZE;
    this.sq = this.BOARD_SIZE / 8;
    
    this.aiPlayer = PIECES.BLACK;
    this.humanPlayer = PIECES.WHITE;
    this.aiThinking = false;
    
    this.animations = [];
    this.hoverSquare = null;
    
    this.reset();
    this.setupEvents();
    this.handleResize();
    this.render();
    
    window.addEventListener('resize', () => this.handleResize());
  }
  
  reset() {
    this.board = this.createInitialBoard();
    this.turn = PIECES.WHITE;
    this.selected = null;
    this.validMoves = [];
    this.gameOver = false;
    this.gameResult = '';
    this.moveHistory = [];
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassantTarget = null;
    this.kingPositions = {
      w: { row: 7, col: 4 },
      b: { row: 0, col: 4 }
    };
    this.lastMove = null;
    this.inCheck = false;
    this.promotionPending = null;
    this.animations = [];
    this.aiThinking = false;
    this.newGameBtn.style.display = 'none';
    this.aiThinkingEl.textContent = '';
    
    this.render();
    this.updateStatus();
    this.updatePlayerInfo();
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
  
  handleResize() {
    const parent = this.canvas.parentElement;
    const maxWidth = Math.min(window.innerWidth - 24, 480);
    this.canvas.style.width = maxWidth + 'px';
    this.canvas.style.height = maxWidth + 'px';
  }
  
  setupEvents() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => {
      const sq = this.getSquareFromEvent(e);
      this.hoverSquare = sq;
      this.render();
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverSquare = null;
      this.render();
    });
    
    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('click', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    }, { passive: false });
    
    this.newGameBtn.addEventListener('click', () => {
      this.reset();
    });
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
    if (this.gameOver || this.promotionPending || this.aiThinking) return;
    if (this.turn !== this.humanPlayer) return;
    
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
          if (this.castlingRights[color === PIECES.WHITE ? 'wK' : 'bK']) {
            const rook = this.board[row][7];
            if (rook && rook.type === PIECES.ROOK && rook.color === color) {
              if (!this.board[row][5] && !this.board[row][6]) {
                if (!this.isSquareAttacked(row, 4, color) && 
                    !this.isSquareAttacked(row, 5, color) && 
                    !this.isSquareAttacked(row, 6, color)) {
                  moves.push({ row, col: 6, special: 'castle-kingside' });
                }
              }
            }
          }
          if (this.castlingRights[color === PIECES.WHITE ? 'wQ' : 'bQ']) {
            const rook = this.board[row][0];
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
  
  getLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];
    const pseudoMoves = this.getPseudoLegalMoves(row, col);
    return pseudoMoves.filter(move => {
      const boardCopy = this.cloneBoard(this.board);
      let kingPos = { ...this.kingPositions[piece.color] };
      
      boardCopy[move.row][move.col] = boardCopy[row][col];
      boardCopy[row][col] = null;
      
      if (move.special === 'enpassant') {
        boardCopy[row][move.col] = null;
      }
      if (move.special === 'castle-kingside') {
        boardCopy[move.row][5] = boardCopy[move.row][7];
        boardCopy[move.row][7] = null;
      } else if (move.special === 'castle-queenside') {
        boardCopy[move.row][3] = boardCopy[move.row][0];
        boardCopy[move.row][0] = null;
      }
      if (piece.type === PIECES.KING) {
        kingPos = { row: move.row, col: move.col };
      }
      
      return !this.isKingInCheckOnBoard(boardCopy, kingPos, piece.color);
    });
  }
  
  isSquareAttacked(row, col, color) {
    const opponent = color === PIECES.WHITE ? PIECES.BLACK : PIECES.WHITE;
    const board = this.board;
    
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r = row + dr, c = col + dc;
      if (this.inBounds(r, c) && board[r][c] && board[r][c].type === PIECES.KNIGHT && board[r][c].color === opponent)
        return true;
    }
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
      const r = row + dr, c = col + dc;
      if (this.inBounds(r, c) && board[r][c] && board[r][c].type === PIECES.KING && board[r][c].color === opponent)
        return true;
    }
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
    
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r = row + dr, c = col + dc;
      if (this.inBounds(r, c) && board[r][c] && board[r][c].type === PIECES.KNIGHT && board[r][c].color === opponent)
        return true;
    }
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
      const r = row + dr, c = col + dc;
      if (this.inBounds(r, c) && board[r][c] && board[r][c].type === PIECES.KING && board[r][c].color === opponent)
        return true;
    }
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
    
    let capturePiece = captured;
    if (isEnPassant) {
      capturePiece = this.board[fromRow][toCol];
    }
    
    // Record last move for animations
    this.lastMove = { fromRow, fromCol, toRow, toCol };
    
    // Save state for undo/en passant tracking
    this.moveHistory.push({
      fromRow, fromCol, toRow, toCol,
      piece: { ...piece },
      captured: capturePiece ? { ...capturePiece } : null,
      special,
      enPassantTarget: this.enPassantTarget,
      castlingRights: { ...this.castlingRights }
    });
    
    // Execute
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;
    
    if (isEnPassant) {
      this.board[fromRow][toCol] = null;
    }
    
    if (isCastling) {
      if (special === 'castle-kingside') {
        this.board[toRow][5] = this.board[toRow][7];
        this.board[toRow][7] = null;
      } else {
        this.board[toRow][3] = this.board[toRow][0];
        this.board[toRow][0] = null;
      }
    }
    
    if (piece.type === PIECES.KING) {
      this.kingPositions[piece.color] = { row: toRow, col: toCol };
    }
    
    // Update castling rights
    if (piece.type === PIECES.KING) {
      if (piece.color === PIECES.WHITE) { this.castlingRights.wK = false; this.castlingRights.wQ = false; }
      else { this.castlingRights.bK = false; this.castlingRights.bQ = false; }
    }
    if (piece.type === PIECES.ROOK) {
      if (fromRow === 7 && fromCol === 0) this.castlingRights.wQ = false;
      if (fromRow === 7 && fromCol === 7) this.castlingRights.wK = false;
      if (fromRow === 0 && fromCol === 0) this.castlingRights.bQ = false;
      if (fromRow === 0 && fromCol === 7) this.castlingRights.bK = false;
    }
    if (toRow === 7 && toCol === 0) this.castlingRights.wQ = false;
    if (toRow === 7 && toCol === 7) this.castlingRights.wK = false;
    if (toRow === 0 && toCol === 0) this.castlingRights.bQ = false;
    if (toRow === 0 && toCol === 7) this.castlingRights.bK = false;
    
    this.enPassantTarget = null;
    if (isDoublePawn) {
      this.enPassantTarget = { row: (fromRow + toRow) / 2, col: fromCol };
    }
    
    // Pawn promotion
    if (piece.type === PIECES.PAWN && (toRow === 0 || toRow === 7)) {
      this.promotionPending = { row: toRow, col: toCol, color: piece.color };
      if (piece.color === this.humanPlayer) {
        this.showPromotionDialog(piece.color);
      } else {
        // Auto-promote AI pawn to queen
        this.promotePawn(toRow, toCol, PIECES.QUEEN);
      }
      return;
    }
    
    this.finishTurn();
  }
  
  finishTurn() {
    this.turn = this.turn === PIECES.WHITE ? PIECES.BLACK : PIECES.WHITE;
    this.checkGameState();
    this.selected = null;
    this.validMoves = [];
    this.render();
    this.updateStatus();
    this.updatePlayerInfo();
    
    // Trigger AI move if it's AI's turn
    if (!this.gameOver && this.turn === this.aiPlayer) {
      this.scheduleAIMove();
    }
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
      btn.textContent = UNICODE[color + type];
      btn.addEventListener('click', () => self.promotePawn(row, col, type));
      dialog.appendChild(btn);
    });
    
    this.promotionOverlay.style.display = 'flex';
  }
  
  // ---- Game State Checks ----
  
  checkGameState() {
    const hasLegalMove = this.hasAnyLegalMove(this.turn);
    const kingPos = this.kingPositions[this.turn];
    this.inCheck = this.isSquareAttacked(kingPos.row, kingPos.col, this.turn);
    
    if (!hasLegalMove) {
      this.gameOver = true;
      if (this.inCheck) {
        const winner = this.turn === PIECES.WHITE ? 'Black' : 'White';
        this.gameResult = `Checkmate! ${winner} wins! ♛`;
      } else {
        this.gameResult = 'Stalemate! Draw! 🤝';
      }
    } else if (this.isInsufficientMaterial()) {
      this.gameOver = true;
      this.gameResult = 'Draw — Insufficient material! 🤝';
    }
    
    if (this.gameOver) {
      this.newGameBtn.style.display = 'inline-block';
    }
  }
  
  hasAnyLegalMove(color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === color) {
          if (this.getLegalMoves(row, col).length > 0) return true;
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
    if (all.length === 2) return true;
    if (all.length === 3) {
      const minors = all.filter(t => t === PIECES.BISHOP || t === PIECES.KNIGHT);
      if (minors.length === 1) return true;
    }
    if (all.length === 4) {
      const bishops = all.filter(t => t === PIECES.BISHOP);
      if (bishops.length === 2) {
        const positions = [];
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            const p = this.board[row][col];
            if (p && p.type === PIECES.BISHOP) positions.push({ row, col });
          }
        }
        if (positions.length === 2 && 
            (positions[0].row + positions[0].col) % 2 === (positions[1].row + positions[1].col) % 2)
          return true;
      }
    }
    return false;
  }
  
  updateStatus() {
    if (this.gameOver) {
      this.statusEl.textContent = this.gameResult;
      return;
    }
    const turnName = this.turn === PIECES.WHITE ? 'Your' : 'AI\'s';
    let status = `${turnName} turn`;
    if (this.inCheck) status += ' — Check!';
    this.statusEl.textContent = status;
  }
  
  updatePlayerInfo() {
    this.whiteInfo.classList.toggle('active', this.turn === PIECES.WHITE && !this.gameOver);
    this.blackInfo.classList.toggle('active', this.turn === PIECES.BLACK && !this.gameOver);
  }
  
  // ---- AI Implementation ----
  
  scheduleAIMove() {
    this.aiThinking = true;
    this.aiThinkingEl.textContent = 'AI is thinking...';
    this.render();
    
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const result = this.findBestMove(3); // Search depth 3
      if (result) {
        this.aiThinking = false;
        this.aiThinkingEl.textContent = '';
        this.executeMove(result.fromRow, result.fromCol, result.toRow, result.toCol, result.special);
      }
    }, 50);
  }
  
  findBestMove(maxDepth) {
    const color = this.aiPlayer;
    let bestMove = null;
    let bestScore = -Infinity;
    
    const moves = this.getAllLegalMoves(color);
    
    // Order moves for better pruning
    const orderedMoves = this.orderMoves(moves);
    
    for (const move of orderedMoves) {
      const score = -this.alphaBeta(
        this.makeMoveOnBoard(move),
        0, maxDepth - 1,
        -Infinity, -bestScore,
        color === PIECES.WHITE ? PIECES.BLACK : PIECES.WHITE
      );
      
      this.undoMoveOnBoard(move);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  alphaBeta(board, depth, maxDepth, alpha, beta, color) {
    if (depth >= maxDepth) {
      return this.evaluateBoard(board, color);
    }
    
    const moves = this.getAllLegalMovesForBoard(board, color);
    if (moves.length === 0) {
      // Checkmate or stalemate
      if (this.isKingInCheckOnBoard(board, this.findKing(board, color), color)) {
        return -100000 + depth; // Checkmate is bad (further away is better)
      }
      return 0; // Stalemate
    }
    
    const orderedMoves = this.orderMoves(moves);
    let bestScore = -Infinity;
    
    for (const move of orderedMoves) {
      const score = -this.alphaBeta(
        this.makeMoveOnBoard(move),
        depth + 1, maxDepth,
        -beta, -alpha,
        color === PIECES.WHITE ? PIECES.BLACK : PIECES.WHITE
      );
      
      this.undoMoveOnBoard(move);
      
      if (score > bestScore) bestScore = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break; // Beta cutoff
    }
    
    return bestScore;
  }
  
  // Get all legal moves for a color on current board
  getAllLegalMoves(color) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === color) {
          const pieceMoves = this.getLegalMoves(row, col);
          for (const m of pieceMoves) {
            moves.push({ fromRow: row, fromCol: col, toRow: m.row, toCol: m.col, special: m.special });
          }
        }
      }
    }
    return moves;
  }
  
  // Get all legal moves on a given board state (for AI search)
  getAllLegalMovesForBoard(board, color) {
    const moves = [];
    // Find king position
    let kingPos = null;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col] && board[row][col].color === color && board[row][col].type === PIECES.KING) {
          kingPos = { row, col };
        }
      }
    }
    if (!kingPos) return [];
    
    // We need to simulate pseudo-legal moves and filter by check
    // For efficiency, we'll generate pseudo-legal moves and test each
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === color) {
          const pseudoMoves = this.getPseudoLegalMovesForBoard(board, row, col, kingPos);
          for (const m of pseudoMoves) {
            const move = { fromRow: row, fromCol: col, toRow: m.row, toCol: m.col, special: m.special };
            // Test if move leaves king in check
            const tempBoard = this.cloneBoard(board);
            // Make move on temp board
            tempBoard[m.row][m.col] = tempBoard[row][col];
            tempBoard[row][col] = null;
            if (m.special === 'enpassant') {
              tempBoard[row][m.col] = null;
            }
            if (m.special === 'castle-kingside') {
              tempBoard[m.row][5] = tempBoard[m.row][7];
              tempBoard[m.row][7] = null;
            } else if (m.special === 'castle-queenside') {
              tempBoard[m.row][3] = tempBoard[m.row][0];
              tempBoard[m.row][0] = null;
            }
            
            let newKingPos = piece.type === PIECES.KING ? { row: m.row, col: m.col } : kingPos;
            
            if (!this.isKingInCheckOnBoard(tempBoard, newKingPos, color)) {
              moves.push(move);
            }
          }
        }
      }
    }
    return moves;
  }
  
  getPseudoLegalMovesForBoard(board, row, col, kingPos) {
    const piece = board[row][col];
    if (!piece) return [];
    const moves = [];
    const addMove = (r, c, special) => {
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const target = board[r][c];
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
        
        if (row + dir >= 0 && row + dir < 8 && !board[row + dir][col]) {
          moves.push({ row: row + dir, col, special: null });
          if (row === startRow && !board[row + 2 * dir][col]) {
            moves.push({ row: row + 2 * dir, col, special: 'double' });
          }
        }
        for (const dc of [-1, 1]) {
          const nc = col + dc;
          if (row + dir >= 0 && row + dir < 8 && nc >= 0 && nc < 8) {
            const target = board[row + dir][nc];
            if (target && target.color !== piece.color) {
              moves.push({ row: row + dir, col: nc, special: 'capture' });
            }
            // en passant - we use the game's current enPassantTarget
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
        break;
      }
    }
    return moves;
  }
  
  // Make a move on a board copy (mutates board)
  makeMoveOnBoard(move) {
    const board = this.board;
    const { fromRow, fromCol, toRow, toCol, special } = move;
    
    // Store state for undo
    move.capturedPiece = board[toRow][toCol] ? { ...board[toRow][toCol] } : null;
    move.enPassantCaptured = null;
    
    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = null;
    
    if (special === 'enpassant') {
      move.enPassantCaptured = board[fromRow][toCol] ? { ...board[fromRow][toCol] } : null;
      board[fromRow][toCol] = null;
    }
    if (special === 'castle-kingside') {
      board[toRow][5] = board[toRow][7];
      board[toRow][7] = null;
    } else if (special === 'castle-queenside') {
      board[toRow][3] = board[toRow][0];
      board[toRow][0] = null;
    }
    
    return board;
  }
  
  // Undo a move on the board
  undoMoveOnBoard(move) {
    const board = this.board;
    const { fromRow, fromCol, toRow, toCol, special, capturedPiece, enPassantCaptured } = move;
    
    const piece = board[toRow][toCol];
    board[fromRow][fromCol] = piece;
    board[toRow][toCol] = capturedPiece;
    
    if (special === 'enpassant' && enPassantCaptured) {
      board[fromRow][toCol] = enPassantCaptured;
    }
    if (special === 'castle-kingside') {
      board[toRow][7] = board[toRow][5];
      board[toRow][5] = null;
    } else if (special === 'castle-queenside') {
      board[toRow][0] = board[toRow][3];
      board[toRow][3] = null;
    }
  }
  
  findKing(board, color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col] && board[row][col].color === color && board[row][col].type === PIECES.KING) {
          return { row, col };
        }
      }
    }
    return null;
  }
  
  // Order moves for better alpha-beta pruning (captures first, then by value)
  orderMoves(moves) {
    const getMoveValue = (m) => {
      const target = this.board[m.toRow][m.toCol];
      let value = 0;
      if (target) {
        // MVV-LVA: Most Valuable Victim - Least Valuable Attacker
        value = PIECE_VALUES[target.type] * 10 - PIECE_VALUES[this.board[m.fromRow][m.fromCol].type];
      }
      if (m.special === 'enpassant') value += 300;
      if (m.special && m.special.startsWith('castle')) value += 200;
      return value;
    };
    return moves.sort((a, b) => getMoveValue(b) - getMoveValue(a));
  }
  
  // Evaluate board position from AI's perspective
  evaluateBoard(board, color) {
    let score = 0;
    const opponent = color === PIECES.WHITE ? PIECES.BLACK : PIECES.WHITE;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;
        
        const pst = PST[piece.type];
        let pstValue;
        if (piece.color === PIECES.WHITE) {
          pstValue = pst[row][col];
        } else {
          pstValue = pst[7 - row][7 - col];
        }
        
        const value = PIECE_VALUES[piece.type] + pstValue;
        
        if (piece.color === color) {
          score += value;
        } else {
          score -= value;
        }
      }
    }
    
    return score;
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
        
        // File/rank labels
        if (row === 7) {
          ctx.fillStyle = isLight ? COLORS.dark : COLORS.light;
          ctx.font = `${sq * 0.16}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText('abcdefgh'[col], col * sq + sq - 3, row * sq + sq - 2);
        }
        if (col === 0) {
          ctx.fillStyle = isLight ? COLORS.dark : COLORS.light;
          ctx.font = `${sq * 0.16}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('87654321'[row], col * sq + 3, row * sq + 2);
        }
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
    
    // Hover effect
    if (this.hoverSquare && !this.selected && !this.gameOver) {
      const piece = this.board[this.hoverSquare.row][this.hoverSquare.col];
      if (piece && piece.color === this.turn && this.turn === this.humanPlayer) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(this.hoverSquare.col * sq, this.hoverSquare.row * sq, sq, sq);
      }
    }
    
    // Highlight king in check
    if (this.inCheck) {
      const kingPos = this.kingPositions[this.turn];
      ctx.save();
      ctx.fillStyle = COLORS.check;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(kingPos.col * sq + sq / 2, kingPos.row * sq + sq / 2, sq / 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      // Pulse effect
      const time = Date.now() / 500;
      const pulse = Math.sin(time) * 0.15 + 0.15;
      ctx.fillStyle = COLORS.check;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(kingPos.col * sq + sq / 2, kingPos.row * sq + sq / 2, sq / 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
    
    // Highlight valid moves
    for (const move of this.validMoves) {
      const target = this.board[move.row][move.col];
      ctx.fillStyle = COLORS.highlight;
      if (target) {
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
    
    // Draw pieces with shadow
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece) {
          const key = piece.color + piece.type;
          const unicode = UNICODE[key];
          ctx.save();
          ctx.font = `${sq * 0.8}px 'Segoe UI', 'Arial Unicode MS', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Shadow
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          if (piece.color === PIECES.WHITE) {
            ctx.fillStyle = '#ffffff';
          } else {
            ctx.fillStyle = '#1a1a1a';
          }
          ctx.fillText(unicode, col * sq + sq / 2, row * sq + sq / 2 + 1);
          ctx.restore();
        }
      }
    }
    
    // AI thinking indicator
    if (this.aiThinking) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, this.BOARD_SIZE, this.BOARD_SIZE);
      ctx.fillStyle = '#f0d9b5';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AI is thinking...', this.BOARD_SIZE / 2, this.BOARD_SIZE / 2);
    }
    
    // Request animation frame for pulsing effects
    if (this.inCheck && !this.gameOver) {
      requestAnimationFrame(() => this.render());
    }
  }
}

// Start game
const game = new ChessGame();
