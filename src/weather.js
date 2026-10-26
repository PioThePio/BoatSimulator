import {localWind} from './wind-field.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function band(t,min,max,rates){
 const q=.55*Math.sin(t*rates[0])+.30*Math.sin(t*rates[1])+.15*Math.sin(t*rates[2]);
 return(min+max)/2+(max-min)/2*q;
}
export function weatherAt(t,e={},x=null,y=null){
 const bounds=(name,limit)=>{
  const base=e[name+'Speed']??0,legacy=name==='wind'&&e.gusts;
  const lo=clamp(e[name+'Min']??base*(legacy?.6:1),0,limit),hi=clamp(e[name+'Max']??base*(legacy?1.4:1),0,limit);
  return[Math.min(lo,hi),Math.max(lo,hi)];
 };
 const wind=bounds('wind',15),current=bounds('current',1.5);
 const direction=(name,rates)=>{
  const variance=clamp(e[name+'DirectionVariation']??0,0,90);
  return((e[name+'Direction']??90)+variance*(.65*Math.sin(t*rates[0])+.35*Math.sin(t*rates[1]))+360)%360;
 };
 const regional={speed:band(t,...wind,[.23,.61,1.13]),direction:direction('wind',[.11,.31])},local=localWind(t,e,x,y,regional);
 return{windSpeed:local.speed,currentSpeed:band(t,...current,[.09,.21,.37]),windDirection:local.direction,currentDirection:direction('current',[.045,.13])};
}
