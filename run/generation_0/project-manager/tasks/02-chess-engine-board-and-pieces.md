# Task 02: Chess Engine - Board & Pieces

## Description
Implement the core board representation, piece definitions, and basic move generation (without special moves).

## Definition of Done
- Board is an 8×8 array of {type, color} or null
- `createInitialBoard()` sets up starting position
- `getPieceMoves(board, row, col)` returns array of {row, col} legal moves for each piece type
  - Pawn: forward 1 (2 from start), diagonal capture
  - Knight: L-shapes
  - Bishop: diagonals
  - Rook: straights
  - Queen: diagonals + straights
  - King: 1 square any direction
- Collision detection (pieces block movement)
- `isInCheck(board, color)` correctly identifies check
- Unit-testable via console
