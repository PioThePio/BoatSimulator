import {PARKING,SERVICE_STATION,SAND_PRACTICE,bottomAt,clamp} from './world.js';
export {SAND_PRACTICE};
const inside=(p,x,y)=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h;
export function vehicleSurface(x,y){
 const floor=bottomAt(x,y),r=SERVICE_STATION.slip,depth=Math.max(0,floor.depth);
 const ramp=inside(r,x,y),sand=inside(SAND_PRACTICE,x,y)||(!inside(PARKING,x,y)&&!ramp&&floor.beach);
 const material=sand?'sand':ramp||inside(PARKING,x,y)?'concrete':'grass';
 const mu=sand?.45:material==='grass'?.56:depth>.025?.60-.18*clamp(depth/.75,0,1):.80;
 return{z:-floor.depth,depth,material,mu,soft:sand,rolling:sand?.085:material==='grass'?.035:.014};
}
