# Task 03: Chess Engine - Special Moves

## Description
Implement castling, en passant, and pawn promotion in the engine.

## Definition of Done
- Castling: Can castle king-side and queen-side when king/rook haven't moved, no pieces between, king not in check and doesn't pass through check
- En passant: Tracks last move's double pawn push; allows en passant capture on the next move only
- Pawn promotion: `getPromotionMoves()` returns promotion options; engine tracks that promotion is needed
- `makeMove(board, from, to, special?)` returns new board state with all special moves handled
