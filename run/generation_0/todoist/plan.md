# Chess Game Implementation Plan

## Project Setup
- [ ] Create `package.json` with dev server (Vite)
- [ ] Create `index.html` entry point
- [ ] Create directory structure

## Chess Engine (Model)
- [ ] Create `src/board.js` - Board representation (8x8 array), piece types, colors
- [ ] Create `src/game.js` - Game state, turn management, move validation
- [ ] Implement piece movement rules for all pieces (pawn, rook, knight, bishop, queen, king)
- [ ] Implement collision detection (blocking pieces)
- [ ] Implement castling (king/rook unmoved, path clear, not through check)
- [ ] Implement en passant (track previous move)
- [ ] Implement pawn promotion (UI overlay)
- [ ] Implement check/checkmate/stalemate detection
- [ ] Implement insufficient material draw

## UI & Canvas Rendering (View & Controller)
- [ ] Create `src/renderer.js` - Canvas rendering (board, pieces, highlights)
- [ ] Create `src/input.js` - Click handling, piece selection, move execution
- [ ] Implement responsive canvas sizing
- [ ] Implement animations for piece movement
- [ ] Implement promotion UI overlay

## AI Opponent
- [ ] Create `src/ai.js` - Minimax with Alpha-Beta pruning
- [ ] Implement evaluation function (material, position, mobility)
- [ ] Ensure AI responds within 250ms (iterative deepening or depth limit)
- [ ] Integrate AI as Black player

## Integration & Testing
- [ ] Wire everything together in `main.js`
- [ ] Test all game rules
- [ ] Verify `npm run dev` works
