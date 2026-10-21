// Distributed cross-flow (Fossen strip theory). Each force uses velocity at its own arm.
// Coefficients are approximate for these recreational hulls; no sea-trial calibration.
export function hullLateralForces(S,u,v,r,planing,force){
 const count=13,dx=S.length/count;
 for(let i=0;i<count;i++){
  const x=-S.length/2+(i+.5)*dx,local=v+r*x;
  const shape=(.65+.35*Math.cos(x/S.length*Math.PI))*(1-.50*x/S.length);
  const cross=.5*1000*S.draft*2.05*dx*shape*(1-.28*planing)*Math.abs(local)*local;
  const lift=.5*1000*S.draft*dx*(.50+1.10*planing)*Math.abs(u)*local;
  force(0,-cross-lift-S.mass*.035/count*local,x,0);
 }
}
export function windForces(S,au,av,r,force){
 // More exposed bow/superstructure, sheltered stern: wind can weathercock the hull.
 const stations=[[-.36,.10],[-.12,.16],[.14,.30],[.37,.44]];
 for(const [fraction,weight]of stations){
  const x=S.length*fraction,local=av-r*x;
  force(.5*1.225*.85*S.beam*S.freeboard*weight*au*Math.abs(au),
   .5*1.225*1.05*S.length*S.freeboard*weight*local*Math.abs(local),x,0);
 }
}
