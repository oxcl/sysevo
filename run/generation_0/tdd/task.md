Your task is to write a production-ready, fully functional Chess game using vanilla JavaScript (ES6+) and the HTML5 Canvas API. 

the project must not rely on external libraries or assets.

### 1. Chess Engine & Rules (The Model)
- Implement full standard chess rules: piece movements, turn switching, and collision detection.
- Implement special moves: 
  - Castling (including validation of unmoved king/rook and castling through check).
  - En Passant (requires tracking the previous move's history).
  - Pawn Promotion (provide a basic UI overlay on the canvas to select Queen, Rook, Bishop, or Knight).
- Implement win/loss/draw conditions: Check, Checkmate, Stalemate, and Draw by insufficient material.

### 3. UI & Canvas Rendering (The View & Controller)
- **Visuals:** Render a clean, modern 8x8 grid. Use nice colors for light/dark squares, highlight the currently selected square, and highlight valid destination squares for the selected piece.
- **Pieces:** You may render pieces using high-quality Unicode chess symbols text-aligned to the canvas cells, or procedurally draw shapes. 
- **Interactions:** Implement smooth mouse/touch click-and-drag or click-to-move mechanics utilizing canvas bounding boxes.
- **Responsiveness:** Ensure the canvas scales appropriately or maintains a crisp, fixed aspect ratio.
- **Animations and Transitions:** implement beautiful transitions and animations

### 4. AI Opponent Implementation
- Implement an AI opponent playing as Black.
- **Algorithm:** Use the Minimax algorithm with Alpha-Beta Pruning. the algoritm must be as strong and as efficient as you can make it but it must always respond with a move in less than 250ms

### 5. Deliverable
Provide the complete, working implementation. The game must be completely playable from start to finish immediately upon running the code.

- runnable with npm run dev