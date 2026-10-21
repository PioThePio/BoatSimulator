import {clamp,bottomAt,SERVICE_STATION,PARKING,BUILDINGS,DOCKS,BOLLARDS} from './world.js';
import {SUV_GEOMETRY,bodyPoint,bodyLocal,kick,frameZ,bunkZ,updateTowGeometry} from './tow-geometry.js';
import {vehicleSurface} from './vehicle-terrain.js';
import {lockedSupport,trailerBoatContact} from './trailer-support.js';
import {attachRope} from './rigging.js';
import {recordImpact} from './impacts.js';
export {bodyPoint,bodyLocal};
export const SUV=SUV_GEOMETRY;
const G=9.81,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const trailerBollardIndex=()=>BOLLARDS.findIndex(p=>p.trailer);
function body(x,y,a,mass,iz){return{x,y,a,mass,iz,vx:0,vy:0,w:0,z:0,pitch:0};}
export function createTowRig(b,{loaded=false,atSlip=false}={}){
 const S=b.spec,mass=220+S.length*65+Math.max(0,S.mass-1200)*.055,offset=.14*S.length,hitch=offset+.5*S.length+1.45,a=-Math.PI/2;
 const car=body(124.5,atSlip?9:-32,a,SUV.mass,SUV.iz),hp=bodyPoint(car,-SUV.hitch);
 const t=body(hp.x-Math.cos(a)*hitch,hp.y-Math.sin(a)*hitch,a,mass,mass*(S.length*S.length+S.beam*S.beam)/12);
 Object.assign(t,{emptyMass:mass,hitch,offset,length:S.length+2.15,beam:Math.max(1.65,S.beam+.35),axles:mass+S.mass>4500?3:mass+S.mass>1800?2:1,braked:mass+S.mass>750,bunkHeight:.6+S.draft*.15});
 const r={car,trailer:t,boatLength:S.length,boatLoaded:loaded,secured:loaded,attached:true,trailerPark:false,handbrake:false,awd:false,frontSink:0,rearSink:0,carDamage:0,trailerDamage:0,hitchDamage:0,postBroken:false,lastJackknife:-10,
  gear:'P',steer:0,actualSteer:0,gas:0,brake:0,pedal:0,brakePedal:0,speed:0,time:0,slip:0,traction:1,grade:0,drawbarForce:0,contacts:0,ropeForce:{x:0,y:0,torque:0},status:loaded?'Łódź zabezpieczona · cuma dziobowa PRZ':'Pusta przyczepa na parkingu',
  engine:{key:'off',rpm:0,n:0,load:0,hp:SUV.hp,gear:0,temperature:18,startTime:0,immersion:0,ventilation:0,thrust:0,inflow:0,opposingFlow:0,trim:0,trimRate:0},fuel:{litres:65,capacity:75,flow:0}};
 b.towRig=r;updateTowGeometry(r);updateTrailerMass(r,b);
 if(loaded){b.throttle=b.throttle2=0;for(const en of b.engines){en.key='off';en.rpm=en.n=en.gear=en.thrust=0;if(!S.jet)en.trim=en.trimTarget=1;}placeTrailerBoat(r,b);attachRope(b,'bow',trailerBollardIndex());}
 return r;
}
function updateTrailerMass(r,b){const t=r.trailer;t.mass=t.emptyMass+(r.secured&&r.boatLoaded?b.spec.mass:0);t.iz=t.mass*(b.spec.length**2+t.beam**2)/12;}
export function trailerPost(r){return bodyPoint(r.trailer,r.trailer.offset+r.boatLength*.46+.2);}
export function trailerTarget(r){return bodyPoint(r.trailer,r.trailer.offset);}
function carDepths(r){const rear=bodyPoint(r.car,-SUV.wb/2),front=bodyPoint(r.car,SUV.wb/2);return{rearDepth:Math.max(0,bottomAt(rear.x,rear.y).depth),frontDepth:Math.max(0,bottomAt(front.x,front.y).depth)};}
export function trailerImmersion(r,b){
 updateTowGeometry(r);
 const t=r.trailer,p=trailerTarget(r),depth=bottomAt(p.x,p.y).depth,bunkDepth=-bunkZ(t,t.offset),buoyancy=clamp(bunkDepth/b.spec.draft,0,1);
 return{depth,bunkDepth,buoyancy,...carDepths(r),tooDeep:bunkDepth>b.spec.draft+.45,tooShallow:bunkDepth<b.spec.draft*.25};
}
export function carKey(r,direction){
 const en=r.engine;if(direction<0){en.key='off';r.gas=0;return{ok:true,message:'SUV · zapłon wyłączony'};}
 if(en.key==='off'){en.key='ignition';return{ok:true,message:'SUV · zapłon'};}
 if(en.key==='running'||en.key==='starting')return{ok:true,message:'SUV · silnik już pracuje'};
 if(!['P','N'].includes(r.gear))return{ok:false,message:'Rozruch SUV-a tylko w P lub N.'};
 if(r.fuel.litres<=0)return{ok:false,message:'Brak paliwa w SUV-ie.'};
 if(carDepths(r).frontDepth>.9)return{ok:false,message:'Dolot pod wodą · wyciągnij samochód na płytszą wodę.'};
 en.key='starting';en.startTime=0;return{ok:true,message:'SUV · rozrusznik…'};
}
export function selectCarGear(r,gear){
 if(!['P','R','N','D'].includes(gear))return{ok:false,message:'Nieznany bieg'};
 if(gear!==r.gear&&gear!=='N'&&Math.hypot(r.car.vx,r.car.vy)>.25)return{ok:false,message:'Zatrzymaj zestaw przed zmianą kierunku lub włączeniem P.'};
 r.gear=gear;r.gas=0;return{ok:true,message:'SUV · '+({P:'parking',R:'wsteczny',N:'luz',D:'naprzód'})[gear]};
}
export function stepCarGear(r,direction){const order=['P','R','N','D'];return selectCarGear(r,order[clamp(order.indexOf(r.gear)+direction,0,3)]);}
export function toggleHandbrake(r){r.handbrake=!r.handbrake;return{ok:true,message:'Hamulec ręczny '+(r.handbrake?'zaciągnięty':'zwolniony')};}
export function hitchAction(r){
 if(Math.max(Math.hypot(r.car.vx,r.car.vy),Math.hypot(r.trailer.vx,r.trailer.vy))>.12)return{ok:false,message:'Zatrzymaj samochód i przyczepę.'};
 if(r.attached){const t=r.trailer,p=bodyPoint(t,t.offset-r.boatLength*.4);if(Math.max(bottomAt(t.x,t.y).depth,bottomAt(p.x,p.y).depth)>.02)return{ok:false,message:'Odczep przyczepę na lądzie.'};r.attached=false;r.trailerPark=true;updateTowGeometry(r);r.status='Przyczepa odczepiona · hamulec postojowy i podpora';return{ok:true,message:r.status};}
 const p=bodyPoint(r.car,-SUV.hitch),q=bodyPoint(r.trailer,r.trailer.hitch);
 if(Math.hypot(p.x-q.x,p.y-q.y)>.55||Math.abs(wrap(r.car.a-r.trailer.a))>.5)return{ok:false,message:'Podjedź hakiem do zaczepu przyczepy (do 55 cm), prawie prosto.'};
 if(r.hitchDamage>=100)return{ok:false,message:'Zaczep zniszczony · rozpocznij nową próbę.'};
 r.attached=true;r.trailerPark=false;r.status='Przyczepa przyczepiona';return{ok:true,message:r.status};
}
export function placeTrailerBoat(r,b){
 updateTowGeometry(r);const t=r.trailer,p=trailerTarget(r);b.x=p.x;b.y=p.y;b.a=t.a;b.vx=p.vx;b.vy=p.vy;b.w=t.w;b.pitch=t.pitch;b.roll=0;
 b.heave=bunkZ(t,t.offset)+b.spec.draft;b.heaveVelocity=0;b.pitchVelocity=0;b.rollVelocity=0;b.planing=0;b.grounded=false;b.underKeel=t.bunkHeight;b.groundLoad=0;b.cameraZoom=1;
 b.telemetry={surge:0,sway:0,thrust:0,drag:0,shaftPower:0,acceleration:0};lockedSupport(r,b);
}
export function trailerAction(r,b,action){
 if(action==='release'){if(!r.boatLoaded)return{ok:false,message:'Przyczepa jest pusta.'};r.secured=false;b.launchMotion=true;r.unloadedTime=0;updateTrailerMass(r,b);r.status='Zabezpieczenia zwolnione · łódź może się zsunąć, cuma PRZ trzyma dziób';return{ok:true,message:r.status};}
 if(r.secured&&r.boatLoaded)return{ok:true,message:'Łódź zabezpieczona na przyczepie'};
 const p=bodyLocal(r.trailer,b),d=trailerImmersion(r,b),v=trailerTarget(r);
 if(!r.boatLoaded&&d.tooDeep)return{ok:false,message:'Przyczepa za głęboko · podjedź SUV-em do przodu.'};
 if(!r.boatLoaded&&d.tooShallow)return{ok:false,message:'Przyczepa za płytko · zanurz podpory, cofając SUV-em.'};
 if(Math.abs(p.y)>b.spec.beam*.2+.1||Math.abs(p.x-r.trailer.offset)>.70||Math.abs(wrap(b.a-r.trailer.a))>.20)return{ok:false,message:'Wprowadź łódź prosto między prowadnice, dziobem do polera PRZ.'};
 if(Math.hypot(b.vx-v.vx,b.vy-v.vy)>.3||Math.hypot(r.car.vx,r.car.vy)>.15)return{ok:false,message:'Zatrzymaj samochód i łódź przed zabezpieczeniem.'};
 if(b.engines.some(en=>en.key!=='off'))return{ok:false,message:'Wyłącz silniki łodzi przed zabezpieczeniem na przyczepie.'};
 if(!b.ropes.some(q=>q.end==='bow'&&q.bollard===trailerBollardIndex()))return{ok:false,message:'Załóż cumę dziobową na poler PRZ na przodzie przyczepy.'};
 if(b.ropes.some(q=>q.bollard!==trailerBollardIndex())||b.anchor.mode!=='stowed')return{ok:false,message:'Odepnij cumy od brzegu i wybierz kotwicę przed załadunkiem.'};
 r.boatLoaded=r.secured=true;b.launchMotion=false;updateTrailerMass(r,b);placeTrailerBoat(r,b);r.status='Łódź zabezpieczona na przyczepie';return{ok:true,message:r.status};
}
function rampGrade(p){const q=SERVICE_STATION.slip;return p.x>q.x&&p.x<q.x+q.w&&p.y>q.y&&p.y<q.y+q.h?q.angle*Math.PI/180:0;}
function tyre(q,x,angle,normal,mu,stiffness,dt){
 const p=bodyPoint(q,x),nx=-Math.sin(angle),ny=Math.cos(angle),rx=p.x-q.x,ry=p.y-q.y,lever=rx*ny-ry*nx,v=p.vx*nx+p.vy*ny;
 const j=clamp(-v/(1/q.mass+lever*lever/q.iz+1/(stiffness*dt)),-mu*normal*dt,mu*normal*dt);kick(q,nx*j,ny*j,rx,ry);
}
function hitch(r,dt){
 const c=r.car,t=r.trailer,p=bodyPoint(c,-SUV.hitch),q=bodyPoint(t,t.hitch),rx=p.x-c.x,ry=p.y-c.y,sx=q.x-t.x,sy=q.y-t.y;
 const inv=1/c.mass+1/t.mass,A=inv+ry*ry/c.iz+sy*sy/t.iz,B=-rx*ry/c.iz-sx*sy/t.iz,D=inv+rx*rx/c.iz+sx*sx/t.iz,det=A*D-B*B;
 const vx=q.vx-p.vx+clamp((q.x-p.x)*.15/dt,-2,2),vy=q.vy-p.vy+clamp((q.y-p.y)*.15/dt,-2,2),jx=(-D*vx+B*vy)/det,jy=(B*vx-A*vy)/det;
 kick(t,jx,jy,sx,sy);kick(c,-jx,-jy,rx,ry);return Math.hypot(jx,jy)/dt;
}
function roadContact(q,length,beam,r,dt){
 const obstacles=[...BUILDINGS,...DOCKS];
 // The training area is bounded on land; the ramp and water remain accessible.
 const minX=PARKING.x-7,maxX=PARKING.x+PARKING.w+7,minY=PARKING.y-6;
 for(const x of [-length*.38,0,length*.38]){const p=bodyPoint(q,x),radius=beam*.48;
  let corrections=[];
  if(p.x<minX+radius)corrections.push({nx:1,ny:0,d:minX+radius-p.x});if(p.x>maxX-radius)corrections.push({nx:-1,ny:0,d:p.x-maxX+radius});if(p.y<minY+radius)corrections.push({nx:0,ny:1,d:minY+radius-p.y});
  for(const o of obstacles){const px=clamp(p.x,o.x,o.x+o.w),py=clamp(p.y,o.y,o.y+o.h),dx=p.x-px,dy=p.y-py,d=Math.hypot(dx,dy);if(d>0&&d<radius)corrections.push({nx:dx/d,ny:dy/d,d:radius-d});else if(d===0){const sides=[{nx:-1,ny:0,d:p.x-o.x+radius},{nx:1,ny:0,d:o.x+o.w-p.x+radius},{nx:0,ny:-1,d:p.y-o.y+radius},{nx:0,ny:1,d:o.y+o.h-p.y+radius}];corrections.push(sides.sort((a,b)=>a.d-b.d)[0]);}}
  for(const hit of corrections){q.x+=hit.nx*hit.d*.45;q.y+=hit.ny*hit.d*.45;const arm={x:p.x-q.x,y:p.y-q.y},lever=arm.x*hit.ny-arm.y*hit.nx,closing=p.vx*hit.nx+p.vy*hit.ny;if(closing<0){const j=-closing/(1/q.mass+lever*lever/q.iz);kick(q,j*hit.nx,j*hit.ny,arm.x,arm.y);if(closing<-.3){r.contacts++;r.status='Kontakt zestawu z przeszkodą';}}}
 }
}

export function towStep(r,b,dt){
 r.time+=dt;updateTrailerMass(r,b);updateTowGeometry(r);const c=r.car,t=r.trailer,en=r.engine,d=trailerImmersion(r,b),grade=rampGrade(c),trailerGrade=rampGrade(t);
 if(r.secured&&r.boatLoaded)placeTrailerBoat(r,b);
 if(en.key==='starting'){en.startTime+=dt;if(en.startTime>.85)en.key='running';}
 if(d.frontDepth>.9&&['running','starting'].includes(en.key)){en.key='ignition';r.gas=0;r.status='Silnik zgasł · dolot SUV-a pod wodą';}
 if(r.fuel.litres<=0&&en.key==='running')en.key='ignition';
 r.actualSteer+=clamp(r.steer-r.actualSteer,-1.05*dt,1.05*dt);
 r.pedal+=clamp(clamp(r.gas,0,1)-r.pedal,-5*dt,1.5*dt);r.brakePedal+=clamp(clamp(r.brake,0,1)-r.brakePedal,-6*dt,2.2*dt);
 const speed=c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a),direction=r.gear==='D'?1:r.gear==='R'?-1:0,running=en.key==='running';r.speed=speed;
 const front=bodyPoint(c,SUV.wb/2),rear=bodyPoint(c,-SUV.wb/2),sf=vehicleSurface(front.x,front.y),sr=vehicleSurface(rear.x,rear.y),st=vehicleSurface(t.x,t.y);
 const supported=t.emptyMass+(b.trailerSupport?.near?b.trailerSupport.kg:0),tongue=r.attached?(t.emptyMass*.07+(b.trailerSupport?.near?b.trailerSupport.kg:0)*t.offset/t.hitch)*G:0;
 const baseNormal=SUV.mass*G*clamp(1-Math.max(0,d.frontDepth+d.rearDepth-.65)*.4,.2,1)*Math.cos(grade),transfer=baseNormal*Math.sin(c.pitch)*.22;
 const nf=Math.max(baseNormal*.20,baseNormal*.48-tongue*.4-transfer),nr=Math.max(baseNormal*.20,baseNormal*.52+tongue*1.4+transfer),tn=Math.max(0,supported*G-(r.attached?tongue:0))*Math.cos(trailerGrade);
 const nominalAxle=SUV.mass*G*.5,frontSoil=sf.soft?1+.45*Math.max(0,nf/nominalAxle-1):1,rearSoil=sr.soft?1+.45*Math.max(0,nr/nominalAxle-1):1;
 const muf=sf.mu/frontSoil*clamp(1-r.frontSink*1.8,.25,1),mur=sr.mu/rearSoil*clamp(1-r.rearSink*1.8,.25,1),frontLimit=muf*nf,rearLimit=mur*nr;
 const maxSpeed=r.gear==='R'?3.2:13,command=running&&direction?direction*(450+12650*r.pedal)*clamp((maxSpeed-Math.abs(speed))/.8,0,1)*Math.max(0,1-r.carDamage/100):0;
 const wanted=clamp(command,-150000*(.06+.94*r.pedal)/Math.max(1.5,Math.abs(speed)),150000*(.06+.94*r.pedal)/Math.max(1.5,Math.abs(speed)));
 const frontWanted=r.awd?wanted*.5:0,rearWanted=r.awd?wanted*.5:wanted;
 const frontSide=-front.vx*Math.sin(c.a+r.actualSteer)+front.vy*Math.cos(c.a+r.actualSteer),rearSide=-rear.vx*Math.sin(c.a)+rear.vy*Math.cos(c.a);
 // Combined slip shares each axle's friction circle: sustained lateral slip
 // reduces longitudinal force rather than leaving an axle with no side force.
 const frontScale=Math.max(1,Math.hypot(frontWanted,frontSide*15000)/Math.max(1,frontLimit)),rearScale=Math.max(1,Math.hypot(rearWanted,rearSide*15000)/Math.max(1,rearLimit));
 const ff=frontWanted/frontScale,rf=rearWanted/rearScale,drive=ff+rf;
 r.frontSlip=clamp((Math.abs(frontWanted)-frontLimit)/Math.max(1,Math.abs(frontWanted)),0,1);r.rearSlip=clamp((Math.abs(rearWanted)-rearLimit)/Math.max(1,Math.abs(rearWanted)),0,1);r.slip=clamp((Math.abs(wanted)-Math.abs(drive))/Math.max(1,Math.abs(wanted)),0,1);r.traction=Math.min(muf,mur);
 for(const [key,surface,spin]of [['frontSink',sf,r.frontSlip],['rearSink',sr,r.rearSlip]]){
  if(surface.soft){r[key]=clamp(r[key]+dt*(.13*spin*r.pedal*clamp(1-Math.abs(speed)/2,0,1)-.015*Math.abs(speed)),0,.45);}else r[key]=Math.max(0,r[key]-.025*dt);
 }
 r.surface=sr.material;r.bogged=Math.max(r.frontSink,r.rearSink)>.22&&Math.abs(speed)<.35;
 const foot=r.gear==='P'?1:r.brakePedal,hand=r.handbrake?rearLimit:0,resistance=nf*(sf.rolling+r.frontSink*.65)+nr*(sr.rolling+r.rearSink*.65);
 const engineBrake=running&&direction?Math.min((frontLimit+rearLimit)*.6,Math.max(0,Math.abs(speed)-(r.gear==='R'?2.8:3))*(r.gear==='R'?4000:450))*(1-r.pedal*.6):0;
 const brakeLimit=(frontLimit+rearLimit)*foot+hand+resistance+engineBrake,hold=Math.min(brakeLimit,Math.abs(speed)*c.mass/dt),force=drive-Math.sign(speed)*hold-.45*speed*Math.abs(speed);
 kick(c,Math.cos(c.a)*force*dt,Math.sin(c.a)*force*dt);c.vy+=G*Math.sin(grade)*dt;t.vy+=supported/t.mass*G*Math.sin(trailerGrade)*dt;
 const waterDrag=500*clamp((d.frontDepth+d.rearDepth)*.5,0,2)*Math.hypot(c.vx,c.vy);c.vx/=1+waterDrag/c.mass*dt;c.vy/=1+waterDrag/c.mass*dt;
 const ts=t.vx*Math.cos(t.a)+t.vy*Math.sin(t.a),trailerBrake=(r.trailerPark?1:t.braked?foot*.7:0)*st.mu*tn,drag=Math.min(tn*st.rolling+trailerBrake,Math.abs(ts)*t.mass/dt);
 kick(t,-Math.sign(ts)*drag*Math.cos(t.a)*dt,-Math.sign(ts)*drag*Math.sin(t.a)*dt);
 const frontGrip=Math.sqrt(Math.max(.04,1-(ff/Math.max(1,frontLimit))**2)),rearGrip=Math.sqrt(Math.max(.025,1-(rf/Math.max(1,rearLimit))**2))*(r.handbrake?.18:1);
 r.frontGrip=frontGrip;r.rearGrip=rearGrip;
 tyre(c,SUV.wb/2,c.a+r.actualSteer,nf,muf*frontGrip,20000,dt);tyre(c,-SUV.wb/2,c.a,nr,mur*rearGrip,21000,dt);tyre(t,0,t.a,tn,st.mu,22000,dt);
 if(r.trailerPark){t.vx*=Math.exp(-dt*9);t.vy*=Math.exp(-dt*9);t.w*=Math.exp(-dt*9);}
 kick(t,r.ropeForce.x*dt,r.ropeForce.y*dt);t.w+=r.ropeForce.torque/t.iz*dt;r.ropeForce={x:0,y:0,torque:0};
 let drawbar=0;if(r.attached)for(let i=0;i<8;i++)drawbar+=hitch(r,dt);r.drawbarForce=drawbar;
 // Static braking at very low speed uses the same finite friction budget.
 // It holds a parked rig without integrating a small gravity creep each step.
 if((foot>.5||r.handbrake)&&Math.abs(speed)<.08){for(let i=0;i<10;i++){
  const u=c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a),j=clamp(-u*c.mass,-brakeLimit*dt/10,brakeLimit*dt/10);kick(c,Math.cos(c.a)*j,Math.sin(c.a)*j);
  const v=t.vx*Math.cos(t.a)+t.vy*Math.sin(t.a),jt=clamp(-v*t.mass,-trailerBrake*dt/10,trailerBrake*dt/10);kick(t,Math.cos(t.a)*jt,Math.sin(t.a)*jt);if(r.attached)hitch(r,dt);
 }}
 for(const q of [c,t]){q.x+=q.vx*dt;q.y+=q.vy*dt;q.a=wrap(q.a+q.w*dt);}
 roadContact(c,SUV.length,SUV.beam,r,dt);roadContact(t,b.spec.length,t.beam,r,dt);
 const previousAngle=r.articulation??0,articulation=Math.abs(wrap(t.a-c.a));r.articulation=articulation;
 if(r.attached&&articulation>1.22&&r.time-r.lastJackknife>.6&&(articulation>previousAngle+.005||Math.abs(c.w-t.w)*SUV.hitch+Math.hypot(c.vx,c.vy)*.25>.04)){
  const collisionSpeed=Math.abs(c.w-t.w)*SUV.hitch+Math.hypot(c.vx,c.vy)*.25,loss=Math.max(1,(articulation-1.20)*15+collisionSpeed*collisionSpeed*8);
  r.carDamage=clamp(r.carDamage+loss*.6,0,100);r.trailerDamage=clamp(r.trailerDamage+loss,0,100);r.hitchDamage=clamp(r.hitchDamage+loss*.65,0,100);r.lastJackknife=r.time;r.status='Złamanie zestawu · uszkodzenie SUV-a i przyczepy';
  if(r.secured&&r.boatLoaded){const p=bodyPoint(b,b.spec.length*.45);recordImpact(b,{arm:{x:p.x-b.x,y:p.y-b.y},speed:Math.max(.15,collisionSpeed),effective:b.spec.mass*.25,target:'suv',dock:false,damage:loss*.4});}
  if(r.hitchDamage>=100){r.attached=false;r.trailerPark=false;r.status='Zaczep zerwany · przyczepa odłączona';}
 }
 if(r.attached&&articulation>1.4){t.a=c.a+Math.sign(wrap(t.a-c.a))*1.4;t.w=c.w;c.vx*=.98;c.vy*=.98;const p=bodyPoint(c,-SUV.hitch);t.x=p.x-Math.cos(t.a)*t.hitch;t.y=p.y-Math.sin(t.a)*t.hitch;t.vx=p.vx+t.w*Math.sin(t.a)*t.hitch;t.vy=p.vy-t.w*Math.cos(t.a)*t.hitch;}
 en.load=running?clamp((Math.abs(drive)+drawbar*.5)/14000,0,1):0;en.gear=direction;en.thrust=drive;en.inflow=speed;
 const rpmTarget=en.key==='starting'?220:running?780+r.pedal*(['P','N'].includes(r.gear)?3600:1600)+Math.abs(speed)*95+en.load*900+r.slip*1200:0;
 en.rpm+=(rpmTarget-en.rpm)*(1-Math.exp(-dt/(running?.28:.12)));if(en.rpm<1)en.rpm=0;en.n=clamp(en.rpm/6000,0,1);en.temperature+=((running?87:18)-en.temperature)*dt/(running?100:450);
 r.fuel.flow=running?1.2+Math.abs(drive*speed)/735.5*.24+r.pedal*3:0;r.fuel.litres=Math.max(0,r.fuel.litres-r.fuel.flow/3600*dt);
 updateTowGeometry(r);if(r.boatLoaded&&r.secured)placeTrailerBoat(r,b);
}
export function trailerContact(r,b,dt){trailerBoatContact(r,b,dt);}
export function towAudioBoat(r,b){r.audioBoat??={};return Object.assign(r.audioBoat,{...b,suppressIgnitionAlarm:true,spec:{...b.spec,profile:'suv',jet:false},time:r.time,engines:[r.engine],throttle:r.pedal,throttle2:0,planing:0,telemetry:{surge:0,sway:0,thrust:0},thrusters:{},fuel:{refueling:false}});}
