import {fromAtlas} from './zegrze.js';
export const NAV_ROUTES=[{name:'Narew',points:[[794,647],[826,540],[855,450],[875,360],[890,270],[894,190],[895,115]]},{name:'Bug',points:[[890,285],[957,239],[1028,231],[1110,245],[1200,223]]}];
// IALA A: direction is UPSTREAM from the lake; red port / green starboard.
export function routeMarks(route,query){
 const points=route.points.map(p=>fromAtlas(...p)),out=[];
 for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/d,dy=(b.y-a.y)/d,r=Math.min(45,Math.max(9,query(p.x,p.y).distance*.42));
  for(const side of [-1,1]){let x=p.x-dy*r*side,y=p.y+dx*r*side;const q=query(x,y);if(q.land||q.distance<4)continue;out.push({id:route.name+'-'+i+'-'+side,kind:side>0?'green':'red',route:route.name,x,y,side,direction:{x:dx,y:dy}});}
 }return out;
}
export const NAV_HAZARDS=[{...fromAtlas(965,302),id:'rock-rzadza',radius:5,depth:.32},{...fromAtlas(1070,255),id:'rock-bug',radius:4,depth:.25},{...fromAtlas(800,660),id:'rock-headland',radius:4.5,depth:.38}];
export function hazardBottom(x,y,base,hazards=NAV_HAZARDS){
 let result=base;for(const h of hazards){const r=Math.hypot(x-h.x,y-h.y);if(r>=h.radius)continue;const target=h.depth+(base.depth-h.depth)*(r/h.radius)**3;if(target<result.depth)result={...result,depth:target,material:'rock',name:'kamienie',holding:3,hazard:h.id};}return result;
}
export function makeNavigationMarks(query){
 const danger=NAV_HAZARDS.filter(h=>query(h.x,h.y).distance>10);
 return[...NAV_ROUTES.flatMap(q=>routeMarks(q,query)),...danger.flatMap((h,i)=>[{id:h.id,kind:'danger',x:h.x,y:h.y,hazard:h.id},{id:h.id+'-cardinal',kind:'cardinal',cardinal:['N','E','W'][i],x:h.x+[0,13,-13][i],y:h.y+[-13,0,0][i]}])];
}
export function markPose(mark,time,wave={eta:0,sx:0,sy:0}){return{x:mark.x+Math.sin(time*.7+mark.x)*.10,y:mark.y+Math.cos(time*.6+mark.y)*.10,heave:wave.eta,roll:Math.atan(wave.sx+wave.sy)*.6};}
