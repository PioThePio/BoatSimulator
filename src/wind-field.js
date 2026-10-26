const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
export function windBounds(e){
 const base=e.windSpeed??0,lo=clamp(e.windMin??base*(e.gusts?.6:1),0,15),hi=clamp(e.windMax??base*(e.gusts?1.4:1),0,15);
 return{min:Math.min(lo,hi),max:Math.max(lo,hi)};
}
// A continuous, advected field, never random impulses or independent grid cells.
// Coordinates and time are physical metres/seconds, not operational distance.
export function windZone(t,x,y,direction,speed){
 const a=direction*Math.PI/180,nx=Math.sin(a),ny=-Math.cos(a),advection=.8+.18*speed;
 const along=(x*nx+y*ny-advection*t)/180,across=(-x*ny+y*nx)/130;
 return{strength:.60*Math.sin(TAU*(along+.23*across))+.28*Math.sin(TAU*(.46*along-.72*across)+1.1)+.12*Math.sin(TAU*(.25*along+1.2*across)+2.7),
  direction:.62*Math.sin(TAU*(.73*along-.36*across)+.8)+.26*Math.sin(TAU*(.31*along+.88*across)+2.2)+.12*Math.sin(TAU*(1.1*along+.17*across)-.5),advection,nx,ny};
}
export function localWind(t,e,x,y,regional){
 if(!e.spatialEffects||x===null||y===null)return regional;
 const {min,max}=windBounds(e),variation=clamp(e.windDirectionVariation??0,0,90);
 if(min===max&&variation===0)return regional;
 const base=e.windDirection??90,zone=windZone(t,x,y,base,(min+max)/2),middle=(min+max)/2;
 const offset=((regional.direction-base+540)%360)-180;
 return{speed:min===max?regional.speed:clamp(middle+.45*(regional.speed-middle)+.55*(max-min)*.5*zone.strength,min,max),
  direction:(base+.45*offset+.55*variation*zone.direction+720)%360};
}
