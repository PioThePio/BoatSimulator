import {PARKING,SERVICE_STATION,SAND_PRACTICE,bottomAt,clamp} from './world.js';
import {YARD_ISLANDS,HANGAR,WILD_SLIP,rectContains as inside,polygonContains} from './port-yard.js';
import {roadAt} from './port-roads.js';
export {SAND_PRACTICE};
export const CURB={height:.07,width:.30,gapMin:119.5,gapMax:130.5};
export function curbHeight(x,y){
 const p=PARKING,c=CURB;let height=0;
 if(x>=p.x-c.width&&x<=p.x+p.w+c.width&&y>=p.y-c.width&&y<=p.y+p.h+c.width){
 const north=x>c.gapMin&&x<c.gapMax?Infinity:Math.abs(y-p.y),south=x>c.gapMin&&x<c.gapMax?Infinity:Math.abs(y-p.y-p.h),west=y> -79&&y< -50?Infinity:Math.abs(x-p.x);
 const d=Math.min(west,(y> -63&&y< -44?Infinity:Math.abs(x-p.x-p.w)),north,south);height=c.height*Math.max(0,1-d/c.width);}
 for(const q of YARD_ISLANDS){const dx=Math.max(q.x-x,0,x-q.x-q.w),dy=Math.max(q.y-y,0,y-q.y-q.h);height=Math.max(height,c.height*clamp(1-Math.hypot(dx,dy)/c.width,0,1));}return height;
}
export function vehicleSurface(x,y){
 const floor=bottomAt(x,y),r=SERVICE_STATION.slip,wild=inside(WILD_SLIP,x,y),sampled=roadAt(x,y),road=!wild&&(floor.land||sampled?.bridge)?sampled:null,ramp=inside(r,x,y),yard=floor.land&&(inside(PARKING,x,y)||inside({x:HANGAR.x,y:HANGAR.y,w:26,h:44},x,y)),depth=road?.blend===1||yard?0:Math.max(0,floor.depth);
 const sand=polygonContains(SAND_PRACTICE.outline,x,y)||(!yard&&!ramp&&!road&&floor.beach&&floor.depth>-.15),material=wild?'sand':sand?'sand':road?.material==='gravel'?'gravel':ramp||yard||road&&(road.bridge||road.distance<=road.width/2)?'concrete':'grass';
 const mu=wild?(depth>.025?.29:.46):sand?.45:material==='gravel'?.58:material==='grass'?.56:depth>.025?.60-.18*clamp(depth/.75,0,1):.80,curb=floor.land?curbHeight(x,y):0;
 const elevation=-(r.y-r.waterY)*Math.tan(r.angle*Math.PI/180),z=yard?elevation:-floor.depth+(elevation+floor.depth)*(road?.blend??0);
 return{z:z+curb,depth,material,mu,soft:sand||wild,curb,rolling:wild?.08:material==='gravel'?.035:sand?.11:material==='grass'?.045:.014};
}
export function vehicleGradient(x,y){const d=.10;return{x:(vehicleSurface(x+d,y).z-vehicleSurface(x-d,y).z)/(2*d),y:(vehicleSurface(x,y+d).z-vehicleSurface(x,y-d).z)/(2*d)};}
