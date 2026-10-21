import './style.css';
import {markup} from './layout.js';
import {createBoat,step,point,cleat,attachRope,environment,clamp,bottomAt,waveAt} from './physics.js';
import {CRAFTS,specification} from './craft.js';
import {BOLLARDS,WORLD} from './world.js';
import {installCockpit} from './cockpit.js';
import {renderWorld,renderMinimap} from './render.js';
import {CREEP,throttleValue,throttleStep,angleDelta,rimPosition} from './controls.js';
import {CLEATS,requestHaul,anchorCommand,anchorProfile} from './rigging.js';
import {mooringPoint} from './marina.js';
import {draggablePopup} from './popup.js';
import {recordTrail} from './trail.js';
const $=s=>document.querySelector(s);
$('#app').innerHTML=markup();
let start='lake',boatOptions={profile:'runabout',engineCount:1,powers:[90,90],coldStart:true},boat=createBoat(start,boatOptions);
let paused=false,zoom=1,follow=true,overview=false,manualCenter=null,centerReference={x:boat.x,y:boat.y},selectedEngine=0,selectedTarget=null;
let trail=[],view=null,sonarHistory=[],sonarTime=0,lastEvent=null,last=performance.now(),accumulator=0,telemetryAt=0;
const env={windSpeed:0,windDirection:90,currentSpeed:0,currentDirection:90,gusts:false,waveHeight:0,waveDirection:90,autoWaves:true,spatialEffects:true,traffic:true};
const keys=new Set(),keyTimes=new Map(),blockedGas=new Set();
let toastTimer;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600);}
const wheelRatio=()=>2.5*Math.PI/boat.spec.maxSteer;
function gearLabel(v){return Math.abs(v)<.035?'N · LUZ':Math.abs(v)<=CREEP+.005?`${v>0?'F':'R'} · PEŁZAJĄCY`:`${v>0?'F · NAPRZÓD':'R · WSTECZ'} ${Math.abs(Math.round(v*100))}%`;}
function syncControls(){
 const S=boat.spec,deg=Math.round(boat.steer*180/Math.PI);$('#steer-label').textContent=deg+'°';$('#wheel svg').style.transform=`rotate(${boat.steer*180/Math.PI*wheelRatio()}deg)`;$('#wheel').setAttribute('aria-valuenow',deg);$('#wheel').setAttribute('aria-valuemax',Math.round(S.maxSteer*180/Math.PI));$('#wheel').setAttribute('aria-valuemin',-Math.round(S.maxSteer*180/Math.PI));
 $('#throttle').value=Math.round(boat.throttle*100);$('#throttle2').value=Math.round(boat.throttle2*100);$('#gear').textContent=gearLabel(boat.throttle);$('#gear2').textContent=gearLabel(boat.throttle2);
 $('#second-engine').hidden=S.engineCount!==2;$('.engine-link-controls').hidden=S.engineCount!==2;$('#link-engines').checked=boat.linked;$('#fenders').checked=boat.fenders;$('#raise-engines').checked=boat.enginesRaised;
 $('#first-engine').classList.toggle('selected',selectedEngine===0&&!boat.linked);$('#second-engine').classList.toggle('selected',selectedEngine===1&&!boat.linked);
 $('#keyboard-engine').textContent=S.engineCount===1?'SOLO':boat.linked?'L + P':selectedEngine?'PRAWA':'LEWA';$('#engine-select-hint').textContent=S.engineCount===2&&!boat.linked?'Kliknij manetkę, aby wybrać ją dla przycisków i klawiatury (1 / 2).':'Pierwszy krok: bieg pełzający.';
 const preview=$('#setup-dialog').open?specification({profile:$('#craft').value,length:+$('#boat-length').value,beam:+$('#boat-beam').value,hullMass:+$('#boat-mass').value,engineCount:+$('#engine-count').value,powers:[+$('#power-left').value,+$('#power-right').value],fuelCapacity:+$('#fuel-capacity').value,tankCount:+$('#tank-count').value}):S;$('#craft-summary').textContent=`${Math.round(preview.mass)} kg z załogą i paliwem · zanurzenie ${preview.draft.toFixed(2)} m`;
 $('#craft-state').textContent=`${S.length.toFixed(1)} × ${S.beam.toFixed(2)} m · ${Math.round(S.mass)} kg · ${S.powers.join(' + ')} KM`;
 $('#line-break').textContent=`· zerwanie ${(S.lineBreak/1000).toFixed(0)} kN`;
}
function setSteer(v){boat.steer=clamp(v,-boat.spec.maxSteer,boat.spec.maxSteer);syncControls();}
function setThrottle(v,index=selectedEngine){v=boat.damage>=100?0:throttleValue(v);selectedEngine=index;if(boat.linked||boat.spec.engineCount===1)boat.throttle=boat.throttle2=v;else if(index===0)boat.throttle=v;else boat.throttle2=v;syncControls();}
function neutralAll(){boat.throttle=boat.throttle2=0;for(const k of ['w','s','arrowup','arrowdown'])if(keys.has(k)){keys.delete(k);blockedGas.add(k);}syncControls();}
const cockpitApi={boat:()=>boat,selected:()=>selectedEngine,setThrottle,neutral:neutralAll,toast,env};
const updateCockpit=installCockpit(cockpitApi);
function centerBoat(){follow=true;overview=false;manualCenter=null;centerReference={x:boat.x,y:boat.y};}
function reset(){boat=createBoat(start,boatOptions);selectedEngine=0;centerBoat();keys.clear();blockedGas.clear();cockpitApi.holds.bow=cockpitApi.holds.stern=0;trail=[];sonarHistory=[];sonarTime=0;lastEvent=null;selectedTarget=null;$('#mooring-picker').hidden=$('#anchor-picker').hidden=true;renderRopes();syncControls();telemetry();accumulator=0;toast('Nowa próba · stacyjka w prawo: zapłon, następnie rozruch.');}
$('#throttle').oninput=e=>setThrottle(+e.target.value/100,0);$('#throttle2').oninput=e=>setThrottle(+e.target.value/100,1);
for(const [id,index]of [['throttle',0],['throttle2',1]])$('#'+id).onpointerdown=()=>{selectedEngine=index;syncControls();};
$('#center').onclick=()=>setSteer(0);$('#reset').onclick=reset;
function toggleLink(){boat.linked=!boat.linked;if(boat.linked)boat.throttle2=boat.throttle;syncControls();}
$('#link-engines').onchange=toggleLink;
function togglePause(){paused=!paused;$('#pause').textContent=paused?'▷':'Ⅱ';$('#paused-label').hidden=!paused;telemetry();}
$('#pause').onclick=togglePause;$('#fenders').onchange=e=>boat.fenders=e.target.checked;$('#raise-engines').onchange=e=>boat.enginesRaised=e.target.checked;
for(const id of ['help','instructions','limits'])$('#'+id).onclick=()=>$('#info').showModal();$('#close-dialog').onclick=()=>$('#info').close();
let drag=null;const wheel=$('#wheel');
wheel.onpointerdown=e=>{const q=rimPosition(e.clientX,e.clientY,wheel.getBoundingClientRect());if(q.radius<.25||q.radius>1.08)return;drag={angle:q.angle};wheel.setPointerCapture(e.pointerId);e.preventDefault();};
wheel.onpointermove=e=>{if(!drag)return;const q=rimPosition(e.clientX,e.clientY,wheel.getBoundingClientRect());if(q.radius>.18){setSteer(boat.steer+angleDelta(drag.angle,q.angle)/wheelRatio());drag.angle=q.angle;}};
wheel.onpointerup=wheel.onpointercancel=wheel.onlostpointercapture=()=>drag=null;
window.addEventListener('keydown',e=>{
 if($('#info').open||$('#setup-dialog').open)return;
 const isLever=['throttle','throttle2'].includes(e.target.id);if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&!isLever)return;
 const k=e.key.toLowerCase();if(blockedGas.has(k)){e.preventDefault();return;}if(['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k))e.preventDefault();
 if(!keys.has(k))keyTimes.set(k,performance.now());keys.add(k);if(e.repeat)return;if(isLever)selectedEngine=e.target.id==='throttle2'?1:0;
 if(['w','arrowup','s','arrowdown'].includes(k))setThrottle(throttleStep(selectedEngine?boat.throttle2:boat.throttle,['w','arrowup'].includes(k)?1:-1));
 if(k===' ')neutralAll();if(k==='c')setSteer(0);if(k==='p')togglePause();if(k==='r')reset();if(k==='t')toggleLink();if(k==='1')selectedEngine=0;if(k==='2'&&boat.engines.length===2)selectedEngine=1;if(k==='f')boat.fenders=!boat.fenders;syncControls();
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());blockedGas.delete(e.key.toLowerCase());});window.addEventListener('blur',()=>{keys.clear();blockedGas.clear();});document.addEventListener('visibilitychange',()=>{keys.clear();last=performance.now();accumulator=0;});
function readEnv(){for(const [key,id]of [['windSpeed','wind'],['currentSpeed','current'],['windDirection','wind-dir'],['currentDirection','current-dir'],['waveHeight','waves'],['waveDirection','wave-dir']])env[key]=+$('#'+id).value;for(const [key,id]of [['gusts','gusts'],['autoWaves','auto-waves'],['spatialEffects','spatial-effects'],['traffic','traffic']])env[key]=$('#'+id).checked;$('#wind-value').textContent=env.windSpeed.toFixed(1)+' m/s';$('#current-value').textContent=env.currentSpeed.toFixed(2)+' m/s';$('#waves').disabled=env.autoWaves;}
for(const id of ['wind','current','wind-dir','current-dir','gusts','waves','wave-dir','auto-waves','spatial-effects','traffic'])$('#'+id).oninput=()=>{if(!['spatial-effects','traffic'].includes(id))$('#preset').value='custom';readEnv();};
$('#preset').onchange=e=>{const p=({calm:[0,90,0,90,false],crosswind:[6,270,0,90,false],river:[2,90,.6,180,false],gusty:[8,225,.25,90,true]})[e.target.value];if(!p)return;['wind','wind-dir','current','current-dir'].forEach((id,i)=>$('#'+id).value=p[i]);$('#gusts').checked=p[4];$('#wave-dir').value=p[1];readEnv();};
$('#craft').onchange=()=>{const p=CRAFTS[$('#craft').value];for(const [id,k]of [['boat-length','length'],['boat-beam','beam'],['boat-mass','hullMass'],['fuel-capacity','fuel']])$('#'+id).value=p[k];for(const id of ['power-left','power-right'])$('#'+id).value=p.hp;$('#engine-count').disabled=!!p.jet;if(p.jet)$('#engine-count').value='1';$('#power-right-wrap').hidden=$('#engine-count').value!=='2';for(const id of ['bow-thruster','stern-thruster']){$('#'+id).disabled=!!p.jet;if(p.jet)$('#'+id).checked=false;}};
$('#engine-count').onchange=()=>$('#power-right-wrap').hidden=$('#engine-count').value!=='2';
function applyCraft(){for(const id of ['fuel-capacity','boat-length','boat-beam','boat-mass','power-left',...($('#engine-count').value==='2'?['power-right']:[])])if(!$('#'+id).reportValidity())return false;boatOptions={coldStart:true,profile:$('#craft').value,length:+$('#boat-length').value,beam:+$('#boat-beam').value,hullMass:+$('#boat-mass').value,engineCount:+$('#engine-count').value,powers:[+$('#power-left').value,+$('#power-right').value],fuelCapacity:+$('#fuel-capacity').value,tankCount:+$('#tank-count').value,bowThruster:$('#bow-thruster').checked,sternThruster:$('#stern-thruster').checked};reset();return true;}
$('#apply-craft').onclick=()=>{if($('#setup-dialog').open)finishSetup();else applyCraft();};
for(const btn of document.querySelectorAll('[data-start]'))btn.onclick=()=>{start=btn.dataset.start==='open'?'lake':btn.dataset.start;document.querySelectorAll('[data-start]').forEach(el=>el.classList.toggle('active',el===btn));reset();};
const vesselHome=document.createComment('vessel-home'),weatherHome=document.createComment('weather-home');$('#vessel-panel').before(vesselHome);$('#environment-panel').before(weatherHome);
function restoreSetup(){vesselHome.after($('#vessel-panel'));weatherHome.after($('#environment-panel'));}
function openSetup(){keys.clear();$('#setup-panels').append($('#vessel-panel'),$('#environment-panel'));$('#setup-dialog').showModal();}
function finishSetup(){if(!applyCraft())return;restoreSetup();$('#setup-dialog').close();last=performance.now();accumulator=0;}
$('#setup-open').onclick=$('#open-settings').onclick=openSetup;$('#begin-session').onclick=$('#setup-close').onclick=finishSetup;$('#setup-dialog').addEventListener('cancel',e=>{e.preventDefault();finishSetup();});
function ropeInfo(r){return `${BOLLARDS[r.bollard].id} · ${r.length.toFixed(2)} m · ${(r.tension/1000).toFixed(2)} kN${r.targetLength<r.length-.02?(r.blocked?' · za ciężko':' · wybieranie'):r.targetLength>r.length+.02?' · luzowanie':''}`;}
function ropeActions(end,r){return r?`<button data-rope="${end}" data-action="shorten" aria-label="Wybierz cumę ${CLEATS[end]}">−</button><button data-rope="${end}" data-action="loosen" aria-label="Poluzuj cumę ${CLEATS[end]}">+</button><button data-rope="${end}" data-action="detach" aria-label="Odczep cumę ${CLEATS[end]}">×</button>`:`<button data-rope="${end}" data-action="attach" aria-label="Załóż cumę ${CLEATS[end]}">+</button>`;}
function renderRopes(){const signature=boat.ropes.map(r=>r.end).join(',');$('#ropes').dataset.signature=signature;$('#ropes').innerHTML=Object.entries(CLEATS).map(([end,name])=>{const r=boat.ropes.find(q=>q.end===end);return `<div class="rope-row"><div><span>${name}</span><small id="rope-${end}">${r?ropeInfo(r):'niepołączona'}</small></div><div class="rope-actions">${ropeActions(end,r)}</div></div>`;}).join('');renderMapRopes();}
const cleatIcon='<svg viewBox="0 0 32 24" aria-hidden="true"><path d="M4 8h24M10 8l3 10h6l3-10M10 20h12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
function renderMapRopes(){
 if(selectedTarget===null)return;
 $('#mooring-target').textContent=BOLLARDS[selectedTarget].label;
 $('#map-ropes').innerHTML=`<div class="mooring-diagram"><svg class="mooring-hull" viewBox="0 0 320 250" aria-label="Łódź widziana z góry, dziób u góry"><path d="M160 23Q218 69 213 225H107Q102 69 160 23Z" fill="#dde7d2" stroke="#648165" stroke-width="2"/><path d="M127 120h66v64h-66Z" fill="#b2c8ba"/><path d="M50 85L125 93M270 85L195 93M50 187L108 211M270 187L212 211" fill="none" stroke="#b0bf9e" stroke-dasharray="3 3"/><g fill="#987e40"><circle cx="125" cy="93" r="3"/><circle cx="195" cy="93" r="3"/><circle cx="108" cy="211" r="3"/><circle cx="212" cy="211" r="3"/></g><path d="M119 105q41-22 82 0" fill="none" stroke="#86a69b" stroke-width="6"/><path d="M143 227h34v13h-34Z" fill="#577368"/></svg>${Object.entries(CLEATS).map(([end,name])=>{
  const r=boat.ropes.find(q=>q.end===end);
  return `<div class="diagram-cleat cleat-${end} ${r?'attached':''} ${r?.bollard===selectedTarget?'selected-target':''}"><button class="cleat-icon" data-cleat="${end}" ${r?'disabled':''} title="${name}${r?' · '+BOLLARDS[r.bollard].label:' · rzuć cumę'}" aria-label="${name}${r?' · cuma założona':' · rzuć cumę'}">${cleatIcon}</button>${r?`<small id="map-rope-${end}">${ropeInfo(r)}</small><div class="rope-actions">${ropeActions(end,r)}</div>`:''}</div>`;
 }).join('')}</div>`;
}
function ropeAction(btn,fromMap=false){const end=btn.dataset.rope,r=boat.ropes.find(q=>q.end===end);switch(btn.dataset.action){case'attach':{const value=$('#bollard-bow').value;toast(attachRope(boat,end,fromMap?selectedTarget:value===''?null:+value).message);break;}case'detach':boat.ropes=boat.ropes.filter(q=>q.end!==end);break;case'shorten':if(r)requestHaul(r,-.5);break;case'loosen':if(r)requestHaul(r,.5);break;}renderRopes();}
$('#ropes').onclick=e=>{const btn=e.target.closest('[data-rope]');if(btn)ropeAction(btn);};
$('#map-ropes').onclick=e=>{const choice=e.target.closest('[data-cleat]'),action=e.target.closest('[data-rope]');if(choice){toast(attachRope(boat,choice.dataset.cleat,selectedTarget).message);renderRopes();}else if(action)ropeAction(action,true);};
draggablePopup($('#mooring-picker'),$('#mooring-handle'));
$('#close-mooring').onclick=()=>$('#mooring-picker').hidden=true;$('#close-anchor').onclick=()=>$('#anchor-picker').hidden=true;
function showAnchor(){$('#mooring-picker').hidden=true;$('#anchor-picker').hidden=false;$('#map-anchor-target').value=$('#anchor-target').value;}
$('#show-anchor').onclick=showAnchor;
for(const id of ['anchor-target','map-anchor-target'])$('#'+id).oninput=e=>$('#'+(id==='anchor-target'?'map-anchor-target':'anchor-target')).value=e.target.value;
for(const btn of document.querySelectorAll('[data-anchor]'))btn.onclick=()=>{const input=$('#anchor-target');if(!input.reportValidity())return;toast(anchorCommand(boat,btn.dataset.anchor,+input.value).message);};
$('#zoom-in').onclick=()=>{overview=false;zoom=clamp(zoom*1.25,.16,3);};$('#zoom-out').onclick=()=>{overview=false;zoom=clamp(zoom/1.25,.16,3);};$('#follow').onclick=centerBoat;$('#overview').onclick=()=>overview=!overview;
$('#trail-toggle').onclick=()=>{showTrail=!showTrail;$('#trail-toggle').setAttribute('aria-pressed',showTrail);};let showTrail=true;
const canvas=$('#lake'),ctx=canvas.getContext('2d');let width=1,height=1;
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}).observe(canvas);
function draw(){view=renderWorld(ctx,{boat,env,width,height,zoom,follow,overview,manualCenter,centerReference,selected:selectedTarget,trail,showTrail});renderMinimap($('#minimap'),boat,view);}
canvas.onclick=e=>{
 if(!view)return;const rect=canvas.getBoundingClientRect(),p={x:(e.clientX-rect.left-width/2)/view.scale+view.camera.x,y:(e.clientY-rect.top-height/2)/view.scale+view.camera.y};
 let best=-1,d=Math.max(.8,12/view.scale);BOLLARDS.forEach((_,i)=>{const q=mooringPoint(boat,i),dist=Math.hypot(p.x-q.x,p.y-q.y);if(dist<d){best=i;d=dist;}});
 const bow=cleat(boat,'bow'),bowDistance=Math.hypot(p.x-bow.x,p.y-bow.y);
 if(bowDistance<Math.max(boat.spec.length*.15,13/view.scale)&&(best<0||bowDistance<d)){showAnchor();return;}
 if(best>=0){selectedTarget=best;$('#bollard-bow').value=String(best);$('#anchor-picker').hidden=true;renderMapRopes();$('#mooring-picker').hidden=false;}
};
$('#minimap').onclick=e=>{const r=e.target.getBoundingClientRect();manualCenter={x:WORLD.left+(e.clientX-r.left)/r.width*600,y:WORLD.top+(e.clientY-r.top)/r.height*400};follow=false;overview=false;};
const sonarCanvas=$('#sonar'),sonarCtx=sonarCanvas.getContext('2d'),anchorCanvas=$('#anchor-profile'),anchorCtx=anchorCanvas.getContext('2d');
function drawSonar(){
 const c=sonarCtx,w=sonarCanvas.width,h=sonarCanvas.height,chartHeight=h-25;c.clearRect(0,0,w,h);c.fillStyle='#183e3c';c.fillRect(0,0,w,h);
 c.strokeStyle='#345852';c.lineWidth=1;c.font='12px system-ui';c.fillStyle='#749a87';
 for(let depth=2;depth<=8;depth+=2){const y=depth/8*chartHeight;c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();c.fillText(depth+' m',5,y-4);}
 if(sonarHistory.length){const offset=w-sonarHistory.length*w/240;
 c.beginPath();c.moveTo(offset,h);sonarHistory.forEach((p,i)=>c.lineTo(offset+i*w/240,Math.min(h,p.depth/8*chartHeight)));c.lineTo(w,h);c.closePath();c.fillStyle='#b49b64';c.fill();
 c.beginPath();sonarHistory.forEach((p,i)=>i?c.lineTo(offset+i*w/240,Math.min(h,p.depth/8*chartHeight)):c.moveTo(offset,Math.min(h,p.depth/8*chartHeight)));c.lineWidth=2;c.strokeStyle='#e4ca83';c.stroke();}
 c.fillStyle='#b9d0bd';c.font='11px system-ui';c.fillText('−60 s',6,h-7);
 if(sonarHistory.length>30&&sonarHistory[sonarHistory.length-1].depth>2&&Math.sin(boat.x*.07+boat.y*.11)>.35){for(let i=0;i<3;i++){const x=w-50-i*45,y=65+i*23;c.strokeStyle='#e4b768';c.beginPath();c.arc(x,y,8,Math.PI,0);c.stroke();}c.fillStyle='#c3d8ae';c.fillText('‹ ryby ›',w-80,h-35);}c.fillText('teraz',w-40,15);
}
function drawAnchorProfile(){
 const c=anchorCtx,w=anchorCanvas.width,h=anchorCanvas.height,a=boat.anchor;
 c.fillStyle='#edf3e9';c.fillRect(0,0,w,h);c.fillStyle='#d5dfc9';c.fillRect(0,h-26,w,26);c.fillStyle='#8a9b7e';c.font='12px system-ui';
 if(a.mode==='stowed'||a.broken){c.fillText(a.broken?'Utracona kotwica':'Profil rode po opuszczeniu kotwicy',20,h/2);return;}
 const p=cleat(boat,'bow'),d=Math.hypot(p.x-a.x,p.y-a.y),height=Math.max(.4,a.z+.65+boat.heave);
 const maxX=Math.max(4,d,a.shape?.x??d),sx=(w-65)/maxX,sz=(h-50)/Math.max(2,height);
 const X=x=>25+x*sx,Z=z=>h-27-z*sz;
 const profile=a.z>=bottomAt(a.x,a.y).depth-.02?anchorProfile(a,boat):[{x:0,z:0,chain:true},{x:d,z:height,chain:a.length<=a.chainReserve}];
 for(let i=1;i<profile.length;i++){c.beginPath();c.moveTo(X(profile[i-1].x),Z(profile[i-1].z));c.lineTo(X(profile[i].x),Z(profile[i].z));c.strokeStyle=profile[i].chain?'#657a79':'#b28c48';c.lineWidth=3;c.stroke();}
 c.fillStyle='#45605c';c.fillText('⚓',X(0)-5,Z(0)+2);c.fillText('dziobowa rolka',Math.max(28,Math.min(w-100,X(d)-35)),Math.max(14,Z(height)-9));
 c.strokeStyle='#769c94';c.setLineDash([4,5]);const sea=Z(a.z);c.beginPath();c.moveTo(0,sea);c.lineTo(w,sea);c.stroke();c.setLineDash([]);
 c.fillStyle='#788b73';c.font='11px system-ui';c.fillText('łańcuch: szary · lina: złota · skale osi różne',20,h-9);
}
function telemetry(){
 const e=environment(boat.time,env,boat.x,boat.y),S=boat.spec;
 $('#speed').innerHTML=`${(Math.hypot(boat.vx,boat.vy)*1.94384).toFixed(2)} <small>kn</small>`;$('#water-speed').innerHTML=`${(Math.hypot(boat.vx-e.current.x,boat.vy-e.current.y)*1.94384).toFixed(2)} <small>kn</small>`;$('#heading').textContent=Math.round(((boat.a*180/Math.PI+90)%360+360)%360)%360+'°';$('#yaw').innerHTML=`${(boat.w*180/Math.PI).toFixed(1)} <small>°/s</small>`;
 $('#tension').textContent=(boat.maxTension/1000).toFixed(2)+' kN';
 for(const [id,damage]of [['hull',boat.damage],['dock',boat.dockDamage]]){$('#'+id+'-value').textContent=Math.round(100-damage)+'%';$('#'+id+'-bar').style.width=(100-damage)+'%';}
 $('#condition-tag').textContent=boat.grounded?'NA MIELIŹNIE':boat.damage>=100?'NAPĘD WYŁĄCZONY':boat.damage>0?'USZKODZENIA':'BEZ USZKODZEŃ';$('#condition-tag').classList.toggle('danger',boat.damage>0||boat.grounded);
 $('#impact-info').textContent=boat.lastImpact?`Kontakt: ${boat.lastImpact.speed.toFixed(2)} m/s · ${Math.round(boat.lastImpact.energy)} J`:'Celem jest kontakt z minimalną prędkością.';
 if($('#ropes').dataset.signature!==boat.ropes.map(r=>r.end).join(','))renderRopes();
 for(const r of boat.ropes){$('#rope-'+r.end).textContent=ropeInfo(r);const span=$('#map-rope-'+r.end);if(span)span.textContent=ropeInfo(r);}
 if(boat.events.length&&boat.events[0]!==lastEvent){lastEvent=boat.events[0];toast(lastEvent.message);}
 $('#engine-state').textContent=boat.engines.map((en,i)=>`${boat.engines.length===2?(i?'P: ':'L: '):''}${Math.round(en.rpm)} obr/min · ${Math.round(en.thrust)} N · ${Math.round(en.temperature)}°C`).join(' / ');
 const transducer=point(boat,-S.length*.30,0),bottom=bottomAt(transducer.x,transducer.y),depth=Math.max(0,bottom.depth+waveAt(transducer.x,transducer.y,boat.time,env).eta);
 $('#depth').innerHTML=`${depth.toFixed(2)} <small>m</small>`;$('#keel').textContent=`Stępka ${boat.underKeel.toFixed(2)} m`;$('#keel').classList.toggle('danger',boat.underKeel<.3);$('#bottom-material').textContent=bottom.name;
 $('#roll').textContent=(boat.roll*180/Math.PI).toFixed(1)+'°';$('#pitch').textContent=(boat.pitch*180/Math.PI).toFixed(1)+'°';$('#regime').textContent=boat.planing>.65?'Ślizg':boat.planing>.12?'Przejście do ślizgu':'Wypornościowo';$('#wave-value').textContent=(env.autoWaves?Math.min(.55,.004*env.windSpeed**2):env.waveHeight).toFixed(2)+' m';
 if(boat.time-sonarTime>=.25||!sonarHistory.length){sonarHistory.push({depth});if(sonarHistory.length>240)sonarHistory.shift();sonarTime=boat.time;}
 $('#propeller-health').innerHTML=boat.engines.map((en,i)=>`<div class="health-row"><span>${S.jet?'Wirnik':'Śruba'} ${boat.engines.length===2?(i?'P':'L'):''}</span><strong>${Math.round(100-en.propDamage)}%${en.propContact?' · DNO':''}</strong></div>`).join('');
 const a=boat.anchor;$('#anchor-state').textContent=a.status;$('#anchor-progress').value=a.length;$('#winch-speed').textContent=Math.abs(a.winchRate??0).toFixed(2)+' m/s';$('#anchor-state').classList.toggle('danger',a.broken||a.windlassBlocked);$('#anchor-length').textContent=a.length.toFixed(1)+' m';$('#anchor-scope').textContent=a.mode==='stowed'?'—':(a.length/(bottomAt(a.x,a.y).depth+.65)).toFixed(1)+':1';$('#anchor-tension').textContent=(a.tension/1000).toFixed(2)+' kN';$('#anchor-holding').textContent=(a.capacity/1000).toFixed(2)+' kN';$('#anchor-rode').textContent=`${S.anchorMass} kg · ${Math.min(a.length,a.chainReserve).toFixed(1)} m łańcucha + ${Math.max(0,a.length-a.chainReserve).toFixed(1)} m liny`;
 $('#map-anchor-state').textContent=`${a.status} · ${a.length.toFixed(1)} m · ${(a.tension/1000).toFixed(2)} kN`;
 updateCockpit();drawSonar();drawAnchorProfile();
}
function frame(now){
 const dt=Math.min((now-last)/1000,.1);last=now;
 if(!paused&&!$('#info').open&&!$('#setup-dialog').open){
  const steer=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),gas=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
  if(steer)setSteer(boat.steer+steer*.35*dt);if(gas&&['w','arrowup','s','arrowdown'].some(k=>keys.has(k)&&now-(keyTimes.get(k)??now)>240)){const v=selectedEngine?boat.throttle2:boat.throttle;setThrottle(Math.sign(v)!==gas&&Math.abs(v)<=CREEP+.005?(Math.abs(v)<.035?gas*CREEP:0):v+gas*.35*dt);}
  boat.thrusters.bow=cockpitApi.holds.bow||((keys.has('e')?1:0)-(keys.has('q')?1:0));boat.thrusters.stern=cockpitApi.holds.stern||((keys.has('x')?1:0)-(keys.has('z')?1:0));
  accumulator+=dt;while(accumulator>=1/120){step(boat,env,1/120);accumulator-=1/120;}recordTrail(trail,boat);
 }else accumulator=0;
 if(now-telemetryAt>100){telemetry();syncControls();telemetryAt=now;}draw();requestAnimationFrame(frame);
}
$('#info .dialog-body').innerHTML=`<h3>Rozruch i przyrządy</h3><p>Przekręć graficzną stacyjkę w prawo: 0 → I → START, na luzie. W lewo: I → 0, zatrzymanie silnika i wyłączenie zapłonu jednym ruchem. Przegrzanie daje czerwony alarm i ogranicza moc; utrata chłodzenia przy podniesionym napędzie lub długie przeciążenie na cumach/mieliźnie podnosi temperaturę. Paliwo zwiększa masę łodzi; tankowanie przy symbolu ⛽ wymaga postoju i zgaszonych silników. Wspólny trym góra/dół reguluje nachylenie napędu, uniesienie dziobu, opór i wentylację śruby. Skuter ma napęd strugowodny: mały ciąg oznacza słabe sterowanie, a wstecz realizuje deflektor. Q/E: dziób, Z/X: rufa; strumieniowe wymagają zapłonu, opcji wyposażenia i energii w akumulatorze.</p><h3>Sterowanie i napęd</h3><p>A/D lub strzałki: koło (nie wraca do zera). Myszą chwyć obręcz lub pole między ramionami i prowadź ją po okręgu. W/S: wybrana manetka. Krótkie naciśnięcie od luzu wybiera bieg pełzający, przytrzymanie zwiększa gaz. 1/2: wybór silnika, T: sprzężenie manetek. Spacja: obie na luz. C: wyprostuj. F: odbijacze. P: pauza. R: nowa próba. Silnik ma bezwładność obrotów i przerwę przy zmianie biegu — polecenie na manetce nie oznacza natychmiastowego ciągu. Przy dwóch silnikach osobne ciągi i rozstaw dają moment obrotowy. Przeciwny bieg ma mniejszy ciąg, więc jednakowe wychylenia nie gwarantują obrotu w miejscu.</p><h3>Cumy i kotwica</h3><p>Kliknij punkt na mapie i wybierz jedną z pięciu knag. Rzut pozostawia 35 cm luzu; nie wybiera liny. Drzewa oznaczone D są punktami cumowania na brzegu. Załóż cumę przyciskiem +. −/+ zadaje wybieranie/luzowanie o 0,5 m, ale długość zmienia się stopniowo. Człowiek wybiera do 220 N i 40 W; cięższa łódź rozpędza się wolniej. Cuma pod dużym obciążeniem przestaje być wybierana, lecz knaga nadal utrzymuje naciąg. Kotwica ma osobny łańcuch i linę, ciężar, opadanie, trzymanie zależne od dna i kąta oraz wleczenie. Winda ma ograniczony uciąg. Profil pokazuje zwis i odcinek leżący na dnie.</p><h3>Głębokość i fale</h3><p>Echosonda podaje głębokość od powierzchni pod rufą i historię z ostatnich 60 sekund. Prześwit pod stępką jest najniższą wartością dla dziobu, środka i rufy. Kadłub stopniowo opiera się na piasku lub kamieniach. Śruba ma osobne uszkodzenia i sięga niżej. Podniesienie napędu wyłącza ciąg, pozwalając podejść do plaży dryfem lub na cumie. Fale tworzą przepływ orbitalny, wymuszają ruch pionowy, kołysanie i przegłębienie. Możesz wybrać wysokość i kierunek albo zależność wysokości od wiatru.</p><h3>Kolizje</h3><table><thead><tr><th>Kontakt normalny</th><th>Bez ochrony</th><th>Burta z odbijaczami</th></tr></thead><tbody><tr><td>Bez szkód w modelu</td><td>≤ 0,15 m/s</td><td>≤ 0,30 m/s</td></tr><tr><td>Zniszczenie</td><td>≥ 1,50 m/s</td><td>≥ 1,80 m/s</td></tr></tbody></table><p class="model-warning">To umowne progi dydaktyczne, nie rzeczywiste bezpieczne prędkości. Celem jest kontakt bliski zeru.</p><h3>Źródła i zakres modelu</h3><p>Struktura modelu: równania manewrowe Fossena, masa dodana i opór poprzeczny; model zwisu inspirowany teorią używaną w MoorPy; rozdzielenie ciężaru, sprężystości i wymuszeń falowych zgodnie z opisem MoorDyn. Nasze współczynniki łodzi i kotwic są przybliżone, bez kalibracji z prób morskich. Ślizg to płynne przybliżenie oporu, nie pełny model Savitsky’ego. Lokalne osłony, zawirowania i przesmyk to model przybliżony, bez obliczeń CFD. <a href="https://github.com/PioThePio/BoatSimulator/blob/main/docs/PHYSICS.md" target="_blank" rel="noopener noreferrer">Źródła, założenia i obliczenia modelu ↗</a>.</p>`;
readEnv();renderRopes();syncControls();telemetry();requestAnimationFrame(frame);openSetup();
