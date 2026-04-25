# Task 05: Chess Engine - Move Execution & Game State

## Description
Implement the full game state management: make moves, track history, switch turns, detect game end.

## Definition of Done
- `Game` class or module with:
  - `board`, `currentTurn`, `castlingRights`, `enPassantTarget`, `moveHistory`
  - `makeMove(from, to, promotion?)` executes a move, updates all state
  - `getLegalMoves(row, col)` filters pseudo-legal moves by whether they leave own king in check
  - `getAllLegalMoves(color)` returns all legal moves for a color
  - Detects and stores game state (playing/check/checkmate/stalemate/draw)
  - `undoMove()` restores previous state (important for AI search)
