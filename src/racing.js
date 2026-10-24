const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const RACING_PROFILE={name:'Wyścigowa',length:9.2,beam:2.35,hullMass:1850,draft:.58,hp:600,freeboard:.7,planing:true,deadrise:27,fuel:450,color:'#dd7359',anchorMass:14,chain:10,lineEA:280000,lineBreak:32000,racing:true,diesel:true,maxHp:600,fixedEngineCount:2};
export function racingResistance(drag,planing,trim){const penalty=clamp(Math.abs(trim-.20)/.22,0,1);return drag*((1-planing)+planing*(.48+.5*penalty));}
export function turboParameters(engine,previous=null){
 const running=engine.key==='running',boost=running?clamp(engine.n**2*(.25+.75*(engine.load??0)),0,1):0;
 const release=previous?.key==='running'&&previous.boost>.18&&(Math.abs(previous.command??0)-Math.abs(engine.command??0)>.22||engine.gear===0&&previous.gear!==0&&Math.abs(previous.command??0)>.035);
 return{boost,frequency:850+boost*3200,level:running?.018*boost:0,bov:!!release};
}
