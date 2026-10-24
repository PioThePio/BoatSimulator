// A planing tow toy has no keel. Lateral resistance remains dissipative but
// must not force it to follow the tow boat's heading like a displacement hull.
export function inflatableDrag(S,u,planing){
 const area=S.beam*S.draft,cd=.55*(1-planing)+.10*planing;
 return .5*1000*area*cd*u*Math.abs(u)+S.mass*9.81*(.012+.012*planing)*u/Math.hypot(u,1);
}
export function inflatableLateral(S,v,w,planing,force){
 const count=5,dx=S.length/count;
 for(let i=0;i<count;i++){const x=(-.5+(i+.5)/count)*S.length,local=v+w*x;
  force(0,-.5*1000*S.draft*dx*.32*(1-.72*planing)*local*Math.abs(local)-S.mass*.012/count*local,x,0);
 }
}
// Work against forward flow only: dissipative extra drag from a beam-on wave.
export function crossWaveDrag(S,u,crossSlope){
 const exposure=Math.min(1,Math.max(0,crossSlope)*4);
 return .5*1000*S.beam*S.draft*.12*u*Math.abs(u)*exposure;
}
export function towHeelAngle(S,tension,n,heading){
 const lateral=-n.x*Math.sin(heading)+n.y*Math.cos(heading),height=Math.min(.15,S.freeboard*.4),gm=Math.max(.12,S.beam*.32);
 return Math.max(-.14,Math.min(.14,tension*lateral*height/(S.mass*9.81*gm)));
}
// Tangential velocity around the tug is an observable of inertia + line forces,
// not an added centrifugal force or an artificial boost.
export function whipState(tug,toy){
 const dx=toy.x-tug.x,dy=toy.y-tug.y,r=Math.max(.1,Math.hypot(dx,dy)),relative={x:toy.vx-tug.vx,y:toy.vy-tug.vy};
 const tangential=(-dy*relative.x+dx*relative.y)/r,speed=Math.hypot(toy.vx,toy.vy),gain=speed-Math.hypot(tug.vx,tug.vy);
 return{tangential,speed,gain,active:Math.abs(tangential)>1.5&&gain>.5};
}
