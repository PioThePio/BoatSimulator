// Distributed cross-flow (Fossen strip theory). Each force uses velocity at its own arm.
export {bankSuctionForce,passingInteraction} from './hydro-interactions.js';
// Coefficients are approximate for these recreational hulls; no sea-trial calibration.
export function hullLateralForces(S,u,v,r,planing,force,poweredTurn=0){
 const count=13,dx=S.length/count;
 // Small incidence keeps directional stability. During a hard powered turn the aft
 // strips lose lateral grip progressively; the immersed forward chine still grips.
 // Every strip remains dissipative (Fy * local velocity <= 0).
 const incidence=Math.hypot(v,r*S.length*.35)/Math.max(2,Math.abs(u));
 const release=(S.jet?.88:.78)*planing*Math.max(0,Math.min(1,(incidence*(S.jet?3:1)-.004)/.055));
 for(let i=0;i<count;i++){
  const x=-S.length/2+(i+.5)*dx,local=v+r*x;
  const shape=(.65+.35*Math.cos(x/S.length*Math.PI))*(1-.50*x/S.length);
  const aft=Math.max(0,-x/S.length*2),grip=(1-release*(.65+.33*aft))*(1-.38*poweredTurn*aft);
  const cross=(S.air?.32:1)*.5*1000*S.draft*2.05*dx*shape*(1-.28*planing)*grip*Math.abs(local)*local;
  const stall=1/Math.sqrt(1+(local/(.45+Math.abs(u)*.12))**2);
  const slow=Math.max(0,Math.min(1,(Math.abs(u)-1)/2));
  const lift=(S.air?.25:1)*.5*1000*S.draft*dx*(.24+.26*slow+1.10*planing)*grip*stall*Math.abs(u)*local;
  force(0,(-cross-lift-S.mass*.022/count*local)*(S.lateralFactor??1),x,0);
 }
}
export function windForces(S,au,av,r,force){
 // More exposed bow/superstructure, sheltered stern: wind can weathercock the hull.
 const stations=[[-.36,.10],[-.12,.16],[.14,.30],[.37,.44]];
 for(const [fraction,weight]of stations){
  const x=S.length*fraction,local=av-r*x;
  force(.5*1.225*.85*S.beam*S.freeboard*weight*au*Math.abs(au),
   .5*1.225*1.05*S.length*S.freeboard*(S.windageFactor??.6)/.6*weight*local*Math.abs(local),x,0);
 }
}
