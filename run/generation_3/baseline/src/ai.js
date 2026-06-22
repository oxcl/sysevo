// AI Engine - Minimax with Alpha-Beta Pruning
export class ChessAI {
  constructor(depth = 4) {
    this.maxDepth = depth;
    this.nodesEvaluated = 0;
    this.pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    this.pieceSquareTables = this.initPieceSquareTables();
  }

  initPieceSquareTables() {
    return {
      p: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0]
      ],
      n: [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 0, 0, 0, -20, -40],
        [-30, 0, 10, 15, 15, 10, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 15, 20, 20, 15, 0, -30],
        [-30, 5, 10, 15, 15, 10, 5, -30],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50]
      ],
      b: [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 5, 5, 10, 10, 5, 5, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 10, 10, 10, 10, 10, 10, -10],
        [-10, 5, 0, 0, 0, 0, 5, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20]
      ],
      r: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [5, 10, 10, 10, 10, 10, 10, 5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [0, 0, 0, 5, 5, 0, 0, 0]
      ],
      q: [
        [-20, -10, -10, -5, -5, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 5, 5, 5, 0, -10],
        [-5, 0, 5, 5, 5, 5, 0, -5],
        [0, 0, 5, 5, 5, 5, 0, -5],
        [-10, 5, 5, 5, 5, 5, 0, -10],
        [-10, 0, 5, 0, 0, 0, 0, -10],
        [-20, -10, -10, -5, -5, -10, -10, -20]
      ],
      k: [
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [20, 30, 10, 0, 0, 10, 30, 20]
      ]
    };
  }

  evaluate(engine) {
    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = engine.getPiece(row, col);
        if (piece) {
          const value = this.pieceValues[piece.type];
          const table = this.pieceSquareTables[piece.type];
          const posValue = piece.color === 'w' ? table[row][col] : table[7 - row][col];
          score += (piece.color === 'w' ? 1 : -1) * (value + posValue);
        }
      }
    }
    return score;
  }

  minimax(engine, depth, alpha, beta, maximizing) {
    this.nodesEvaluated++;
    if (depth === 0 || engine.gameOver) {
      return this.evaluate(engine);
    }

    const color = maximizing ? 'w' : 'b';
    const moves = engine.generateLegalMoves(color);

    if (moves.length === 0) {
      return maximizing ? -100000 + (this.maxDepth - depth) : 100000 - (this.maxDepth - depth);
    }

    if (maximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const cloned = engine.clone();
        cloned.makeMove(move);
        const eval_ = this.minimax(cloned, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, eval_);
        alpha = Math.max(alpha, eval_);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const cloned = engine.clone();
        cloned.makeMove(move);
        const eval_ = this.minimax(cloned, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, eval_);
        beta = Math.min(beta, eval_);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  findBestMove(engine) {
    this.nodesEvaluated = 0;
    const moves = engine.generateLegalMoves(engine.turn);
    if (moves.length === 0) return null;

    let bestMove = moves[0];
    let bestEval = engine.turn === 'w' ? -Infinity : Infinity;

    for (const move of moves) {
      const cloned = engine.clone();
      cloned.makeMove(move);
      const eval_ = this.minimax(cloned, this.maxDepth - 1, -Infinity, Infinity, engine.turn === 'b');
      
      if (engine.turn === 'w') {
        if (eval_ > bestEval) {
          bestEval = eval_;
          bestMove = move;
        }
      } else {
        if (eval_ < bestEval) {
          bestEval = eval_;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }
}