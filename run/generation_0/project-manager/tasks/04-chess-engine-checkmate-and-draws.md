# Task 04: Chess Engine - Checkmate, Stalemate & Draws

## Description
Implement game-over detection: checkmate, stalemate, and insufficient material.

## Definition of Done
- `isCheckmate(board, color)` returns true if color is in check and has no legal moves
- `isStalemate(board, color)` returns true if color is not in check but has no legal moves
- `isInsufficientMaterial(board)` returns true for K vs K, K+B vs K, K+N vs K, K+B vs K+B (same color bishops)
- `getGameState(board, currentTurn)` returns 'playing', 'check', 'checkmate', 'stalemate', 'draw'
