import { createInitialBoard, printBoard, getLegalMoves, getAllLegalMoves, isInCheck, COLOR } from './chess.js';

// Quick engine test
const board = createInitialBoard();
printBoard(board);

console.log('White legal moves count:', getAllLegalMoves(board, COLOR.WHITE).length);
console.log('White king in check?', isInCheck(board, COLOR.WHITE));

// Test a few piece moves
console.log('Legal moves for e2 (row 6, col 4):', getLegalMoves(board, 6, 4));
console.log('Legal moves for g1 (row 7, col 6):', getLegalMoves(board, 7, 6));

// Setup canvas placeholder
const canvas = document.getElementById('board-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 480;
canvas.height = 480;
ctx.fillStyle = '#2d2d44';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#ffffff';
ctx.font = '16px sans-serif';
ctx.textAlign = 'center';
ctx.fillText('Chess Engine Loaded ✓', canvas.width / 2, canvas.height / 2);
