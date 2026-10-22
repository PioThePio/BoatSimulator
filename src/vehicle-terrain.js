import {PARKING,SERVICE_STATION,SAND_PRACTICE,bottomAt,clamp} from './world.js';
export {SAND_PRACTICE};
const inside=(p,x,y)=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h;
export const CURB={height:.07,width:.30,gapMin:119.5,gapMax:130.5};
export function curbHeight(x,y){
 const p=PARKING,c=CURB;
 if(x<p.x-c.width||x>p.x+p.w+c.width||y<p.y-c.width||y>p.y+p.h+c.width)return 0;
 const north=Math.abs(y-p.y),south=x>c.gapMin&&x<c.gapMax?Infinity:Math.abs(y-p.y-p.h);
 const distance=Math.min(Math.abs(x-p.x),Math.abs(x-p.x-p.w),north,south);
 return c.height*Math.max(0,1-distance/c.width);
}
export function vehicleSurface(x,y){
 const floor=bottomAt(x,y),r=SERVICE_STATION.slip,depth=Math.max(0,floor.depth);
 const ramp=inside(r,x,y),sand=inside(SAND_PRACTICE,x,y)||(!inside(PARKING,x,y)&&!ramp&&floor.beach&&floor.depth>-.15);
 const material=sand?'sand':ramp||inside(PARKING,x,y)?'concrete':'grass';
 const mu=sand?.45:material==='grass'?.56:depth>.025?.60-.18*clamp(depth/.75,0,1):.80;
 const curb=curbHeight(x,y);
 return{z:-floor.depth+curb,depth,material,mu,soft:sand,curb,rolling:sand?.11:material==='grass'?.045:.014};
}
// Wheel work against terrain elevation, including the low curb. This replaces
// a gravity switch at the centre of the SUV, which ignored axle/ramp alignment.
export function vehicleGradient(x,y){const d=.10;return{x:(vehicleSurface(x+d,y).z-vehicleSurface(x-d,y).z)/(2*d),y:(vehicleSurface(x,y+d).z-vehicleSurface(x,y-d).z)/(2*d)};}
