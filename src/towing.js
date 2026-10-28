import {bridgeRailContact} from './bridge-road.js';
import {WILD_SLIP} from './port-yard.js';
import {automaticTransmission,roadSteering} from './car-transmission.js';
import {articulationStatus,trailerHitchLength,COUPLER_LIMIT} from './articulation.js';
import {createOperations,operationsStep,consumeOperatingFuel} from './operations.js';
import {clamp,bottomAt,SERVICE_STATION,PARKING,BUILDING_SOLIDS,DOCKS,BOLLARDS} from './world.js';
import {SUV_GEOMETRY,bodyPoint,bodyLocal,kick,frameZ,bunkZ,updateTowGeometry} from './tow-geometry.js';
import {vehicleSurface,vehicleGradient} from './vehicle-terrain.js';
import {lockedSupport,trailerBoatContact} from './trailer-support.js';
import {attachRope} from './rigging.js';
import {recordImpact} from './impacts.js';
import {createWinch,connectWinch,winchStep,loadingScoreStep} from './trailer-winch.js';
import {parkingContact,solveParkingContact} from './parking-brake.js';
import {circleSolidHit} from './solid-geometry.js';
export {bodyPoint,bodyLocal};
export const SUV=SUV_GEOMETRY;
const G=9.81,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const audioBoats=new WeakMap();
export const trailerBollardIndex=()=>BOLLARDS.findIndex(p=>p.trailer);
function body(x,y,a,mass,iz){return{x,y,a,mass,iz,vx:0,vy:0,w:0,z:0,pitch:0};}
export function createTowRig(b,{loaded=false,atSlip=false,slipCarY=7,misalignment=(loaded&&!atSlip ? .065 : 0)}={}){
 const S=b.spec,mass=220+S.length*65+Math.max(0,S.mass-1200)*.055,offset=.14*S.length,hitch=trailerHitchLength(S),a=-Math.PI/2;
 const car=body(124.5,atSlip?slipCarY:-32,a,SUV.mass,SUV.iz),hp=bodyPoint(car,-SUV.hitch);
 const trailerAngle=a+misalignment;
 const t=body(hp.x-Math.cos(trailerAngle)*hitch,hp.y-Math.sin(trailerAngle)*hitch,trailerAngle,mass,mass*(S.length*S.length+S.beam*S.beam)/12);
 Object.assign(t,{emptyMass:mass,hitch,offset,length:S.length+2.15,beam:Math.max(1.65,S.beam+.35),axles:mass+S.mass>4500?3:mass+S.mass>1800?2:1,braked:mass+S.mass>750,bunkHeight:.6+S.draft*.15});
 t.axleX=-S.length*(t.axles>1?.12:.06);
 const r={geometryVersion:1,car,trailer:t,boatLength:S.length,boatLoaded:loaded,secured:loaded,attached:true,trailerPark:false,handbrake:false,awd:false,frontSink:0,rearSink:0,carDamage:0,trailerDamage:0,hitchDamage:0,postBroken:false,lastJackknife:-10,
  gear:'P',steer:0,actualSteer:0,gas:0,brake:0,pedal:0,brakePedal:0,speed:0,time:0,slip:0,traction:1,grade:0,drawbarForce:0,contacts:0,ropeForce:{x:0,y:0,torque:0},status:loaded?'Łódź zabezpieczona · cuma dziobowa PRZ':'Pusta przyczepa na parkingu',
  engine:{key:'off',rpm:0,n:0,load:0,hp:SUV.hp,gear:0,temperature:18,startTime:0,immersion:0,ventilation:0,thrust:0,inflow:0,opposingFlow:0,trim:0,trimRate:0},fuel:{litres:65,capacity:75,flow:0}};
 r.operations=createOperations();r.winch=createWinch(S);r.loadingScore={active:false,best:0,quality:0,samples:0,angleSum:0,offsetSum:0};
 b.towRig=r;updateTowGeometry(r);updateTrailerMass(r,b);
 if(loaded){b.throttle=b.throttle2=0;for(const en of b.engines){en.key='off';en.rpm=en.n=en.gear=en.thrust=0;if(!S.jet&&!S.air&&S.propulsion!=='inboard')en.trim=en.trimTarget=1;}placeTrailerBoat(r,b);attachRope(b,'bow',trailerBollardIndex());connectWinch(r,b);}
 return r;
}
function updateTrailerMass(r,b){const t=r.trailer;t.mass=t.emptyMass+(r.secured&&r.boatLoaded?b.spec.mass:0);t.iz=t.mass*(b.spec.length**2+t.beam**2)/12;}
export function trailerPost(r){return bodyPoint(r.trailer,r.trailer.offset+r.boatLength*.59+.35);}
export function trailerTarget(r){return bodyPoint(r.trailer,r.trailer.offset);}
function carDepths(r){const rear=bodyPoint(r.car,-SUV.wb/2),front=bodyPoint(r.car,SUV.wb/2);return{rearDepth:Math.max(0,vehicleSurface(rear.x,rear.y).depth),frontDepth:Math.max(0,vehicleSurface(front.x,front.y).depth)};}
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
 if(gear==='R'||gear==='D')r.cameraDirection=gear==='R'?-1:1;
 r.gear=gear;r.gas=0;return{ok:true,message:'SUV · '+({P:'parking',R:'wsteczny',N:'luz',D:'naprzód'})[gear]};
}
export function stepCarGear(r,direction){const order=['P','R','N','D'];return selectCarGear(r,order[clamp(order.indexOf(r.gear)+direction,0,3)]);}
export function toggleHandbrake(r){r.handbrake=!r.handbrake;return{ok:true,message:'Hamulec ręczny '+(r.handbrake?'zaciągnięty':'zwolniony')};}
export function hitchStatus(r){
 const p=bodyPoint(r.car,-SUV.hitch),q=bodyPoint(r.trailer,r.trailer.hitch),distance=Math.hypot(p.x-q.x,p.y-q.y),angle=Math.abs(wrap(r.car.a-r.trailer.a));
 const stopped=Math.max(Math.hypot(r.car.vx,r.car.vy),Math.hypot(r.trailer.vx,r.trailer.vy))<.20;
 return{p,q,distance,angle,ready:stopped&&distance<=.8&&angle<=.60&&r.hitchDamage<100};
}
export function hitchAction(r){
 if(Math.max(Math.hypot(r.car.vx,r.car.vy),Math.hypot(r.trailer.vx,r.trailer.vy))>.20)return{ok:false,message:'Zatrzymaj samochód i przyczepę.'};
 if(r.attached){const t=r.trailer,p=bodyPoint(t,t.offset-r.boatLength*.4);if(Math.max(bottomAt(t.x,t.y).depth,bottomAt(p.x,p.y).depth)>.02)return{ok:false,message:'Odczep przyczepę na lądzie.'};r.attached=false;r.trailerPark=true;updateTowGeometry(r);r.status='Przyczepa odczepiona · hamulec postojowy i podpora';return{ok:true,message:r.status};}
 const {p,q,distance,angle}=hitchStatus(r);
 if(distance>.8||angle>.60)return{ok:false,message:`Hak → zaczep: ${distance.toFixed(2)} m · kąt ${Math.round(angle*180/Math.PI)}°. Podjedź na 80 cm i ustaw kąt poniżej 34°.`};
 if(r.hitchDamage>=100)return{ok:false,message:'Zaczep zniszczony · użyj resetu SUV-a na parkingu.'};
 // Capture only the nearby coupler, keeping the parked trailer and boat fixed.
 // Removing the joint error before solving avoids a violent first-step impulse.
 r.car.x+=q.x-p.x;r.car.y+=q.y-p.y;
 for(const body of [r.car,r.trailer])body.vx=body.vy=body.w=0;
 r.attached=true;r.trailerPark=false;updateTowGeometry(r);r.status='Przyczepa przyczepiona';return{ok:true,message:r.status};
}
export function resetTowVehicle(r,b){
 const carry=r.attached&&r.boatLoaded&&r.secured;
 if(r.attached){r.trailer.hitch=trailerHitchLength(b.spec);r.geometryVersion=1;}
 const c=r.car;c.x=r.attached?124.5:137;c.y=-32;c.a=-Math.PI/2;c.vx=c.vy=c.w=0;
 r.gear='P';r.cameraDirection=0;r.handbrake=true;r.steer=r.actualSteer=r.gas=r.brake=r.pedal=r.brakePedal=0;
 r.frontSink=r.rearSink=r.slip=r.carDamage=r.hitchDamage=0;r.engine.key='off';r.engine.rpm=r.engine.n=r.engine.thrust=r.engine.load=r.engine.startTime=0;r.speed=r.drawbarForce=0;
 if(r.attached){
  const t=r.trailer;t.a=c.a+.065;const p=bodyPoint(c,-SUV.hitch);t.x=p.x-Math.cos(t.a)*t.hitch;t.y=p.y-Math.sin(t.a)*t.hitch;t.vx=t.vy=t.w=0;
  r.trailerDamage=0;r.postBroken=false;r.ropeForce={x:0,y:0,torque:0};
  if(!carry){b.ropes=b.ropes.filter(line=>line.bollard!==trailerBollardIndex());r.boatLoaded=r.secured=false;}
  r.winch.attached=false;r.winch.control=0;r.winch.broken=false;
  updateTrailerMass(r,b);updateTowGeometry(r);if(carry)placeTrailerBoat(r,b);
  if(carry)connectWinch(r,b);
 }
 updateTowGeometry(r);r.status='SUV ustawiony na parkingu · P i ręczny · stan łodzi zachowany';
 return{ok:true,message:r.status};
}
export function resetTowTrailer(r,b){
 const carry=r.boatLoaded&&r.secured,t=r.trailer;
 // Recover only the trailer. The SUV and any already-launched boat stay put.
 // A detached bay east of the ramp leaves space to reverse up to its coupler.
 r.attached=false;r.trailerPark=true;t.hitch=trailerHitchLength(b.spec);r.geometryVersion=1;t.x=151;t.y=-23;t.a=-Math.PI/2;t.vx=t.vy=t.w=0;
 r.trailerDamage=r.hitchDamage=0;r.postBroken=false;r.ropeForce={x:0,y:0,torque:0};r.drawbarForce=0;r.articulation=0;r.unloadedTime=0;
 if(!carry){b.ropes=b.ropes.filter(line=>line.bollard!==trailerBollardIndex());r.boatLoaded=r.secured=false;}
 r.winch.attached=false;r.winch.control=r.winch.rate=r.winch.tension=0;r.winch.broken=false;
 r.loadingScore={active:false,best:0,quality:0,samples:0,angleSum:0,offsetSum:0};
 updateTrailerMass(r,b);updateTowGeometry(r);if(carry){placeTrailerBoat(r,b);connectWinch(r,b);}
 r.status='Przyczepa na stanowisku parkingowym · odczepiona, podparta i zahamowana';return{ok:true,message:r.status};
}
export function placeTrailerBoat(r,b){
 updateTowGeometry(r);const t=r.trailer,pose=r.securedPose??{x:t.offset,y:0,angle:0},p=bodyPoint(t,pose.x,pose.y);b.x=p.x;b.y=p.y;b.a=t.a+pose.angle;b.vx=p.vx;b.vy=p.vy;b.w=t.w;b.pitch=t.pitch;b.roll=0;
 b.heave=bunkZ(t,pose.x)+b.spec.draft;b.heaveVelocity=0;b.pitchVelocity=0;b.rollVelocity=0;b.planing=0;b.grounded=false;b.underKeel=t.bunkHeight;b.groundLoad=0;b.cameraZoom=1;
 b.telemetry={surge:0,sway:0,thrust:0,drag:0,shaftPower:0,acceleration:0};lockedSupport(r,b);
}
export function trailerAction(r,b,action){
 if(action==='release'){if(!r.boatLoaded)return{ok:false,message:'Przyczepa jest pusta.'};r.secured=false;b.launchMotion=true;r.unloadedTime=0;updateTrailerMass(r,b);r.status='Zabezpieczenia zwolnione · łódź może się zsunąć, cuma PRZ trzyma dziób';return{ok:true,message:r.status};}
 if(r.secured&&r.boatLoaded)return{ok:true,message:'Łódź zabezpieczona na przyczepie'};
 const allowed=securingStatus(r,b);if(!allowed.ok)return allowed;const p=allowed.local;
 loadingScoreStep(r,b,0);if(r.loadingScore.active){r.loadingScore.active=false;r.loadingScore.complete=true;}
 // Straps fix the achieved pose. They cannot finish a mediocre approach by
 // teleporting the hull onto an ideal centreline or improve its frozen score.
 r.securedPose={x:p.x,y:p.y,angle:wrap(b.a-r.trailer.a)};
 r.boatLoaded=r.secured=true;b.launchMotion=false;updateTrailerMass(r,b);placeTrailerBoat(r,b);r.status='Łódź zabezpieczona na przyczepie';return{ok:true,message:r.status};
}
export function securingStatus(r,b){
 const p=bodyLocal(r.trailer,b),d=trailerImmersion(r,b),v=trailerTarget(r);
 const supported=(b.trailerSupport?.load??0)>b.spec.mass*9.81*.08;
 // Depth controls floating onto the cradle, not the straps. Once supported,
 // an aligned boat can be strapped on a shallow ramp or completely on land.
 if(!r.boatLoaded&&!supported&&d.tooDeep)return{ok:false,message:'Przyczepa za głęboko · podjedź SUV-em do przodu.'};
 if(!r.boatLoaded&&!supported&&d.tooShallow)return{ok:false,message:'Łódź nie spoczywa na podporach · wprowadź ją wciągarką albo zanurz przyczepę.'};
 if(Math.abs(p.y)>b.spec.beam*.2+.1||Math.abs(p.x-r.trailer.offset)>.70||Math.abs(wrap(b.a-r.trailer.a))>.20)return{ok:false,message:'Wprowadź łódź prosto między prowadnice, dziobem do polera PRZ.'};
 if(Math.hypot(b.vx-v.vx,b.vy-v.vy)>.3||Math.hypot(r.car.vx,r.car.vy)>.15)return{ok:false,message:'Zatrzymaj samochód i łódź przed zabezpieczeniem.'};
 if(!r.winch.attached&&!b.ropes.some(q=>q.end==='bow'&&q.bollard===trailerBollardIndex()))return{ok:false,message:'Podepnij wciągarkę lub cumę dziobową do przyczepy.'};
 if(b.ropes.some(q=>q.bollard!==trailerBollardIndex())||b.anchor.mode!=='stowed')return{ok:false,message:'Odepnij cumy od brzegu i wybierz kotwicę przed załadunkiem.'};
 return{ok:true,message:'Gotowa do zabezpieczenia · zapnij pasy',local:p};
}
function rampGrade(p){for(const q of[SERVICE_STATION.slip,WILD_SLIP])if(p.x>q.x&&p.x<q.x+q.w&&p.y>q.y&&p.y<q.y+q.h)return q.angle*Math.PI/180;return 0;}
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
 const obstacles=[...BUILDING_SOLIDS,...DOCKS,...(r.parkedTrailers??[]).map(q=>{const t=q.trailer,L=q.boatLength+1;return{pose:{x:t.x,y:t.y,a:t.a,length:L,width:t.beam},x:t.x-L,y:t.y-L,w:L*2,h:L*2};})];
 // The training area is bounded on land; the ramp and water remain accessible.
 const parked=q===r.car?r.gear==='P'||r.handbrake:r.trailerPark||r.attached&&(r.gear==='P'||r.handbrake);
 for(const x of [-length*.38,0,length*.38]){const p=bodyPoint(q,x),radius=beam*.48;
  let corrections=[];
  for(const o of obstacles){const hit=circleSolidHit(p,radius,o);if(hit)corrections.push({nx:hit.n.x,ny:hit.n.y,d:hit.depth});}
  for(const hit of corrections){
   if(parked&&Math.hypot(q.vx,q.vy)<.15){
    // A resting penetration has a bounded separating bias, not an unbraked
    // position teleport. The wheel solver below may hold this finite impulse.
    const normal=Math.min(q.mass*G*.12,hit.d*q.mass*20)*dt,arm={x:p.x-q.x,y:p.y-q.y};
    kick(q,hit.nx*normal,hit.ny*normal,arm.x,arm.y);continue;
   }
   q.x+=hit.nx*hit.d*.45;q.y+=hit.ny*hit.d*.45;const arm={x:p.x-q.x,y:p.y-q.y},lever=arm.x*hit.ny-arm.y*hit.nx,closing=p.vx*hit.nx+p.vy*hit.ny;if(closing<0){const j=-closing/(1/q.mass+lever*lever/q.iz);kick(q,j*hit.nx,j*hit.ny,arm.x,arm.y);if(closing<-.3){r.contacts++;r.status='Kontakt zestawu z przeszkodą';}}}
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
 const front=bodyPoint(c,SUV.wb/2),rear=bodyPoint(c,-SUV.wb/2),axle=bodyPoint(t,t.axleX),sf=vehicleSurface(front.x,front.y),sr=vehicleSurface(rear.x,rear.y),st=vehicleSurface(axle.x,axle.y);
 const supportKg=b.trailerSupport?.near?b.trailerSupport.kg:0;
 const supported=t.emptyMass+supportKg,tongueSupport=(t.emptyMass*(-t.axleX)/(t.hitch-t.axleX)+supportKg*(t.offset-t.axleX)/(t.hitch-t.axleX))*G,tongue=r.attached?tongueSupport:0;
 const baseNormal=SUV.mass*G*clamp(1-Math.max(0,d.frontDepth+d.rearDepth-.65)*.4,.2,1)*Math.cos(grade),transfer=baseNormal*Math.sin(c.pitch)*.22;
 const nf=Math.max(baseNormal*.20,baseNormal*.48-tongue*.4-transfer),nr=Math.max(baseNormal*.20,baseNormal*.52+tongue*1.4+transfer),tn=Math.max(0,supported*G-tongueSupport)*Math.cos(trailerGrade);
 const nominalAxle=SUV.mass*G*.5,frontSoil=sf.soft?1+.45*Math.max(0,nf/nominalAxle-1):1,rearSoil=sr.soft?1+.45*Math.max(0,nr/nominalAxle-1):1;
 const muf=sf.mu/frontSoil*clamp(1-r.frontSink*1.8,.25,1),mur=sr.mu/rearSoil*clamp(1-r.rearSink*1.8,.25,1),frontLimit=muf*nf,rearLimit=mur*nr;
 const transmission=automaticTransmission(r,speed,dt),maxSpeed=r.gear==='R'?3.2:27,command=running&&direction?direction*(450+12650*r.pedal)*transmission.forceScale*transmission.powerScale*clamp((maxSpeed-Math.abs(speed))/.8,0,1)*Math.max(0,1-r.carDamage/100):0;
 const wanted=clamp(command,-150000*(.06+.94*r.pedal)/Math.max(1.5,Math.abs(speed)),150000*(.06+.94*r.pedal)/Math.max(1.5,Math.abs(speed)));
 const frontWanted=r.awd?wanted*.5:0,rearWanted=r.awd?wanted*.5:wanted;
 const tyreSteer=roadSteering(r.actualSteer,speed,SUV.wb,Math.min(muf,mur));r.tyreSteer=tyreSteer;
 const frontSide=-front.vx*Math.sin(c.a+tyreSteer)+front.vy*Math.cos(c.a+tyreSteer),rearSide=-rear.vx*Math.sin(c.a)+rear.vy*Math.cos(c.a);
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
 const engineBrake=running&&direction?Math.min((frontLimit+rearLimit)*.6,Math.max(0,Math.abs(speed)-(r.gear==='R'?2.8:3))*(r.gear==='R'?4000:450))*(1-r.pedal)**2:0;
 const brakeLimit=(frontLimit+rearLimit)*foot+hand+resistance+engineBrake,hold=Math.min(brakeLimit,Math.abs(speed)*c.mass/dt),force=-Math.sign(speed)*hold-.45*speed*Math.abs(speed);
 kick(c,Math.cos(c.a)*force*dt,Math.sin(c.a)*force*dt);
 // Each driven axle pushes along its own wheel heading. Rear saturation
 // produces power oversteer on loose ground; AWD retains front-wheel pull.
 for(const [f,x,a]of[[ff,SUV.wb/2,c.a+tyreSteer],[rf,-SUV.wb/2,c.a]]){const p=bodyPoint(c,x);kick(c,Math.cos(a)*f*dt,Math.sin(a)*f*dt,p.x-c.x,p.y-c.y);}
 // Tyre/suspension deformation dissipates part of a kerb strike. Gravity
 // still supplies the climb/descent; this finite loss prevents gaining speed.
 r.curbWheels??={};for(const [key,surface,normal]of[['front',sf,nf],['rear',sr,nr]]){const entered=surface.curb>.008&&!r.curbWheels[key];if(entered&&Math.abs(speed)>.2){const v=Math.hypot(c.vx,c.vy),loss=normal*.07*.6,factor=Math.sqrt(Math.max(0,1-2*loss/(c.mass*v*v)));c.vx*=factor;c.vy*=factor;r.curbEvent=(r.curbEvent??0)+1;r.curbStrength=clamp(Math.abs(speed)*.07,.02,.3);r.lastCurbAt=r.time;}if(surface.curb>.008)r.curbWheels[key]=true;else if(surface.curb<.003)r.curbWheels[key]=false;}

 const gf=vehicleGradient(front.x,front.y),gr=vehicleGradient(rear.x,rear.y),gt=vehicleGradient(axle.x,axle.y);
 for(const [body,gradient,normal]of [[c,gf,nf],[c,gr,nr],[t,gt,tn]]){
  const factor=normal*dt/Math.hypot(1,gradient.x,gradient.y);
  kick(body,-gradient.x*factor,-gradient.y*factor);
 }
 if(!r.attached){const p=bodyPoint(t,t.hitch),g=vehicleGradient(p.x,p.y),factor=tongueSupport*dt/Math.hypot(1,g.x,g.y);kick(t,-g.x*factor,-g.y*factor,p.x-t.x,p.y-t.y);}
 const waterDrag=500*clamp((d.frontDepth+d.rearDepth)*.5,0,2)*Math.hypot(c.vx,c.vy);c.vx/=1+waterDrag/c.mass*dt;c.vy/=1+waterDrag/c.mass*dt;
 const ts=t.vx*Math.cos(t.a)+t.vy*Math.sin(t.a),trailerBrake=(r.trailerPark?1:t.braked?foot*.7:0)*st.mu*tn,drag=Math.min(tn*st.rolling+trailerBrake,Math.abs(ts)*t.mass/dt);
 kick(t,-Math.sign(ts)*drag*Math.cos(t.a)*dt,-Math.sign(ts)*drag*Math.sin(t.a)*dt);
 const frontGrip=Math.sqrt(Math.max(.04,1-(ff/Math.max(1,frontLimit))**2)),rearGrip=Math.sqrt(Math.max(sr.material==='concrete'?.025:.0025,1-(rf/Math.max(1,rearLimit))**2))*(sr.material==='concrete'?1:1-.65*r.rearSlip)*(r.handbrake?.18:1);
 r.frontGrip=frontGrip;r.rearGrip=rearGrip;
 tyre(c,SUV.wb/2,c.a+tyreSteer,nf,muf*frontGrip,70000,dt);tyre(c,-SUV.wb/2,c.a,nr,mur*rearGrip,80000,dt);tyre(t,t.axleX,t.a,tn,st.mu,22000,dt);
 kick(t,r.ropeForce.x*dt,r.ropeForce.y*dt);t.w+=r.ropeForce.torque/t.iz*dt;r.ropeForce={x:0,y:0,torque:0};
 let drawbar=0;if(r.attached)for(let i=0;i<8;i++)drawbar+=hitch(r,dt);r.drawbarForce=drawbar;
 // Terrain contacts must go through the same finite parking friction. Direct
 // position correction AFTER braking used to walk a skewed, stationary rig
 // down the ramp, even while P and the handbrake held all wheel velocities.
 roadContact(c,SUV.length,SUV.beam,r,dt);roadContact(t,b.spec.length,t.beam,r,dt);bridgeRailContact(r,c,SUV.length,SUV.beam,dt);bridgeRailContact(r,t,b.spec.length,t.beam,dt);
 // Static braking at very low speed uses the same finite friction budget.
 // It holds a parked rig without integrating a small gravity creep each step.
 const parking=[];
 if((foot>.5||r.handbrake)&&Math.hypot(c.vx,c.vy)<.15){
  for(const side of[-1,1]){
   if(foot>.5)parking.push(parkingContact(c,SUV.wb/2,side*SUV.beam*.4,nf*.5,muf*foot,dt));
   parking.push(parkingContact(c,-SUV.wb/2,side*SUV.beam*.4,nr*.5,mur*Math.max(foot,r.handbrake?1:0),dt));
  }
 }
 if((r.trailerPark||r.attached&&t.braked&&foot>.5)&&Math.hypot(t.vx,t.vy)<.15){
  for(const side of[-1,1])parking.push(parkingContact(t,t.axleX,side*t.beam*.4,tn*.5,st.mu*(r.trailerPark?1:foot*.7),dt));
  if(!r.attached){const p=bodyPoint(t,t.hitch),surface=vehicleSurface(p.x,p.y);parking.push(parkingContact(t,t.hitch,0,tongueSupport,surface.mu,dt));}
 }
 for(let i=0;i<20&&parking.length;i++){for(const contact of parking)solveParkingContact(contact);if(r.attached)hitch(r,dt);}
 for(const q of [c,t]){q.x+=q.vx*dt;q.y+=q.vy*dt;q.a=wrap(q.a+q.w*dt);}
 const previousAngle=r.articulation??0,articulation=Math.abs(wrap(t.a-c.a));r.articulation=articulation;const joint=articulationStatus(r,b);r.articulationClearance=joint.clearance;r.articulationWarning=joint.warning;
 if(r.attached&&joint.contact&&r.time-r.lastJackknife>.6&&(articulation>previousAngle+.005||Math.abs(c.w-t.w)*SUV.hitch+Math.hypot(c.vx,c.vy)*.25>.04)){
  const collisionSpeed=Math.abs(c.w-t.w)*SUV.hitch+Math.hypot(c.vx,c.vy)*.25,loss=Math.max(1,joint.penetration*15+collisionSpeed*collisionSpeed*8);
  r.carDamage=clamp(r.carDamage+loss*.6,0,100);r.trailerDamage=clamp(r.trailerDamage+loss,0,100);r.hitchDamage=clamp(r.hitchDamage+loss*.65,0,100);r.lastJackknife=r.time;r.status='Złamanie zestawu · uszkodzenie SUV-a i przyczepy';
  if(r.secured&&r.boatLoaded){const p=bodyPoint(b,b.spec.length*.45);recordImpact(b,{arm:{x:p.x-b.x,y:p.y-b.y},speed:Math.max(.15,collisionSpeed),effective:b.spec.mass*.25,target:'suv',dock:false,damage:loss*.4});}
  if(r.hitchDamage>=100){r.attached=false;r.trailerPark=false;r.status='Zaczep zerwany · przyczepa odłączona';}
 }
 if(r.attached&&articulation>COUPLER_LIMIT){t.a=c.a+Math.sign(wrap(t.a-c.a))*COUPLER_LIMIT;t.w=c.w;c.vx*=.98;c.vy*=.98;const p=bodyPoint(c,-SUV.hitch);t.x=p.x-Math.cos(t.a)*t.hitch;t.y=p.y-Math.sin(t.a)*t.hitch;t.vx=p.vx+t.w*Math.sin(t.a)*t.hitch;t.vy=p.vy-t.w*Math.cos(t.a)*t.hitch;}
 en.load=running?clamp((Math.abs(drive)+drawbar*.5)/14000,0,1):0;en.gear=direction;en.thrust=drive;en.inflow=speed;
 const rpmTarget=en.key==='starting'?220:running?(['P','N'].includes(r.gear)?780+r.pedal*3600:Math.max(780,transmission.rpm)+r.pedal*750+en.load*350+r.slip*1200):0;
 en.rpm+=(rpmTarget-en.rpm)*(1-Math.exp(-dt/(running?.28:.12)));if(en.rpm<1)en.rpm=0;en.n=clamp(en.rpm/6000,0,1);en.temperature+=((running?87:18)-en.temperature)*dt/(running?100:450);
 en.fuelFlow=running?1.2+Math.abs(drive*speed)/735.5*.24+r.pedal*3:0;
 consumeOperatingFuel(r.fuel,[en],r.operations,dt);operationsStep(r.operations,[en],c,dt);
 r.tyreSlip=r.slip*r.pedal*(r.surface==='concrete'?clamp(Math.max(d.frontDepth,d.rearDepth)/.08,.15,1):.7);
 updateTowGeometry(r);if(r.boatLoaded&&r.secured)placeTrailerBoat(r,b);
}
export function trailerContact(r,b,dt){winchStep(r,b,dt);trailerBoatContact(r,b,dt);loadingScoreStep(r,b,dt);}
export function towAudioBoat(r,b){let voice=audioBoats.get(r);if(!voice){voice={};audioBoats.set(r,voice);}return Object.assign(voice,{...b,tyreSlip:r.tyreSlip??0,curbEvent:r.curbEvent??0,curbStrength:r.curbStrength??0,suppressIgnitionAlarm:true,spec:{...b.spec,profile:'suv',jet:false,racing:false,diesel:false},time:r.time,engines:[r.engine],throttle:r.pedal,throttle2:0,planing:0,telemetry:{surge:0,sway:0,thrust:0},thrusters:{},fuel:{refueling:false}});}
