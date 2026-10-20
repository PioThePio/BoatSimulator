export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const WORLD={left:4,top:4,right:604,bottom:404};
export const ISLAND={x:304,y:204,rx:56,ry:41};
export function islandRadius(angle){return (1+.075*Math.sin(3*angle)+.035*Math.cos(5*angle))/Math.hypot(Math.cos(angle)/ISLAND.rx,Math.sin(angle)/ISLAND.ry);}
export function islandOutline(padding=0){return Array.from({length:120},(_,i)=>{const a=i*Math.PI/60,r=islandRadius(a)+padding;return{x:ISLAND.x+Math.cos(a)*r,y:ISLAND.y+Math.sin(a)*r};});}
export const DOCKS=[{x:6,y:10,w:23,h:2.8},{x:17,y:12.8,w:2.8,h:17},{x:29,y:10,w:2.8,h:16}];
// Hard objects = jetties and the far edge of the land buffer. Shores use terrain contact.
export const SOLIDS=[...DOCKS,{x:-45,y:-45,w:700,h:20},{x:-45,y:-25,w:20,h:480},{x:-25,y:434,w:680,h:20},{x:634,y:-25,w:20,h:480}];
export const BEACHES=[{edge:'north',from:105,to:190,name:'Plaża Północna'},{edge:'west',from:125,to:205,name:'Plaża Sosnowa'},{edge:'south',from:420,to:520,name:'Plaża Południowa'}];
const islandTree=a=>{const r=islandRadius(a)-1.2;return{x:ISLAND.x+Math.cos(a)*r,y:ISLAND.y+Math.sin(a)*r};};
export const BOLLARDS=[...[[12,12.8],[17,18],[17,25],[19.8,28],[29,17],[29,23],[25,12.8]].map(([x,y],i)=>({x,y,kind:'bollard',id:`P${i+1}`,label:`Poler ${i+1}`})),
 ...[{x:2.8,y:147},{x:2.6,y:173},{x:132,y:2.8},{x:165,y:2.8},islandTree(1.0),islandTree(1.65),{x:452,y:405.2},{x:489,y:405.2}].map((p,i)=>({...p,kind:'tree',id:`D${i+1}`,label:`Drzewo ${i+1}`}))];
export function shoreAt(x,y){
 const a=Math.atan2(y-ISLAND.y,x-ISLAND.x),islandDistance=Math.hypot(x-ISLAND.x,y-ISLAND.y)-islandRadius(a);
 const shores=[{distance:x-WORLD.left,edge:'west',along:y},{distance:WORLD.right-x,edge:'east',along:y},{distance:y-WORLD.top,edge:'north',along:x},{distance:WORLD.bottom-y,edge:'south',along:x},{distance:islandDistance,edge:'island',along:a}];
 const shore=shores.reduce((best,q)=>q.distance<best.distance?q:best);
 const beach=shore.edge==='island'?a>.3&&a<2.8:BEACHES.some(b=>b.edge===shore.edge&&shore.along>=b.from-6&&shore.along<=b.to+6);
 return {...shore,beach,land:shore.distance<0};
}
export function bottomAt(x,y){
 const shore=shoreAt(x,y);
 // Slow slope at beaches, steeper wooded shores. The same contour drives rendering and contact.
 const slope=shore.beach?.085:.24,dist=shore.distance;
 const shoreDepth=dist>=0?8.5*(1-Math.exp(-dist*slope/8.5)):dist*(shore.beach?.07:.32);
 const oldShoal=4.9*Math.exp(-((x-91)**2/230+(y-64)**2/130));
 const offshoreShoal=3.8*Math.exp(-((x-440)**2/1800+(y-285)**2/650));
 const ripple=.12*Math.sin(x*.13)*Math.sin(y*.16)*clamp(dist/12,0,1);
 const depth=dist<0?shoreDepth:Math.max(.015,shoreDepth-oldShoal-offshoreShoal+ripple);
 const material=shore.beach?'sand':(shore.edge==='island'&&shore.along<0)||x>73&&y<40?'rock':x>113?'mud':'sand';
 return {depth,material,name:{sand:'piasek',mud:'muł',rock:'kamienie'}[material],holding:{sand:28,mud:12,rock:3}[material],shoreDistance:dist,land:shore.land,beach:shore.beach};
}
export function bottomGradient(x,y){const d=.12;return{x:(bottomAt(x+d,y).depth-bottomAt(x-d,y).depth)/(2*d),y:(bottomAt(x,y+d).depth-bottomAt(x,y-d).depth)/(2*d)};}
export function environment(t,e={}){const phase=e.gusts?1+.28*Math.sin(t*.37)+.12*Math.sin(t*1.13):1;const a=(e.windDirection??90)*Math.PI/180,c=(e.currentDirection??90)*Math.PI/180;return{wind:{x:Math.sin(a)*(e.windSpeed??0)*phase,y:-Math.cos(a)*(e.windSpeed??0)*phase},current:{x:Math.sin(c)*(e.currentSpeed??0),y:-Math.cos(c)*(e.currentSpeed??0)}};}
export function waveHeight(e){return e.autoWaves?Math.min(.55,.004*(e.windSpeed??0)**2):(e.waveHeight??0);}
export function waveAt(x,y,t,e){
 const H=waveHeight(e),a=(e.waveDirection??e.windDirection??90)*Math.PI/180,n={x:Math.sin(a),y:-Math.cos(a)};let eta=0,sx=0,sy=0,vx=0,vy=0,ax=0,ay=0;
 const h=Math.max(.4,bottomAt(x,y).depth);
 for(const [weight,period,phase,offset]of [[.65,2.8,0,0],[.25,1.9,1.7,.32],[.1,3.9,3.2,-.4]]){
  const omega=2*Math.PI/period;let k=omega*omega/9.81;for(let i=0;i<5;i++)k=omega*omega/(9.81*Math.tanh(k*3));
  const nx=Math.sin(a+offset),ny=-Math.cos(a+offset),A=H*.5*weight,theta=k*(x*nx+y*ny)-omega*t+phase,co=Math.cos(theta),si=Math.sin(theta),orb=A*omega/Math.tanh(Math.max(.2,k*h));
  eta+=A*co;sx-=A*k*si*nx;sy-=A*k*si*ny;vx+=orb*co*nx;vy+=orb*co*ny;ax+=orb*omega*si*nx;ay+=orb*omega*si*ny;
 }
 return {eta,sx,sy,vx,vy,ax,ay,direction:n};
}
