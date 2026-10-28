// Three-speed torque-converter automatic. Forces are SI and use physical dt.
export const AUTO_GEARS=[{ratio:3.2,up:9,down:0},{ratio:1.7,up:17,down:6.5},{ratio:1,up:Infinity,down:13}];
export function automaticTransmission(r,speed,dt){
 r.autoGear=Math.max(1,Math.min(3,r.autoGear??1));r.shiftTime=Math.max(0,(r.shiftTime??0)-dt);
 if(r.gear!=='D'){r.autoGear=1;return{gear:r.gear==='R'?-1:0,rpm:0,forceScale:1,powerScale:1};}
 const v=Math.abs(speed),g=AUTO_GEARS[r.autoGear-1];
 if(!r.shiftTime&&v>g.up&&r.autoGear<3){r.autoGear++;r.shiftTime=.35;}
 else if(!r.shiftTime&&v<g.down&&r.autoGear>1){r.autoGear--;r.shiftTime=.25;}
 const ratio=AUTO_GEARS[r.autoGear-1].ratio;
 return{gear:r.autoGear,rpm:Math.max(780,v*ratio*115),forceScale:ratio/3.2,powerScale:r.shiftTime?.65:1};
}
// Steering geometry is mechanical, independent of speed. The tyre friction
// circle, not an invisible steering limiter, determines the resulting turn.
export function roadSteering(angle){return angle;}
