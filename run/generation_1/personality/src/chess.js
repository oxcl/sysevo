/**
 * Chess Engine Module
 * Handles board state, legal move generation, and game rules.
 */
const WHITE = 'w';
const BLACK = 'b';
const SIZE = 8;
const EMPTY = null;

const INIT_BOARD = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR']
];

const KNIGHT_OFFSETS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_OFFSETS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const DIRECTIONS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
const PST = {
  P: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,0,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  N: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,5,10,15,15,10,5,-30,-30,0,15,20,20,15,0,-30,-30,5,15,20,20,15,5,-30,-30,0,10,15,15,10,0,-30,-30,5,5,10,10,5,5,-30,-40,-20,-30,-30,-30,-30,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  B: [-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,0,5,10,10,10,10,5,0,-5,0,10,10,10,10,0,-5,-10,0,5,10,10,10,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  R: [0,0,0,5,5,0,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,5,5,5,5,5,5,0,0,0,0,0,0,0,0,0],
  Q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,5,0,0,0,0,-10,-10,5,5,5,5,5,5,-10,0,0,5,5,5,5,0,0,-5,0,5,5,5,5,0,-5,-10,0,5,5,5,5,0,-10,-10,0,5,5,5,5,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  K: [20,30,10,0,0,10,30,20,20,20,0,0,0,0,20,20,20,-10,-20,-20,-20,-20,-10,20,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30]
};

export class ChessEngine {
  constructor() {
    this.board = [];
    this.turn = WHITE;
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epTarget = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = [];
    this.reset();
  }

  reset() {
    this.board = INIT_BOARD.map(r => [...r]);
    this.turn = WHITE;
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epTarget = null;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = [];
  }

  colorOf(p) { return p ? p[0] : null; }
  typeOf(p) { return p ? p[1] : null; }
  isOwn(p) { return this.colorOf(p) === this.turn; }
  ok(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

  findKing(color) {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (this.board[r][c] === color + 'K') return [r, c];
    return null;
  }

  isAttacked(r, c, by) {
    for (let row = 0; row < SIZE; row++)
      for (let col = 0; col < SIZE; col++) {
        const p = this.board[row][col];
        if (p && this.colorOf(p) === by && this.canAttack(row, col, r, c)) return true;
      }
    return false;
  }

  canAttack(fr, fc, tr, tc) {
    const p = this.board[fr][fc];
    if (!p) return false;
    const t = this.typeOf(p), co = this.colorOf(p);
    const dr = tr-fr, dc = tc-fc, ar = Math.abs(dr), ac = Math.abs(dc);
    if (t === 'P') return dr === (co===WHITE?-1:1) && ac === 1;
    if (t === 'N') return (ar===2&&ac===1)||(ar===1&&ac===2);
    if (t === 'B') return ar===ac&&ar>0&&this.clear(fr,fc,tr,tc);
    if (t === 'R') return (dr===0||dc===0)&&(ar+ac)>0&&this.clear(fr,fc,tr,tc);
    if (t === 'Q') return ((ar===ac&&ar>0)||((dr===0||dc===0)&&(ar+ac)>0))&&this.clear(fr,fc,tr,tc);
    if (t === 'K') return ar<=1&&ac<=1&&(ar+ac)>0;
    return false;
  }

  clear(fr, fc, tr, tc) {
    const sr=Math.sign(tr-fr), sc=Math.sign(tc-fc);
    let r=fr+sr, c=fc+sc;
    while (r!==tr||c!==tc) { if (this.board[r][c]) return false; r+=sr; c+=sc; }
    return true;
  }

  inCheck(color) {
    const k = this.findKing(color);
    return k ? this.isAttacked(k[0], k[1], color===WHITE?BLACK:WHITE) : false;
  }

  pseudo(r, c) {
    const p = this.board[r][c];
    if (!p) return [];
    const co = this.colorOf(p), t = this.typeOf(p), opp = co===WHITE?BLACK:WHITE;
    const moves = [];
    const add = (tr,tc,f={}) => { if (this.ok(tr,tc)&&(!this.board[tr][tc]||this.colorOf(this.board[tr][tc])===opp)) moves.push({from:[r,c],to:[tr,tc],...f}); };
    const slide = (dirs) => { for (const [dr,dc] of dirs) { let tr=r+dr,tc=c+dc; while(this.ok(tr,tc)) { const tg=this.board[tr][tc]; if(tg){if(this.colorOf(tg)===opp)moves.push({from:[r,c],to:[tr,tc]});break;} moves.push({from:[r,c],to:[tr,tc]}); tr+=dr;tc+=dc; } } };

    switch(t) {
      case 'P': {
        const d=co===WHITE?-1:1, sr=co===WHITE?6:1, pr=co===WHITE?0:7, f=r+d;
        if(this.ok(f,c)&&!this.board[f][c]) {
          if(f===pr){for(const pp of['Q','R','B','N'])moves.push({from:[r,c],to:[f,c],promotion:pp});}
          else{moves.push({from:[r,c],to:[f,c]});if(r===sr&&this.ok(r+2*d,c)&&!this.board[r+2*d][c])moves.push({from:[r,c],to:[r+2*d,c],doublePush:true});}
        }
        for(const dc of[-1,1]){const tr=r+d,tc=c+dc;if(!this.ok(tr,tc))continue;const tg=this.board[tr][tc];if(tg&&this.colorOf(tg)===opp){if(tr===pr){for(const pp of['Q','R','B','N'])moves.push({from:[r,c],to:[tr,tc],promotion:pp});}else{moves.push({from:[r,c],to:[tr,tc]});}}if(this.epTarget&&tr===this.epTarget[0]&&tc===this.epTarget[1])moves.push({from:[r,c],to:[tr,tc],enPassant:true});}
        break;
      }
      case 'N': for(const[dr,dc]of KNIGHT_OFFSETS)add(r+dr,c+dc); break;
      case 'B': slide(DIRECTIONS.filter(([dr,dc])=>dr*dc!==0)); break;
      case 'R': slide(DIRECTIONS.filter(([dr,dc])=>dr===0||dc===0)); break;
      case 'Q': slide(DIRECTIONS); break;
      case 'K': {
        for(const[dr,dc]of KING_OFFSETS)add(r+dr,c+dc);
        if(this.castling[co+'K']&&!this.board[r][5]&&!this.board[r][6]&&this.board[r][7]===co+'R'&&!this.inCheck(co)&&!this.isAttacked(r,5,opp)&&!this.isAttacked(r,6,opp))moves.push({from:[r,c],to:[r,6],castling:'K'});
        if(this.castling[co+'Q']&&!this.board[r][3]&&!this.board[r][2]&&!this.board[r][1]&&this.board[r][0]===co+'R'&&!this.inCheck(co)&&!this.isAttacked(r,3,opp)&&!this.isAttacked(r,2,opp))moves.push({from:[r,c],to:[r,2],castling:'Q'});
        break;
      }
    }
    return moves;
  }

  legal(r, c) {
    const p = this.board[r][c];
    if (!p || !this.isOwn(p)) return [];
    const co = this.colorOf(p);
    return this.pseudo(r,c).filter(m => { const s=this.apply(m); const ok=!this.inCheck(co); this.undo(s); return ok; });
  }

  allLegal(color) {
    const sv = this.turn; this.turn = color;
    const moves = [];
    for (let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++)
      if(this.board[r][c]&&this.colorOf(this.board[r][c])===color)moves.push(...this.legal(r,c));
    this.turn = sv;
    return moves;
  }

  apply(move) {
    const [fr,fc]=move.from, [tr,tc]=move.to;
    const p=this.board[fr][fc], cap=this.board[tr][tc], co=this.colorOf(p);
    const snap={move,captured:cap,prevCast:{...this.castling},prevEp:this.epTarget,prevHalf:this.halfmoveClock};
    this.board[tr][tc]=move.promotion?co+move.promotion:p; this.board[fr][fc]=EMPTY;
    if(move.enPassant){const er=co===WHITE?tr+1:tr-1;snap.epCap=this.board[er][tc];this.board[er][tc]=EMPTY;}
    this.epTarget=move.doublePush?[(fr+tr)/2,fc]:null;
    const t=this.typeOf(p);
    if(t==='K'){this.castling[co+'K']=false;this.castling[co+'Q']=false;}
    if(t==='R'){if(fr===7&&fc===0)this.castling.wQ=false;if(fr===7&&fc===7)this.castling.wK=false;if(fr===0&&fc===0)this.castling.bQ=false;if(fr===0&&fc===7)this.castling.bK=false;}
    if(tr===0&&tc===0)this.castling.bQ=false;if(tr===0&&tc===7)this.castling.bK=false;if(tr===7&&tc===0)this.castling.wQ=false;if(tr===7&&tc===7)this.castling.wK=false;
    if(move.castling){const rf=move.castling==='K'?7:0,rt=move.castling==='K'?5:3;this.board[tr][rt]=this.board[tr][rf];this.board[tr][rf]=EMPTY;}
    this.halfmoveClock=(t==='P'||cap||move.enPassant)?0:this.halfmoveClock+1;
    if(co===BLACK)this.fullmoveNumber++;
    this.turn=co===WHITE?BLACK:WHITE;
    this.history.push(snap);
    return snap;
  }

  undo(snap) {
    const{move,captured,prevCast,prevEp,prevHalf,epCap}=snap;
    const[fr,fc]=move.from,[tr,tc]=move.to;
    const p=this.board[tr][tc],co=this.colorOf(p);
    this.board[fr][fc]=move.promotion?co+'P':p; this.board[tr][tc]=captured||EMPTY;
    if(move.enPassant){const er=co===WHITE?tr+1:tr-1;if(this.ok(er,tc))this.board[er][tc]=epCap||EMPTY;}
    if(move.castling){const rf=move.castling==='K'?7:0,rt=move.castling==='K'?5:3;this.board[fr][rf]=this.board[fr][rt];this.board[fr][rt]=EMPTY;}
    this.castling=prevCast;this.epTarget=prevEp;this.halfmoveClock=prevHalf;
    if(co===BLACK)this.fullmoveNumber--;
    this.turn=co;this.history.pop();
  }

  isCheckmate(){return this.inCheck(this.turn)&&this.allLegal(this.turn).length===0;}
  isStalemate(){return !this.inCheck(this.turn)&&this.allLegal(this.turn).length===0;}
  isDraw(){
    if(this.halfmoveClock>=100)return true;
    const ps=[];for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(this.board[r][c])ps.push(this.board[r][c]);
    if(ps.length===2)return true;
    if(ps.length===3&&ps.some(p=>['B','N'].includes(this.typeOf(p))))return true;
    return false;
  }

  evaluate(){
    let s=0;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const p=this.board[r][c];if(!p)continue;
      const co=this.colorOf(p),t=this.typeOf(p);
      const idx=co===WHITE?r*SIZE+c:(SIZE-1-r)*SIZE+c;
      const v=(PIECE_VALUES[t]||0)+(PST[t]?PST[t][idx]:0);
      s+=co===WHITE?v:-v;
    }
    return s;
  }
}
