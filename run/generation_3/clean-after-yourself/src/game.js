/**
 * Chess Game Module
 * Handles Canvas rendering and user interaction
 * @module ChessGame
 */

import { ChessEngine } from './chess.js';
import { ChessAI } from './ai.js';

/** Game configuration constants */
const GAME_CONFIG = Object.freeze({
  SQUARE_SIZE: 80,
  LIGHT_SQUARE_COLOR: '#f0d9b5',
  DARK_SQUARE_COLOR: '#b58863',
  SELECTED_SQUARE_COLOR: 'rgba(255, 255, 0, 0.5)',
  LEGAL_MOVE_COLOR: 'rgba(0, 128, 0, 0.4)',
  LAST_MOVE_COLOR: 'rgba(155, 199, 0, 0.4)',
  CHECK_COLOR: 'rgba(255, 0, 0, 0.5)',
  AI_THINKING_DELAY_MS: 100
});

/** Chess piece Unicode symbols */
const PIECE_SYMBOLS = Object.freeze({
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟'
});

export class ChessGame {
  constructor() {
    this.canvas = document.getElementById('board');
    this.context = this.canvas.getContext('2d');
    this.statusElement = document.getElementById('status');
    
    this.configureCanvas();
    this.engine = new ChessEngine();
    this.ai = new ChessAI();
    
    this.selectedSquare = null;
    this.legalMovesForSelectedPiece = [];
    this.lastMoveHighlight = null;
    this.isAIThinking = false;
    
    this.initializeEventListeners();
    this.render();
    this.updateGameStatus();
  }

  configureCanvas() {
    this.canvas.width = GAME_CONFIG.SQUARE_SIZE * 8;
    this.canvas.height = GAME_CONFIG.SQUARE_SIZE * 8;
  }

  initializeEventListeners() {
    this.canvas.addEventListener('click', (event) => this.handleCanvasClick(event));
  }

  convertMousePositionToSquare(event) {
    const canvasRectangle = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - canvasRectangle.left;
    const mouseY = event.clientY - canvasRectangle.top;
    
    return {
      row: Math.floor(mouseY / GAME_CONFIG.SQUARE_SIZE),
      col: Math.floor(mouseX / GAME_CONFIG.SQUARE_SIZE)
    };
  }

  handleCanvasClick(event) {
    if (this.isAIThinking || this.engine.isGameOver || this.engine.currentTurn !== 'w') {
      return;
    }

    const clickedSquare = this.convertMousePositionToSquare(event);
    const pieceAtClickedSquare = this.engine.getPieceAt(clickedSquare.row, clickedSquare.col);

    if (this.selectedSquare) {
      const matchingMove = this.legalMovesForSelectedPiece.find(
        move => move.to.row === clickedSquare.row && move.to.col === clickedSquare.col
      );

      if (matchingMove) {
        this.executeMove(matchingMove);
        return;
      }

      if (pieceAtClickedSquare && pieceAtClickedSquare.color === 'w') {
        this.selectSquare(clickedSquare);
      } else {
        this.clearSelection();
        this.render();
      }
    } else if (pieceAtClickedSquare && pieceAtClickedSquare.color === 'w') {
      this.selectSquare(clickedSquare);
    }
  }

  selectSquare(square) {
    this.selectedSquare = square;
    this.legalMovesForSelectedPiece = this.engine.generateAllLegalMoves('w').filter(
      move => move.from.row === square.row && move.from.col === square.col
    );
    this.render();
  }

  clearSelection() {
    this.selectedSquare = null;
    this.legalMovesForSelectedPiece = [];
  }

  executeMove(move) {
    this.lastMoveHighlight = { from: move.from, to: move.to };
    this.engine.makeMove(move);
    this.clearSelection();
    this.render();
    this.updateGameStatus();

    if (!this.engine.isGameOver) {
      setTimeout(() => this.executeAIMove(), GAME_CONFIG.AI_THINKING_DELAY_MS);
    }
  }

  executeAIMove() {
    if (this.engine.isGameOver || this.engine.currentTurn !== 'b') return;

    this.isAIThinking = true;
    this.statusElement.textContent = 'AI is thinking...';

    setTimeout(() => {
      const bestMove = this.ai.findOptimalMove(this.engine);
      if (bestMove) {
        this.lastMoveHighlight = { from: bestMove.from, to: bestMove.to };
        this.engine.makeMove(bestMove);
      }
      this.isAIThinking = false;
      this.render();
      this.updateGameStatus();
    }, 50);
  }

  updateGameStatus() {
    if (this.engine.isGameOver) {
      const resultMessages = {
        '1-0': 'White wins!',
        '0-1': 'Black wins!',
        '1/2-1/2': 'Draw!'
      };
      this.statusElement.textContent = resultMessages[this.engine.gameResult] || 'Game over';
    } else {
      const currentPlayer = this.engine.currentTurn === 'w' ? 'White' : 'Black';
      const checkStatus = this.engine.isKingInCheck(this.engine.currentTurn) ? ' (Check!)' : '';
      this.statusElement.textContent = `${currentPlayer} to move${checkStatus}`;
    }
  }

  render() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        this.renderSquare(row, col);
        this.renderHighlights(row, col);
        this.renderPiece(row, col);
        this.renderLegalMoveIndicators(row, col);
      }
    }
  }

  renderSquare(row, col) {
    const isLightSquare = (row + col) % 2 === 0;
    this.context.fillStyle = isLightSquare 
      ? GAME_CONFIG.LIGHT_SQUARE_COLOR 
      : GAME_CONFIG.DARK_SQUARE_COLOR;
    this.context.fillRect(
      col * GAME_CONFIG.SQUARE_SIZE, 
      row * GAME_CONFIG.SQUARE_SIZE, 
      GAME_CONFIG.SQUARE_SIZE, 
      GAME_CONFIG.SQUARE_SIZE
    );
  }

  renderHighlights(row, col) {
    if (this.lastMoveHighlight) {
      const isPartOfLastMove = 
        (row === this.lastMoveHighlight.from.row && col === this.lastMoveHighlight.from.col) ||
        (row === this.lastMoveHighlight.to.row && col === this.lastMoveHighlight.to.col);
      
      if (isPartOfLastMove) {
        this.context.fillStyle = GAME_CONFIG.LAST_MOVE_COLOR;
        this.context.fillRect(
          col * GAME_CONFIG.SQUARE_SIZE, 
          row * GAME_CONFIG.SQUARE_SIZE, 
          GAME_CONFIG.SQUARE_SIZE, 
          GAME_CONFIG.SQUARE_SIZE
        );
      }
    }

    if (this.selectedSquare && row === this.selectedSquare.row && col === this.selectedSquare.col) {
      this.context.fillStyle = GAME_CONFIG.SELECTED_SQUARE_COLOR;
      this.context.fillRect(
        col * GAME_CONFIG.SQUARE_SIZE, 
        row * GAME_CONFIG.SQUARE_SIZE, 
        GAME_CONFIG.SQUARE_SIZE, 
        GAME_CONFIG.SQUARE_SIZE
      );
    }

    if (this.engine.isKingInCheck(this.engine.currentTurn)) {
      const kingPosition = this.engine.locateKing(this.engine.currentTurn);
      if (kingPosition && row === kingPosition.row && col === kingPosition.col) {
        this.context.fillStyle = GAME_CONFIG.CHECK_COLOR;
        this.context.fillRect(
          col * GAME_CONFIG.SQUARE_SIZE, 
          row * GAME_CONFIG.SQUARE_SIZE, 
          GAME_CONFIG.SQUARE_SIZE, 
          GAME_CONFIG.SQUARE_SIZE
        );
      }
    }
  }

  renderPiece(row, col) {
    const piece = this.engine.getPieceAt(row, col);
    if (piece) {
      const symbolKey = piece.color + piece.type;
      const symbol = PIECE_SYMBOLS[symbolKey];
      
      this.context.font = `${GAME_CONFIG.SQUARE_SIZE * 0.8}px serif`;
      this.context.textAlign = 'center';
      this.context.textBaseline = 'middle';
      this.context.fillStyle = '#000';
      this.context.fillText(
        symbol,
        col * GAME_CONFIG.SQUARE_SIZE + GAME_CONFIG.SQUARE_SIZE / 2,
        row * GAME_CONFIG.SQUARE_SIZE + GAME_CONFIG.SQUARE_SIZE / 2
      );
    }
  }

  renderLegalMoveIndicators(row, col) {
    const isLegalMoveTarget = this.legalMovesForSelectedPiece.some(
      move => move.to.row === row && move.to.col === col
    );

    if (isLegalMoveTarget) {
      this.context.fillStyle = GAME_CONFIG.LEGAL_MOVE_COLOR;
      this.context.beginPath();
      this.context.arc(
        col * GAME_CONFIG.SQUARE_SIZE + GAME_CONFIG.SQUARE_SIZE / 2,
        row * GAME_CONFIG.SQUARE_SIZE + GAME_CONFIG.SQUARE_SIZE / 2,
        GAME_CONFIG.SQUARE_SIZE / 6,
        0,
        Math.PI * 2
      );
      this.context.fill();
    }
  }
}

new ChessGame();