const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const RACING_PROFILE={name:'Wyścigowa',length:9.2,beam:2.35,hullMass:1850,draft:.58,hp:600,freeboard:.7,planing:true,deadrise:27,fuel:450,color:'#dd7359',anchorMass:14,chain:10,lineEA:280000,lineBreak:32000,racing:true,maxHp:600,fixedEngineCount:2};
export function racingResistance(drag,planing,trim){const penalty=clamp(Math.abs(trim-.20)/.22,0,1);return drag*((1-planing)+planing*(.20+.5*penalty));}
export function racingSternRelease(spec,engines,steer,speed){
 if(!spec.racing)return 0;
 const power=engines.reduce((s,en)=>s+Math.abs(en.effectiveThrust??en.thrust??0),0)/Math.max(1,spec.mass*5);
 return .9*clamp(power,0,1)*clamp(Math.abs(steer)/spec.maxSteer,0,1)**2*clamp((42-Math.abs(speed))/26,0,1);
}
export function turboParameters(engine,previous=null){
 const running=engine.key==='running',boost=running?clamp(engine.boost??engine.n**2*(.25+.75*(engine.load??0)),0,1):0;
 const release=previous?.key==='running'&&previous.boost>.18&&(Math.abs(previous.command??0)-Math.abs(engine.command??0)>.22||engine.gear===0&&previous.gear!==0&&Math.abs(previous.command??0)>.035);
 return{boost,frequency:850+boost*3200,level:running?.018*boost:0,bov:!!release};
}
