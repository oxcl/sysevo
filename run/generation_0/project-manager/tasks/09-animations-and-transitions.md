# Task 09: Animations & Transitions

## Description
Implement smooth piece movement animations and visual transitions.

## Definition of Done
- When a piece is moved, it slides smoothly from source to destination (easing function)
- Capture animation: captured piece fades out while capturing piece slides in
- Castling animation: king and rook both animate simultaneously
- En passant animation: captured pawn fades out
- Animation uses requestAnimationFrame with delta-time interpolation
- Animation completes in ~200-300ms
- During animation, clicks are ignored (locked)
