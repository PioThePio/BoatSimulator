// Training objects, not people/AI. SI units and physical seconds only.
export const RESCUE_TYPES={ring:{name:'Koło ratunkowe',mass:2.5,length:.8,beam:.8,draft:.05,windArea:.025},mob:{name:'Manekin MOB',mass:80,length:1.7,beam:.5,draft:.18,windArea:.06}};
export const createRescue=()=>({objects:[],nextId:1,recovered:0,contacts:0});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function advanceRescueObject(o,flow,wave,floor,dt){
 const p=RESCUE_TYPES[o.kind],mass=p.mass*1.7,wet=clamp((floor.depth+(wave.eta??0))/p.draft,0,1),next={...o};
 const wx=flow.wind.x-o.vx,wy=flow.wind.y-o.vy,windSpeed=Math.hypot(wx,wy),area=p.beam*p.draft;
 let vx=o.vx+(.5*1.225*.9*p.windArea*windSpeed*wx/mass+wave.ax*.25*wet)*dt,vy=o.vy+(.5*1.225*.9*p.windArea*windSpeed*wy/mass+wave.ay*.25*wet)*dt;
 const cx=flow.current.x+wave.vx*.45,cy=flow.current.y+wave.vy*.45,dx=vx-cx,dy=vy-cy,relative=Math.hypot(dx,dy),drag=.5*1000*.85*area*relative*wet/mass;
 vx=cx+dx/(1+drag*dt);vy=cy+dy/(1+drag*dt);
 const ground=1/(1+(1-wet)*12*dt);next.vx=vx*ground;next.vy=vy*ground;next.x+=next.vx*dt;next.y+=next.vy*dt;next.grounded=wet<.2;
 const rollTarget=clamp(Math.atan(wave.sy)*1.2,-.4,.4),heaveTarget=wave.eta*wet;
 next.heaveVelocity=(o.heaveVelocity??0)+(16*(heaveTarget-o.heave)-5*(o.heaveVelocity??0))*dt;next.heave=o.heave+next.heaveVelocity*dt;
 next.rollVelocity=(o.rollVelocity??0)+(9*(rollTarget-o.roll)-2*(o.rollVelocity??0))*dt;next.roll=o.roll+next.rollVelocity*dt;
 next.a+=clamp((wave.sx-wave.sy)*.15,-.25,.25)*dt;
 return next;
}
export function pickupStatus(b,o){
 if(!o||o.recovered)return{ok:false,message:'Wybierz obiekt na wodzie.'};
 const dx=o.x-b.x,dy=o.y-b.y,c=Math.cos(b.a),s=Math.sin(b.a),x=dx*c+dy*s,y=-dx*s+dy*c;
 const distance=Math.hypot(Math.max(0,Math.abs(x)-b.spec.length*.5),Math.max(0,Math.abs(y)-b.spec.beam*.5));
 if(distance>1.7)return{ok:false,distance,message:'Podejdź burtą na mniej niż 1,7 m od obiektu.'};
 if(Math.hypot(b.vx-o.vx,b.vy-o.vy)>.55||Math.abs(b.throttle)>.035||Math.abs(b.throttle2)>.035)return{ok:false,distance,message:'Zwolnij względem obiektu i ustaw obie manetki na luz.'};
 return{ok:true,distance,message:'Można podjąć obiekt.'};
}
export function validRescueState(state){
 const finite=(x,lo=-1e8,hi=1e8)=>Number.isFinite(x)&&x>=lo&&x<=hi;
 return state&&Array.isArray(state.objects)&&state.objects.length<=28&&Number.isInteger(state.nextId)&&state.nextId>0&&state.nextId<1e7&&finite(state.recovered,0,1e7)&&finite(state.contacts,0,1e7)&&new Set(state.objects.map(o=>o.id)).size===state.objects.length&&state.objects.every(o=>/^rescue-\d+$/.test(o.id)&&RESCUE_TYPES[o.kind]&&finite(o.x)&&finite(o.y)&&finite(o.a)&&finite(o.vx,-30,30)&&finite(o.vy,-30,30)&&finite(o.thrownAt,0)&&finite(o.heave,-5,5)&&finite(o.roll,-3,3));
}
