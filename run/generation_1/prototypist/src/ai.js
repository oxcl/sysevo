import { ChessEngine } from './chess.js';

export class ChessAI{
  getBestMove(engine){
    const mv=engine.allLegal('b');if(!mv.length)return null;
    const st=Date.now();let best=mv[0],bs=Infinity;
    for(const m of mv){const s=engine.doMove(m);const sc=this.ab(engine,3,-Infinity,Infinity,true);engine.undo(s);if(sc<bs){bs=sc;best=m;}if(Date.now()-st>200)break;}return best;
  }
  ab(engine,d,a,b,max){
    if(d===0)return engine.evaluate();
    const color=max?'b':'w';const mv=engine.allLegal(color);
    if(!mv.length)return engine.inC(color)?(max?100000:-100000):0;
    mv.sort((x,y)=>(engine.board[y.to[0]][y.to[1]]?1:0)-(engine.board[x.to[0]][x.to[1]]?1:0));
    if(max){let v=-Infinity;for(const m of mv){const s=engine.doMove(m);v=Math.max(v,this.ab(engine,d-1,a,b,false));engine.undo(s);a=Math.max(a,v);if(b<=a)break;}return v;}
    let v=Infinity;for(const m of mv){const s=engine.doMove(m);v=Math.min(v,this.ab(engine,d-1,a,b,true));engine.undo(s);b=Math.min(b,v);if(b<=a)break;}return v;
  }
}
