// Chess - Prototype 1: Basic board with pieces, click-to-select, click-to-move
// All standard piece movements with collision detection

const PIECES = {
  KING: 'k', QUEEN: 'q', ROOK: 'r', BISHOP: 'b', KNIGHT: 'n', PAWN: 'p',
  WHITE: 'w', BLACK: 'b'
};

const UNICODE_PIECES = {
  'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
  'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
};

class ChessGame {
  constructor() {
    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');
    
    this.size = 480;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.squareSize = this.size / 8;
    
    this.board = this.createInitialBoard();
    this.turn = PIECES.WHITE;
    this.selected = null;
    this.validMoves = [];
    this.gameOver = false;
    
    this.colors = {
      light: '#f0d9b5',
      dark: '#b58863',
      selected: '#829769',
      highlight: '#aad751',
      lastMove: '#d4c685'
    };
    
    this.setupEvents();
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
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
  }
  
  getSquareFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / this.squareSize);
    const row = Math.floor(y / this.squareSize);
    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
      return { row, col };
    }
    return null;
  }
  
  handleClick(e) {
    if (this.gameOver) return;
    const sq = this.getSquareFromEvent(e);
    if (!sq) return;
    
    const piece = this.board[sq.row][sq.col];
    
    // If a piece is already selected
    if (this.selected) {
      // Check if clicking on a valid move target
      const moveIndex = this.validMoves.findIndex(m => m.row === sq.row && m.col === sq.col);
      if (moveIndex !== -1) {
        // Make the move
        this.makeMove(this.selected.row, this.selected.col, sq.row, sq.col);
        this.selected = null;
        this.validMoves = [];
        return;
      }
      
      // If clicking on own piece, select it instead
      if (piece && piece.color === this.turn) {
        this.selected = sq;
        this.validMoves = this.getValidMoves(sq.row, sq.col);
        this.render();
        return;
      }
      
      // Deselect
      this.selected = null;
      this.validMoves = [];
      this.render();
      return;
    }
    
    // Select a piece
    if (piece && piece.color === this.turn) {
      this.selected = sq;
      this.validMoves = this.getValidMoves(sq.row, sq.col);
      this.render();
    }
  }
  
  handleMouseMove(e) {
    // Could add hover effects later
  }
  
  makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;
    
    // Switch turns
    this.turn = this.turn === PIECES.WHITE ? PIECES.BLACK : PIECES.WHITE;
    
    this.render();
    this.updateStatus();
  }
  
  // Get all valid moves for a piece (pseudo-legal, respects collision)
  getValidMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];
    
    const moves = [];
    const addMove = (r, c) => {
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const target = this.board[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ row: r, col: c });
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
        
        // Forward one
        if (this.inBounds(row + dir, col) && !this.board[row + dir][col]) {
          moves.push({ row: row + dir, col });
          // Forward two from start
          if (row === startRow && !this.board[row + 2 * dir][col]) {
            moves.push({ row: row + 2 * dir, col });
          }
        }
        // Captures
        for (const dc of [-1, 1]) {
          const nc = col + dc;
          if (this.inBounds(row + dir, nc)) {
            const target = this.board[row + dir][nc];
            if (target && target.color !== piece.color) {
              moves.push({ row: row + dir, col: nc });
            }
          }
        }
        break;
      }
      case PIECES.KNIGHT: {
        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of knightMoves) {
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
  
  inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }
  
  render() {
    const ctx = this.ctx;
    const sq = this.squareSize;
    
    // Draw board
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        ctx.fillStyle = isLight ? this.colors.light : this.colors.dark;
        ctx.fillRect(col * sq, row * sq, sq, sq);
      }
    }
    
    // Highlight selected square
    if (this.selected) {
      ctx.fillStyle = this.colors.selected;
      ctx.fillRect(this.selected.col * sq, this.selected.row * sq, sq, sq);
    }
    
    // Highlight valid moves
    for (const move of this.validMoves) {
      ctx.fillStyle = this.colors.highlight;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(move.col * sq + sq / 2, move.row * sq + sq / 2, sq / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    
    // Draw pieces
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece) {
          const key = piece.color + piece.type;
          const unicode = UNICODE_PIECES[key];
          ctx.font = `${sq * 0.8}px 'Segoe UI', 'Arial Unicode MS', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = piece.color === PIECES.WHITE ? '#ffffff' : '#000000';
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 3;
          ctx.fillText(unicode, col * sq + sq / 2, row * sq + sq / 2);
          ctx.shadowBlur = 0;
        }
      }
    }
  }
  
  updateStatus() {
    if (this.gameOver) {
      this.statusEl.textContent = 'Game Over';
    } else {
      this.statusEl.textContent = (this.turn === PIECES.WHITE ? 'White' : 'Black') + "'s turn";
    }
  }
}

// Start game
const game = new ChessGame();
