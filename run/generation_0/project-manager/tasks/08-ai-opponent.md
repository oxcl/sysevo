# Task 08: AI Opponent (Minimax + Alpha-Beta Pruning)

## Description
Implement the AI opponent that plays as Black using Minimax with Alpha-Beta pruning.

## Definition of Done
- AI module exports `getBestMove(board, color)` which returns the best move found within time limit
- Uses minimax with alpha-beta pruning
- Depth-limited search (depth 3-4 as starting point)
- Move ordering: captures first (MVV-LVA), then non-captures
- Piece-square tables for evaluation
- Material evaluation (P=100, N=320, B=330, R=500, Q=900, K=20000)
- Positional evaluation using piece-square tables
- Always responds within 250ms (time-managed iterative deepening or fixed depth)
- Plays rational, competitive chess
