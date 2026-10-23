// The same local hull outline used by the existing canvas hulls, in SI metres.
const cache=new Map();
const cubic=(a,b,c,d,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d;
export function hullHalfBeam(S,x){
 const u=Math.max(-2.75,Math.min(2.75,x*5.5/S.length));let h;
 if(S.hullType==='flat'){const edge=2.75-.35;h=.95;if(Math.abs(u)>edge)h=.60+.35*Math.sqrt(Math.max(0,1-((Math.abs(u)-edge)/.35)**2));}
 else{let lo=0,hi=1;for(let i=0;i<24;i++){const t=(lo+hi)/2;if(cubic(2.75,1.8,-.5,-2.75,t)>u)lo=t;else hi=t;}h=-cubic(0,-1.05,-1.15,-.95,(lo+hi)/2);}
 if(S.hullType==='rib'&&u>=-2.6&&u<=2.5){let lo=0,hi=1;for(let i=0;i<24;i++){const t=(lo+hi)/2,v=(1-t)**2*-2.6+2*(1-t)*t*1.2+t*t*2.5;if(v<u)lo=t;else hi=t;}const t=(lo+hi)/2;h=Math.max(h,(1-t)**2*.85+2*(1-t)*t*1.18+.15);}
 return(h+.05)*S.beam/2.1;
}
export function hullBoundary(S,x,side){
 const e=S.length*.0002,h=hullHalfBeam(S,x),slope=(hullHalfBeam(S,x+e)-hullHalfBeam(S,x-e))/(2*e),length=Math.hypot(slope,1);
 return{x,y:side*h,nx:-slope/length,ny:side/length};
}
export function hullOutline(S){
 const key=[S.length,S.beam,S.hullType].join('/');let shape=cache.get(key);if(shape)return shape.outline;
 const outline=[];for(let i=0;i<=48;i++){const x=S.length*(-.5+i/48);outline.push({x,y:-hullHalfBeam(S,x)});}for(let i=48;i>=0;i--){const x=S.length*(-.5+i/48);outline.push({x,y:hullHalfBeam(S,x)});}
 cache.set(key,{outline});return outline;
}
export function hullContactSamples(S){
 const key=[S.length,S.beam,S.hullType].join('/');const outline=hullOutline(S),entry=cache.get(key);if(entry.samples)return entry.samples;
 const count=Math.max(9,Math.ceil(S.length/(S.beam*.35))),samples=[];
 for(let i=0;i<=count;i++){
  const x=-S.length*.5+.025+(S.length-.05)*i/count;let radius=Infinity;
  for(let j=0;j<outline.length;j++){const a=outline[j],b=outline[(j+1)%outline.length],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(l2<1e-12)continue;const t=Math.max(0,Math.min(1,((x-a.x)*dx-a.y*dy)/l2));radius=Math.min(radius,Math.hypot(x-a.x-t*dx,-a.y-t*dy));}
  samples.push({x,y:0,radius:Math.max(.015,radius)});
 }
 entry.samples=samples;return samples;
}
