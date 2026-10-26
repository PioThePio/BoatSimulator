const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),G=9.81;
const spectrumCache=new Map();
export function windSea(weather){
 const a=weather.windDirection*Math.PI/180,c=weather.currentDirection*Math.PI/180;
 const x=Math.sin(a)*weather.windSpeed-Math.sin(c)*weather.currentSpeed,y=-Math.cos(a)*weather.windSpeed+Math.cos(c)*weather.currentSpeed;
 return{height:Math.min(.55,.004*(x*x+y*y)),angle:Math.hypot(x,y)>.001?Math.atan2(x,-y):a};
}
function properties(k,h){const kh=Math.min(20,k*h),sigma=Math.sqrt(G*k*Math.tanh(kh)),group=.5*sigma/k*(1+2*kh/Math.sinh(2*kh));return{sigma,group};}
// Linear dispersion with Doppler shift: (omega-kU)^2 = g k tanh(kh).
// Follow the incoming branch. Strong opposing flow can block short waves;
// bound that approximation and shed energy rather than amplify without limit.
export function waveCurrent(period,depth,current=0){
 const key=period+','+depth+','+current;if(spectrumCache.has(key))return spectrumCache.get(key);
 const omega=2*Math.PI/period,h=Math.max(.4,depth);let k=omega*omega/G;
 for(let i=0;i<5;i++)k=omega*omega/(G*Math.tanh(k*h));
 const base=k,reference=properties(k,h);let blocked=false;
 if(Math.abs(current)>.0001)for(let i=0;i<6;i++){
  const p=properties(k,h),d=p.group+current;if(d<.12){blocked=true;break;}
  const next=clamp(k-(p.sigma+k*current-omega)/d,base*.25,base*3.5);
  if(Math.abs(next-k)<1e-7){k=next;break;}k=next;
 }
 const p=properties(k,h),groundGroup=p.group+current;
 blocked||=groundGroup<.12;
 const heightScale=clamp(Math.sqrt(reference.group*p.sigma/(omega*Math.max(.15,groundGroup))),.60,1.65)*(blocked?.65:1);
 const out=Object.freeze({k,sigma:p.sigma,omega:blocked?Math.max(omega*.25,p.sigma+k*current):omega,group:p.group,groundGroup,heightScale,blocked,wavelength:2*Math.PI/k});if(spectrumCache.size>=512)spectrumCache.delete(spectrumCache.keys().next().value);spectrumCache.set(key,out);return out;
}
