import {clamp,bottomAt,SERVICE_STATION,PARKING,BUILDINGS,DOCKS,BOLLARDS} from './world.js';

// SI planar rigid bodies, longitudinal tyre force and lateral tyre slip. The
// two-dimensional ball hitch transmits impulses, not a prescribed trailer angle.
const G=9.81,MAX_STEER=34*Math.PI/180;
export const SUV={length:4.9,beam:2,wb:2.9,hitch:2.75,mass:2400,iz:5400,hp:250,maxSteer:MAX_STEER,wheelTurns:2.5};
export const trailerBollardIndex=()=>BOLLARDS.findIndex(p=>p.trailer);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function bodyPoint(q,x=0,y=0){const c=Math.cos(q.a),s=Math.sin(q.a);return{x:q.x+c*x-s*y,y:q.y+s*x+c*y,vx:q.vx-q.w*(s*x+c*y),vy:q.vy+q.w*(c*x-s*y)};}
export function bodyLocal(q,p){const c=Math.cos(q.a),s=Math.sin(q.a),x=p.x-q.x,y=p.y-q.y;return{x:c*x+s*y,y:-s*x+c*y};}
function kick(q,jx,jy,x=0,y=0){q.vx+=jx/q.mass;q.vy+=jy/q.mass;q.w+=(x*jy-y*jx)/q.iz;}
function body(x,y,a,mass,iz){return{x,y,a,mass,iz,vx:0,vy:0,w:0};}
export function createTowRig(b,{loaded=false,atSlip=false}={}){
 const S=b.spec,mass=220+S.length*65+Math.max(0,S.mass-1200)*.055;
 const hitch=.55*S.length+1,offset=.08*S.length,a=-Math.PI/2;
 const car=body(124.5,atSlip?9:-32,a,SUV.mass,SUV.iz);
 const hp=bodyPoint(car,-SUV.hitch),t=body(hp.x-Math.cos(a)*hitch,hp.y-Math.sin(a)*hitch,a,mass,mass*(S.length*S.length+S.beam*S.beam)/12);
 Object.assign(t,{emptyMass:mass,hitch,offset,length:S.length+1.7,beam:Math.max(1.65,S.beam+.35),axles:mass+S.mass>4500?3:mass+S.mass>1800?2:1,braked:mass+S.mass>750,bunkHeight:.6+S.draft*.15});
 const rig={car,trailer:t,boatLength:S.length,boatLoaded:loaded,secured:loaded,gear:'P',steer:0,actualSteer:0,gas:0,brake:0,pedal:0,speed:0,time:0,slip:0,traction:1,grade:0,drawbarForce:0,contacts:0,ropeForce:{x:0,y:0,torque:0},status:loaded?'Łódź zabezpieczona na przyczepie':'Pusta przyczepa na parkingu',
 engine:{key:'off',rpm:0,n:0,load:0,hp:SUV.hp,gear:0,temperature:18,startTime:0,immersion:0,ventilation:0,thrust:0,inflow:0,opposingFlow:0,trim:0,trimRate:0},fuel:{litres:65,capacity:75,flow:0}};
 b.towRig=rig;updateTrailerMass(rig,b);if(loaded){b.throttle=b.throttle2=0;for(const en of b.engines){en.key='off';en.rpm=0;en.n=0;en.gear=0;en.thrust=0;}placeTrailerBoat(rig,b);}return rig;
}
function updateTrailerMass(r,b){const t=r.trailer;t.mass=t.emptyMass+(r.boatLoaded?b.spec.mass:0);t.iz=t.mass*(b.spec.length**2+t.beam**2)/12;}
export function trailerPost(r){const t=r.trailer;return bodyPoint(t,t.offset+r.boatLength*.46+.2);}
export function trailerTarget(r){return bodyPoint(r.trailer,r.trailer.offset);}
function carDepths(r){const rear=bodyPoint(r.car,-SUV.wb/2),front=bodyPoint(r.car,SUV.wb/2);return{rearDepth:Math.max(0,bottomAt(rear.x,rear.y).depth),frontDepth:Math.max(0,bottomAt(front.x,front.y).depth)};}
export function trailerImmersion(r,b){
 const t=r.trailer,p=trailerTarget(r,b),depth=bottomAt(p.x,p.y).depth;
 const buoyancy=clamp((depth-t.bunkHeight)/b.spec.draft,0,1);
 const {rearDepth,frontDepth}=carDepths(r);
 return{depth,bunkDepth:depth-t.bunkHeight,buoyancy,rearDepth,frontDepth,tooDeep:depth>t.bunkHeight+b.spec.draft+.45,tooShallow:depth<t.bunkHeight+b.spec.draft*.25};
}
export function carKey(r,direction){
 const en=r.engine;
 if(direction<0){en.key='off';r.gas=0;return{ok:true,message:'SUV · zapłon wyłączony'};}
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
export function placeTrailerBoat(r,b){
 const t=r.trailer,p=trailerTarget(r,b),depth=bottomAt(p.x,p.y).depth;
 b.x=p.x;b.y=p.y;b.a=t.a;b.vx=p.vx;b.vy=p.vy;b.w=t.w;b.pitch=-r.grade*Math.sin(t.a);b.roll=0;
 b.heave=t.bunkHeight-depth+b.spec.draft;b.heaveVelocity=0;b.pitchVelocity=0;b.rollVelocity=0;b.planing=0;b.grounded=false;b.underKeel=t.bunkHeight;b.groundLoad=0;b.cameraZoom=1;
 b.telemetry={surge:0,sway:0,thrust:0,drag:0,shaftPower:0,acceleration:0};
}
export function trailerAction(r,b,action){
 if(action==='release'){
  if(!r.boatLoaded)return{ok:false,message:'Przyczepa jest pusta.'};
  if(Math.hypot(r.car.vx,r.car.vy)>.12)return{ok:false,message:'Zatrzymaj zestaw przed zwolnieniem zabezpieczeń.'};
  if(b.engines.some(en=>en.key!=='off'))return{ok:false,message:'Wyłącz silniki łodzi przed wodowaniem.'};
  r.secured=false;r.status='Zabezpieczenia zwolnione · łódź spłynie po zanurzeniu podpór';return{ok:true,message:r.status};
 }
 if(r.boatLoaded){r.secured=true;r.status='Łódź zabezpieczona na przyczepie';return{ok:true,message:r.status};}
 const p=bodyLocal(r.trailer,b),d=trailerImmersion(r,b),v=trailerTarget(r,b);
 if(d.tooDeep)return{ok:false,message:'Przyczepa za głęboko · podjedź SUV-em do przodu.'};
 if(d.tooShallow)return{ok:false,message:'Przyczepa za płytko · zanurz podpory, cofając SUV-em.'};
 if(Math.abs(p.y)>b.spec.beam*.2+.1||Math.abs(p.x-r.trailer.offset)>.65||Math.abs(wrap(b.a-r.trailer.a))>.20)return{ok:false,message:'Wprowadź łódź prosto między prowadnice, dziobem do polera PRZ.'};
 if(Math.hypot(b.vx-v.vx,b.vy-v.vy)>.3||Math.hypot(r.car.vx,r.car.vy)>.15)return{ok:false,message:'Zatrzymaj samochód i łódź przed zabezpieczeniem.'};
 if(b.engines.some(en=>en.key!=='off'))return{ok:false,message:'Wyłącz silniki łodzi przed zabezpieczeniem na przyczepie.'};
 if(!b.ropes.some(q=>q.end==='bow'&&q.bollard===trailerBollardIndex()))return{ok:false,message:'Załóż cumę dziobową na poler PRZ na przodzie przyczepy.'};
 if(b.ropes.some(q=>q.bollard!==trailerBollardIndex())||b.anchor.mode!=='stowed')return{ok:false,message:'Odepnij cumy od brzegu i wybierz kotwicę przed załadunkiem.'};
 r.boatLoaded=r.secured=true;updateTrailerMass(r,b);placeTrailerBoat(r,b);r.status='Łódź zabezpieczona na przyczepie';return{ok:true,message:r.status};
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
 r.time+=dt;r.boatLength=b.spec.length;updateTrailerMass(r,b);const c=r.car,t=r.trailer,en=r.engine,d=trailerImmersion(r,b),grade=rampGrade(c),trailerGrade=rampGrade(t);r.grade=trailerGrade;
 if(en.key==='starting'){en.startTime+=dt;if(en.startTime>.85)en.key='running';}
 if(d.frontDepth>.9&&['running','starting'].includes(en.key)){en.key='ignition';r.gas=0;r.status='Silnik zgasł · dolot SUV-a pod wodą';}
 if(r.fuel.litres<=0&&en.key==='running')en.key='ignition';
 r.actualSteer+=clamp(r.steer-r.actualSteer,-1.2*dt,1.2*dt);r.pedal+=(clamp(r.gas,0,1)-r.pedal)*(1-Math.exp(-dt/.25));
 const speed=c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a),direction=r.gear==='D'?1:r.gear==='R'?-1:0,running=en.key==='running';r.speed=speed;
 const mu=d.rearDepth>.03?.44-.22*clamp(d.rearDepth/.75,0,1):.78;
 const carNormal=(SUV.mass*G+(t.emptyMass+(r.boatLoaded?b.spec.mass*(1-d.buoyancy):0))*G*.08)*clamp(1-Math.max(0,d.frontDepth+d.rearDepth-.65)*.40,.20,1)*Math.cos(grade);
 const trailerNormal=(t.emptyMass+(r.boatLoaded?b.spec.mass*(1-d.buoyancy):0))*G*.92*Math.cos(trailerGrade);
 const maxSpeed=r.gear==='R'?3.2:13;
 const limit=mu*carNormal,engineForce=running&&direction?direction*(600+12500*r.pedal)*clamp((maxSpeed-Math.abs(speed))/.8,0,1):0;
 const powerLimit=150000*(.08+.92*r.pedal)/Math.max(1.5,Math.abs(speed));
 const wanted=clamp(engineForce,-powerLimit,powerLimit),drive=clamp(wanted,-limit,limit);r.slip=clamp((Math.abs(wanted)-limit)/Math.max(1,Math.abs(wanted)),0,1);r.traction=mu;
 const brake=r.gear==='P'?1:clamp(r.brake,0,1),resistance=carNormal*.015;
 const engineBraking=running&&direction?Math.min(limit*.75,Math.max(0,Math.abs(speed)-(r.gear==='R'?2.8:3))*(r.gear==='R'?4000:450))*(1-r.pedal*.6):0;
 const hold=Math.min(limit*brake+resistance+engineBraking,Math.abs(speed)*c.mass/dt),longForce=drive-Math.sign(speed)*hold-.45*speed*Math.abs(speed);
 kick(c,Math.cos(c.a)*longForce*dt,Math.sin(c.a)*longForce*dt);
 c.vy+=G*Math.sin(grade)*dt;
 const supported=t.emptyMass+(r.boatLoaded?b.spec.mass*(1-d.buoyancy):0);t.vy+=supported/t.mass*G*Math.sin(trailerGrade)*dt;
 const wetCar=clamp((d.frontDepth+d.rearDepth)*.5,0,2),carWaterDrag=500*wetCar*Math.hypot(c.vx,c.vy);c.vx/=1+carWaterDrag/c.mass*dt;c.vy/=1+carWaterDrag/c.mass*dt;
 const ts=t.vx*Math.cos(t.a)+t.vy*Math.sin(t.a),trailerBrake=(t.braked?brake*.7:0)*mu*trailerNormal;
 const drag=Math.min(trailerNormal*.018+trailerBrake,Math.abs(ts)*t.mass/dt);kick(t,-Math.sign(ts)*drag*Math.cos(t.a)*dt,-Math.sign(ts)*drag*Math.sin(t.a)*dt);
 // P locks all wheels, including lateral motion at a standstill; friction is
 // still finite, so a submerged/overloaded tow vehicle can slide down the ramp.
 if(brake>.1){const side=-c.vx*Math.sin(c.a)+c.vy*Math.cos(c.a),j=clamp(-side*c.mass,-limit*brake*dt,limit*brake*dt);kick(c,-Math.sin(c.a)*j,Math.cos(c.a)*j);}
 const grip=Math.sqrt(Math.max(.08,1-(Math.abs(drive)/Math.max(1,limit))**2));
 tyre(c,SUV.wb/2,c.a+r.actualSteer,carNormal*.48,mu*grip,18000,dt);tyre(c,-SUV.wb/2,c.a,carNormal*.52,mu*grip,19000,dt);tyre(t,0,t.a,trailerNormal,mu,22000,dt);
 kick(t,r.ropeForce.x*dt,r.ropeForce.y*dt);t.w+=r.ropeForce.torque/t.iz*dt;r.ropeForce={x:0,y:0,torque:0};
 let drawbar=0;for(let i=0;i<8;i++)drawbar+=hitch(r,dt);r.drawbarForce=drawbar;
 for(const q of [c,t]){q.x+=q.vx*dt;q.y+=q.vy*dt;q.a=wrap(q.a+q.w*dt);}
 roadContact(c,SUV.length,SUV.beam,r,dt);roadContact(t,b.spec.length,t.beam,r,dt);
 const articulation=Math.abs(wrap(t.a-c.a));r.articulation=articulation;
 if(articulation>1.4){t.a=c.a+Math.sign(wrap(t.a-c.a))*1.4;t.w=c.w;c.vx*=.98;c.vy*=.98;const p=bodyPoint(c,-SUV.hitch);t.x=p.x-Math.cos(t.a)*t.hitch;t.y=p.y-Math.sin(t.a)*t.hitch;t.vx=p.vx+t.w*Math.sin(t.a)*t.hitch;t.vy=p.vy-t.w*Math.cos(t.a)*t.hitch;r.status='Zestaw złożony · podjedź do przodu i wyprostuj';}
 en.load=running?clamp((Math.abs(drive)+drawbar*.5)/14000,0,1):0;en.gear=direction;en.thrust=drive;en.inflow=speed;
 const rpmTarget=en.key==='starting'?220:running?780+r.pedal*(['P','N'].includes(r.gear)?3600:1600)+Math.abs(speed)*95+en.load*900:0;
 en.rpm+=(rpmTarget-en.rpm)*(1-Math.exp(-dt/(running?.28:.12)));if(en.rpm<1)en.rpm=0;en.n=clamp(en.rpm/6000,0,1);en.temperature+=((running?87:18)-en.temperature)*dt/(running?100:450);
 r.fuel.flow=running?1.2+Math.abs(drive*speed)/735.5*.24+r.pedal*3:0;r.fuel.litres=Math.max(0,r.fuel.litres-r.fuel.flow/3600*dt);
 if(r.boatLoaded&&!r.secured&&d.buoyancy>=.995){r.boatLoaded=false;b.heave=Math.min(0,b.heave);b.heaveVelocity=0;r.status='Łódź pływa · odepnij cumę PRZ, przesiądź się do łodzi';updateTrailerMass(r,b);}
 if(r.boatLoaded)placeTrailerBoat(r,b);
}
export function trailerContact(r,b,dt){
 if(r.boatLoaded)return;const t=r.trailer,p=bodyLocal(t,b),d=trailerImmersion(r,b);
 if(Math.abs(p.x-t.offset)>b.spec.length*.85||Math.abs(p.y)>t.beam+1||d.depth>t.bunkHeight+b.spec.draft+.6)return;
 // Rollers support the keel before the trailer is submerged far enough; they
 // resist sliding instead of making a shallow trailer an invisible water dock.
 if(Math.abs(p.y)<t.beam*.5&&d.tooShallow){const f=Math.exp(-dt*(1-d.buoyancy)*5);b.vx*=f;b.vy*=f;r.status='Podpory za płytko · cofnij przyczepę głębiej';}
 for(const bx of [-.32,0,.32]){
  const world=bodyPoint(b,bx*b.spec.length),sample=bodyLocal(t,world),radius=b.spec.beam*(bx>0?.30:.43);
  for(const side of [-1,1]){
   const rail=side*t.beam*.5,pen=radius+.07-Math.abs(sample.y-rail);
   if(sample.x<t.offset-b.spec.length*.5||sample.x>t.offset+b.spec.length*.42||pen<=0)continue;
   const sign=Math.sign(sample.y-rail)||-side,nx=-Math.sin(t.a)*sign,ny=Math.cos(t.a)*sign,arm={x:world.x-b.x,y:world.y-b.y},lever=arm.x*ny-arm.y*nx;
   const target=bodyPoint(t,sample.x,sample.y),v=(world.vx-target.vx)*nx+(world.vy-target.vy)*ny;
   b.x+=nx*pen*.2;b.y+=ny*pen*.2;
   if(v<0){const j=-v/(1/b.spec.my+lever*lever/b.spec.iz+1/t.mass);b.vx+=nx*j/b.spec.my;b.vy+=ny*j/b.spec.my;b.w+=lever*j/b.spec.iz;kick(t,-nx*j,-ny*j,world.x-t.x,world.y-t.y);}
  }
 }
}
export function towAudioBoat(r,b){
 r.audioBoat??={};return Object.assign(r.audioBoat,{...b,spec:{...b.spec,profile:'suv',jet:false},time:r.time,engines:[r.engine],throttle:r.pedal,throttle2:0,planing:0,telemetry:{surge:0,sway:0,thrust:0},thrusters:{},fuel:{refueling:false}});
}
