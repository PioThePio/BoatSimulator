export const CREEP=.08;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function throttleValue(value){const v=clamp(value,-1,1);return Math.abs(v)<.04?0:Math.sign(v)*Math.max(CREEP,Math.abs(v));}
export function throttleStep(value,direction){
 if(Math.abs(value)<.035)return direction*CREEP;
 if(Math.sign(value)!==direction&&Math.abs(value)<=CREEP+.005)return 0;
 return throttleValue(value+direction*.04);
}
export function angleDelta(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
export function rimPosition(x,y,rect){const dx=x-(rect.left+rect.width/2),dy=y-(rect.top+rect.height/2);return{angle:Math.atan2(dy,dx),radius:Math.hypot(dx,dy)/(rect.width/2)};}
