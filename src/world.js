export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const DOCKS=[{x:6,y:10,w:23,h:2.8},{x:17,y:12.8,w:2.8,h:17},{x:29,y:10,w:2.8,h:16}];
export const SOLIDS=[...DOCKS,{x:-20,y:-20,w:220,h:24},{x:-20,y:4,w:24,h:126},{x:4,y:110,w:196,h:20},{x:180,y:4,w:20,h:106}];
export const BOLLARDS=[{x:12,y:12.8},{x:17,y:18},{x:17,y:25},{x:19.8,y:28},{x:29,y:17},{x:29,y:23},{x:25,y:12.8}];
export function bottomAt(x,y){
 const shore=Math.max(0,Math.min(x-4,180-x,y-4,110-y));
 const basin=.2+5.8*(1-Math.exp(-shore/24));
 const shoal=4.9*Math.exp(-((x-91)**2/230+(y-64)**2/130));
 const ripple=.22*Math.sin(x*.13)*Math.sin(y*.16);
 const depth=Math.max(.12,basin-shoal+ripple);
 const material=x>113?'mud':x>73&&y<40?'rock':'sand';
 return {depth,material,name:{sand:'piasek',mud:'muł',rock:'skała'}[material],holding:{sand:28,mud:12,rock:3}[material]};
}
export function environment(t,e={}){
 const phase=e.gusts?1+.28*Math.sin(t*.37)+.12*Math.sin(t*1.13):1;
 const a=(e.windDirection??90)*Math.PI/180,c=(e.currentDirection??90)*Math.PI/180;
 return{wind:{x:Math.sin(a)*(e.windSpeed??0)*phase,y:-Math.cos(a)*(e.windSpeed??0)*phase},current:{x:Math.sin(c)*(e.currentSpeed??0),y:-Math.cos(c)*(e.currentSpeed??0)}};
}
export function waveHeight(e){return e.autoWaves?Math.min(.55,.004*(e.windSpeed??0)**2):(e.waveHeight??0);}
export function waveAt(x,y,t,e){
 const H=waveHeight(e),a=(e.waveDirection??e.windDirection??90)*Math.PI/180,n={x:Math.sin(a),y:-Math.cos(a)};
 let eta=0,sx=0,sy=0,vx=0,vy=0,ax=0,ay=0;
 const h=Math.max(.4,bottomAt(x,y).depth);
 for(const [weight,period,phase,offset]of [[.65,2.8,0,0],[.25,1.9,1.7,.32],[.1,3.9,3.2,-.4]]){
  const omega=2*Math.PI/period;let k=omega*omega/9.81;
  for(let i=0;i<5;i++)k=omega*omega/(9.81*Math.tanh(k*3));
  const nx=Math.sin(a+offset),ny=-Math.cos(a+offset),A=H*.5*weight,theta=k*(x*nx+y*ny)-omega*t+phase;
  const co=Math.cos(theta),si=Math.sin(theta),orb=A*omega/Math.tanh(Math.max(.2,k*h));
  eta+=A*co;sx-=A*k*si*nx;sy-=A*k*si*ny;
  vx+=orb*co*nx;vy+=orb*co*ny;ax+=orb*omega*si*nx;ay+=orb*omega*si*ny;
 }
 return {eta,sx,sy,vx,vy,ax,ay,direction:n};
}
