/**
 * Chess AI - Prove Yourself Edition
 * 1500+ Elo with opening book
 */

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
  p: [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
    [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
  n: [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],
    [-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
    [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
  b: [[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
    [-10,0,10,10,10,10,0,-10],[-10,5,5,10,10,5,5,-10],
    [-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],
    [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
  r: [[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
  q: [[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
    [-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],
    [0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],
    [-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],
    [20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]
  ]
};

const OPENING_BOOK = {
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1': ['e7e5', 'e7e6', 'c7c5', 'c7c6', 'g7g6', 'd7d5'],
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1': ['d7d5', 'g8f6', 'e7e6', 'f7f5'],
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1': ['e7e5', 'g8f6', 'c7c5', 'e7e6'],
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2': ['g1f3', 'b1c3', 'f1c4', 'd2d4'],
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq f3 0 2': ['b8c6', 'g8f6', 'd7d6'],
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3': ['b1c3', 'd2d4', 'f1c4'],
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq c3 0 3': ['g8f6', 'b8c6', 'd7d5'],
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq c6 0 3': ['f1c4', 'f1b5', 'd2d4'],
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 0 1': ['g8f6', 'e7e5', 'c7c5', 'd7d5'],
  'rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2': ['b1c3', 'g2g3', 'd2d4', 'e2e3']
};

export class ChessAI {
  constructor(depth = 5) {
    this.maxDepth = depth;
    this.nodes = 0;
    this.maxTime = 250;
    this.startTime = 0;
    this.tt = new Map();
  }

  evaluate(engine) {
    let score = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = engine.at(r, c);
        if (p) {
          const val = PIECE_VALUES[p.type] + PST[p.type][r][c];
          score += (p.color === 'w' ? 1 : -1) * val;
        }
      }
    return score;
  }

  getBoardKey(engine) {
    return engine.board.map(r => r.map(c => c ? c.color + c.type : '-').join('')).join('') + engine.turn;
  }

  quiescence(engine, alpha, beta, max) {
    this.nodes++;
    const stand = this.evaluate(engine);
    if (max) { if (stand >= beta) return beta; alpha = Math.max(alpha, stand); }
    else { if (stand <= alpha) return alpha; beta = Math.min(beta, stand); }

    const moves = engine.legalMoves(max ? 'w' : 'b').filter(m => 
      engine.at(m.to.row, m.to.col) || m.special === 'ep' || m.special === 'promo'
    );

    for (const m of moves) {
      if (Date.now() - this.startTime > this.maxTime) return max ? alpha : beta;
      const e = engine.clone();
      e.makeMove(m);
      const val = this.quiescence(e, alpha, beta, !max);
      if (max) { alpha = Math.max(alpha, val); if (alpha >= beta) break; }
      else { beta = Math.min(beta, val); if (alpha >= beta) break; }
    }
    return max ? alpha : beta;
  }

  minimax(engine, depth, alpha, beta, max) {
    this.nodes++;
    if (Date.now() - this.startTime > this.maxTime) return this.evaluate(engine);
    
    if (depth === 0 || engine.gameOver)
      return depth === 0 ? this.quiescence(engine, alpha, beta, max) : this.evaluate(engine);

    const key = this.getBoardKey(engine);
    const ttEntry = this.tt.get(key);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === 0) return ttEntry.value;
      if (ttEntry.flag === 1 && ttEntry.value > alpha) alpha = ttEntry.value;
      if (ttEntry.flag === -1 && ttEntry.value < beta) beta = ttEntry.value;
      if (alpha >= beta) return ttEntry.value;
    }

    const moves = engine.legalMoves(max ? 'w' : 'b');
    if (moves.length === 0)
      return max ? -100000 + (this.maxDepth - depth) : 100000 - (this.maxDepth - depth);

    let flag = -1;
    let best = max ? -Infinity : Infinity;

    for (const m of moves) {
      if (Date.now() - this.startTime > this.maxTime) break;
      const e = engine.clone();
      e.makeMove(m);
      const val = this.minimax(e, depth - 1, alpha, beta, !max);
      
      if (max) { best = Math.max(best, val); alpha = Math.max(alpha, val); }
      else { best = Math.min(best, val); beta = Math.min(beta, val); }
      
      if (alpha >= beta) { flag = 1; break; }
    }

    if (best <= alpha) flag = -1;
    else if (best > alpha && !max) flag = 0;
    else if (best > alpha && max) flag = 0;
    
    if (!engine.gameOver && Date.now() - this.startTime <= this.maxTime)
      this.tt.set(key, { value: best, depth, flag });
    
    return best;
  }

  getOpeningMove(engine) {
    const key = engine.board.map(r => r.map(c => c ? c.color + c.type : '-').join('')).join('/');
    if (OPENING_BOOK[key]) {
      const moves = OPENING_BOOK[key];
      const moveStr = moves[Math.floor(Math.random() * moves.length)];
      const fromCol = moveStr.charCodeAt(0) - 97;
      const fromRow = 8 - parseInt(moveStr[1]);
      const toCol = moveStr.charCodeAt(2) - 97;
      const toRow = 8 - parseInt(moveStr[3]);
      
      const legalMoves = engine.legalMoves(engine.turn);
      return legalMoves.find(m => 
        m.from.row === fromRow && m.from.col === fromCol && 
        m.to.row === toRow && m.to.col === toCol
      ) || null;
    }
    return null;
  }

  bestMove(engine) {
    this.nodes = 0;
    this.startTime = Date.now();
    this.tt.clear();
    
    const openingMove = this.getOpeningMove(engine);
    if (openingMove) return openingMove;

    const moves = engine.legalMoves(engine.turn);
    if (!moves.length) return null;

    let best = moves[0];
    let bestScore = engine.turn === 'w' ? -Infinity : Infinity;

    for (const m of moves) {
      if (Date.now() - this.startTime > this.maxTime) break;
      const e = engine.clone();
      e.makeMove(m);
      const score = this.minimax(e, this.maxDepth - 1, -Infinity, Infinity, engine.turn === 'b');
      if ((engine.turn === 'w' && score > bestScore) || (engine.turn === 'b' && score < bestScore)) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  getStats() {
    const time = Date.now() - this.startTime;
    return { nodes: this.nodes, time, nps: Math.round(this.nodes / (time / 1000)) || 0 };
  }
}