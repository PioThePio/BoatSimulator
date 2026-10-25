export function nearbyEngines(boats,listener,excludeId=null){
 const list=[];for(const b of boats??[]){if(b.id===excludeId||b.sunken)continue;const dx=b.x-listener.x,dy=b.y-listener.y,distance=Math.hypot(dx,dy);if(distance>140)continue;
  const gain=.55/(1+(distance/18)**2),pan=Math.max(-.85,Math.min(.85,Math.sin(Math.atan2(dy,dx)-(listener.a??0))));
  b.engines.forEach((engine,index)=>{if(engine.key==='running'||engine.key==='starting')list.push({id:b.id+'/'+index,boat:b,engine,index,distance,gain,pan});});
 }return list.sort((a,b)=>a.distance-b.distance).slice(0,4);
}
