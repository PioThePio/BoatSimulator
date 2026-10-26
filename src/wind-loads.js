const distributions={tender:[.14,.20,.30,.36],runabout:[.10,.16,.30,.44],cabin:[.08,.15,.32,.45],cruiser:[.20,.26,.28,.26],rib:[.17,.27,.30,.26],flat:[.20,.24,.28,.28],pwc:[.26,.30,.25,.19],swamp:[.55,.27,.12,.06],racing:[.18,.26,.32,.24],barge:[.20,.30,.30,.20],rowboat:[.20,.30,.30,.20],kayak:[.20,.30,.30,.20],banana:[.20,.30,.30,.20],mat:[.20,.30,.30,.20]};
const arms=[-.36,-.12,.14,.37];
// Approximate exposed hull/superstructure panels, not a universal bow pressure
// point. Relative air velocity includes the panel's rotational velocity.
export function windLoads(S,au,av,r,force=()=>{}){
 const weights=distributions[S.profile]??distributions.runabout,loads={x:0,y:0,yaw:0};
 for(let i=0;i<4;i++){
  const x=S.length*arms[i],local=av-r*x,speed=Math.hypot(au,local),weight=weights[i];
  const fx=.5*1.225*.85*S.beam*S.freeboard*weight*speed*au;
  const fy=.5*1.225*1.05*S.length*S.freeboard*(S.windageFactor??.6)/.6*weight*speed*local;
  force(fx,fy,x,0);loads.x+=fx;loads.y+=fy;loads.yaw+=x*fy;
 }
 return loads;
}
