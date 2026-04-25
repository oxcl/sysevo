# PRD: Chess Game - Vanilla JavaScript + Canvas API

## Goal
Build a production-ready, fully functional Chess game with a complete AI opponent, rendered on HTML5 Canvas, using zero external libraries or assets.

## Scope
**In scope:**
- Full chess rules engine (movement, collision, special moves)
- Check, checkmate, stalemate, insufficient material detection
- Canvas-based UI with 8×8 board, piece rendering (Unicode), highlights
- Click-to-move and drag-to-move interactions
- Responsive scaling / fixed aspect ratio
- Smooth animations for piece movement
- AI opponent (Minimax + Alpha-Beta pruning, <250ms response)
- Pawn promotion UI overlay
- npm run dev to run the project

**Out of scope:**
- Online multiplayer
- PGN export/import
- Move history log display
- Sound effects
- Engine vs engine mode

## Requirements
1. **Chess Engine (Model)**
   - 8×8 board representation
   - All standard piece movements with collision
   - Turn switching (White first)
   - Castling (king-side & queen-side, all conditions)
   - En passant capture
   - Pawn promotion with UI selector
   - Check detection
   - Checkmate & stalemate detection
   - Insufficient material draw

2. **Canvas UI (View & Controller)**
   - 8×8 grid with light/dark squares
   - Unicode chess symbols for pieces
   - Highlight selected square (colored border/glow)
   - Highlight valid destination squares (dots/rings)
   - Click-to-move (click piece, click destination)
   - Drag-to-move (mouse down on piece, drag to square)
   - Responsive canvas that scales while keeping aspect ratio
   - Smooth piece movement animations (easing)

3. **AI Opponent**
   - Plays as Black
   - Minimax with alpha-beta pruning
   - Depth-limited search with good move ordering for efficiency
   - Must return a move within 250ms

4. **Deliverable**
   - Complete code that runs with `npm run dev`
   - Fully playable game from start to finish
   - No external dependencies

## Technical Design
- **Package:** Use Vite dev server (npm package, dev dependency only) for `npm run dev`
- **Architecture:** Single HTML file or minimal modular JS files
  - `index.html` – entry point
  - `src/chess.js` – engine (board, rules, move generation)
  - `src/ai.js` – AI opponent
  - `src/ui.js` – canvas rendering & interaction
  - `src/main.js` – initialization & game loop
  - `style.css` – minimal styling

- **Board representation:** 8×8 array of piece objects {type, color} or null
- **FEN-like tracking** for castling rights, en passant target, move count
- **Animation:** requestAnimationFrame loop with interpolation
