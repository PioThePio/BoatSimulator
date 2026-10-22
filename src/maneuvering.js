import {DOCKS,bottomAt,clamp} from './world.js';
// Right-handed propeller: the stern walks to port in reverse. Twin installations
// are assumed counter-rotating, so this small transverse component cancels.
export function propWalkForce(S,en,speed,planing){
 if(S.engineCount!==1||S.jet||en.key!=='running'||en.gear>=0)return 0;
 const fade=clamp(1-Math.abs(speed)/2.2,0,1)**2*(1-planing);
 if(fade===0||S.propWalkStrength===0)return 0;
 return -Math.abs(en.thrust)*S.propWalkStrength*(S.propulsion==='inboard'?.45:.30)*fade;
}
export function bankInfluence(b){
 const range=b.spec.length*2;
 let distance=range,nx=0,ny=0;
 const consider=(x,y)=>{const dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy);if(d>.1&&d<distance){distance=d;nx=dx/d;ny=dy/d;}};
 for(const r of DOCKS)consider(clamp(b.x,r.x,r.x+r.w),clamp(b.y,r.y,r.y+r.h));
 for(let i=0;i<16;i++){
  const a=i*Math.PI/8;
  for(const radius of [.4,.8,1.3,2]){const x=b.x+Math.cos(a)*radius*b.spec.length,y=b.y+Math.sin(a)*radius*b.spec.length;if(bottomAt(x,y).depth<=0){consider(x,y);break;}}
 }
 return{strength:clamp(1-distance/range,0,1),nx,ny,distance};
}
