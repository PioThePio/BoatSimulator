import {BEACHES,shoreAt} from '../src/world.js';
// Position relative to an actual sandy shore, independent of the old 600 m map.
const beach=BEACHES[0],water=shoreAt(beach.x+1,beach.y-6),nx=water.nx,ny=water.ny;
// Stay 30 m along the beach, clear of the new physically attached L pier.
export function sandPosition(distance=5.5,along=0){return{x:beach.x+nx*distance-ny*(along-30),y:beach.y+ny*distance+nx*(along-30)};}
export const sandNormal={x:nx,y:ny};
export function faceSand(b,speed=0,distance=5){Object.assign(b,sandPosition(distance),{a:Math.atan2(-ny,-nx),vx:-nx*speed,vy:-ny*speed});return b;}
