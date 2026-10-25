import {REMOTE_HARBORS,FUEL_STATION,NIEPORET,PILAWA,MAP_STARTS,bottomAt,shoreAt} from './world.js';
import {logicalDistance,operationalSeconds} from './operations.js';
const wetApproach=q=>{const [nx,ny]={east:[1,0],west:[-1,0],south:[0,1],north:[0,-1]}[q.direction];const centre={x:q.x+nx*(q.length+14),y:q.y+ny*(q.length+14)};for(const offset of[0,20,-20,35,-35,55,-55]){const p={x:centre.x-ny*offset,y:centre.y+nx*offset};if(bottomAt(p.x,p.y).depth>1.5&&shoreAt(p.x,p.y).distance>8)return p;}return centre;};
export const DESTINATIONS=[{id:'main',name:'Port główny',x:90,y:55},{id:'pilawa',name:'Port Pilawa',...PILAWA.start},{id:'nieporet',name:'Port Nieporęt',...NIEPORET.start},{id:'zeranski',name:'Ujście Kanału Żerańskiego',...MAP_STARTS.zeranski},{id:'nieporet-fuel',name:'ORLEN na wodzie · Nieporęt',...NIEPORET.route.at(-1)},{id:'euzebia',name:'Wyspa Euzebia',...MAP_STARTS.euzebia},
 ...REMOTE_HARBORS.map(q=>({id:q.id,name:q.name,...wetApproach(q)})),
 {id:'fuel',name:'Stacja paliw · Rynia',x:FUEL_STATION.x+15,y:FUEL_STATION.y}];
export function destinationStatus(b,id){
 const target=DESTINATIONS.find(q=>q.id===id);
 if(!target)return{target:null,distance:null,eta:null,arrived:false};
 const dx=target.x-b.x,dy=target.y-b.y,physical=Math.hypot(dx,dy),distance=logicalDistance(physical),arrived=physical<18;
 const closing=physical>.1?(dx*b.vx+dy*b.vy)/physical:0;
 const online=b.electrics.powered.gps;
 // A logical distance divided by unmodified SOG gives logical ETA. A boat
 // stopped or travelling away does not get a fabricated arrival countdown.
 return{target,distance:online?distance:null,arrived:online&&arrived,
  eta:online&&!arrived&&closing>.15&&b.operations.started?operationalSeconds(physical/closing):null};
}
