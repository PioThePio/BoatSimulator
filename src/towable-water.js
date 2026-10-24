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
