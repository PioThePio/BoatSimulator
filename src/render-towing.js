import {YARD_ISLANDS,RETURN_BAY,HANGAR,SPARE_TRAILER_BAYS,WILD_SLIP} from './port-yard.js';
import {onBridge} from './bridge-road.js';
import {PORT_ROADS} from './port-roads.js';
import {PARKING,PARKING_SPACES,SERVICE_BAYS,SERVICE_STATION,bottomAt,clamp} from './world.js';
import {bowEye,winchPost} from './trailer-winch.js';
import {SUV,bodyPoint,trailerPost,hitchStatus} from './towing.js';
import {SAND_PRACTICE,CURB} from './vehicle-terrain.js';
export function drawParking(c){
 c.save();c.lineJoin='round';c.lineCap='round';
 for(const road of PORT_ROADS){c.strokeStyle=road.material==='gravel'?'#b5b19a':'#989f94';c.lineWidth=road.width;c.beginPath();road.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.strokeStyle='#eeecd5';c.lineWidth=.13;c.setLineDash([3,3]);c.stroke();c.setLineDash([]);}
 const p=PARKING;c.fillStyle='#a6aea1';c.beginPath();c.rect(p.x,p.y,p.w,p.h);for(const x of[164,184])c.rect(x,-15,9,7);c.fill('evenodd');c.strokeStyle='#d8d9c9';c.lineWidth=.3;c.beginPath();for(const y of[p.y,p.y+p.h]){c.moveTo(p.x,y);c.lineTo(CURB.gapMin,y);c.moveTo(CURB.gapMax,y);if(y===p.y+p.h){for(const x of[164,184]){c.lineTo(x,y);c.moveTo(x+9,y);}}c.lineTo(p.x+p.w,y);}c.moveTo(p.x+p.w,p.y);c.lineTo(p.x+p.w,-63);c.moveTo(p.x+p.w,-44);c.lineTo(p.x+p.w,p.y+p.h);c.moveTo(p.x,p.y);c.lineTo(p.x,-79);c.moveTo(p.x,-50);c.lineTo(p.x,p.y+p.h);c.stroke();
 c.fillRect(73,-74,23,25);c.fillStyle='#a6aea1';c.fillRect(120,-114,9,10);c.fillRect(119.5,-9,11,17);
 c.strokeStyle='#eeefdf';c.lineWidth=.12;
 for(const q of[...PARKING_SPACES,...SERVICE_BAYS,RETURN_BAY,...SPARE_TRAILER_BAYS.map(q=>({x:q.x-2.25,y:q.y-7,w:4.5,h:12,heading:Math.PI/2}))]){const south=q.closedEdge?q.closedEdge==='south':q.heading<0,closed=south?q.y+q.h:q.y,open=south?q.y:q.y+q.h;c.beginPath();c.moveTo(q.x,open);c.lineTo(q.x,closed);c.lineTo(q.x+q.w,closed);c.lineTo(q.x+q.w,open);c.stroke();}
 for(const q of YARD_ISLANDS){c.fillStyle='#9eb58e';c.fillRect(q.x,q.y,q.w,q.h);c.strokeStyle='#dbddcb';c.lineWidth=.3;c.strokeRect(q.x,q.y,q.w,q.h);}
 c.fillStyle='#f9faef';c.font='bold 1.05px system-ui';c.textAlign='center';for(const q of SERVICE_BAYS){c.save();c.translate(q.x+q.w/2,q.y+q.h-1.3);c.fillText('SERWIS',0,0);c.restore();}
 c.strokeStyle='#eef0db';c.lineWidth=.12;c.setLineDash([3,3]);for(const y of[-106,-63,-46]){c.beginPath();c.moveTo(96,y);c.lineTo(224,y);c.stroke();}c.beginPath();c.moveTo(134,-109);c.lineTo(134,-38);c.stroke();c.setLineDash([]);
 c.font='1px system-ui';c.fillStyle='#536a59';c.textAlign='left';c.fillText('AUTA',97,-109);c.fillText('PRZYCZEPY',145,-109);c.fillText('ZESTAWY',100,-38);c.fillText('HANGAR · COFNIJ DO ŚRODKA',68,-71);c.fillText('WOLNE PRZYCZEPY',198,-81);c.fillText('SLIP',121,-12);
 const wild=WILD_SLIP;const mud=c.createLinearGradient(0,wild.waterY,0,wild.y+wild.h);mud.addColorStop(0,'#c6ba91');mud.addColorStop(1,'#8bb5c0');c.fillStyle=mud;c.fillRect(wild.x,wild.y,wild.w,wild.h);c.strokeStyle='#aaa581';c.lineWidth=.12;for(const dx of[2.5,7.5]){c.beginPath();c.moveTo(wild.x+dx,wild.y);c.lineTo(wild.x+dx,wild.y+wild.h);c.stroke();}c.font='bold 1px system-ui';c.fillStyle='#67775b';c.fillText('DZIKI SLIP',wild.x-.5,wild.y-1);
 const sand=SAND_PRACTICE;c.fillStyle='#d7c598';c.beginPath();sand.outline.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();c.save();c.clip();c.fillStyle='#baa779';for(let i=0;i<120;i++)c.fillRect(sand.x+(i*7.13%sand.w),sand.y+(i*4.73%sand.h),.12,.12);c.restore();c.font='bold 1px system-ui';c.fillStyle='#8f825c';c.fillText('PIACH · TRAKCJA',sand.x+2,sand.y+9);c.restore();
}
export function drawTowRig(c,r,b,{bridgeOnly=false}={}){
 if(!r)return;for(const q of bridgeOnly?[]:r.parkedTrailers??[])drawTowRig(c,{...r,parkedTrailers:[],parkedOnly:true,trailer:q.trailer,boatLength:q.boatLength,attached:false},{spec:q.spec});const t=r.trailer,p=trailerPost(r),rear=t.offset-b.spec.length*.51,front=t.offset+b.spec.length*.45;
 if(!bridgeOnly||onBridge(t,t.length*.6)){c.save();c.translate(t.x,t.y);c.rotate(t.a);
 const wet=bottomAt(t.x,t.y).depth>0;c.globalAlpha=wet?.75:1;c.strokeStyle='#697f79';c.lineWidth=.12;
 for(const side of [-1,1]){c.beginPath();c.moveTo(t.hitch,0);c.lineTo(front-.4,side*t.beam*.46);c.lineTo(rear,side*t.beam*.46);c.stroke();}
 c.strokeStyle='#a9bab1';c.lineWidth=.14;for(const x of [rear+.2,0,front-.3]){c.beginPath();c.moveTo(x,-t.beam*.48);c.lineTo(x,t.beam*.48);c.stroke();}
 c.strokeStyle='#877f62';c.lineWidth=.18;for(const side of [-1,1]){c.beginPath();c.moveTo(rear+.2,side*b.spec.beam*.27);c.lineTo(front-.6,side*b.spec.beam*.27);c.stroke();}
 c.fillStyle='#3e514e';for(let i=0;i<t.axles;i++)for(const side of [-1,1])c.fillRect(t.axleX+(i-(t.axles-1)/2)*.62-.24,side*t.beam*.51-.15,.48,.30);
 // Carpeted V cradle and flared entry rollers, drawn at their physical arms.
 c.strokeStyle='#b29f67';c.lineWidth=.16;for(const side of [-1,1]){c.beginPath();c.moveTo(rear-.25,side*t.beam*.57);c.lineTo(rear+.65,side*b.spec.beam*.27);c.lineTo(front-.3,side*b.spec.beam*.27);c.stroke();}if(!r.postBroken){const stop=t.offset+b.spec.length*.50+.08;c.strokeStyle='#4b6b67';c.lineWidth=.16;c.beginPath();c.moveTo(stop-.15,-b.spec.beam*.28);c.lineTo(stop,0);c.lineTo(stop-.15,b.spec.beam*.28);c.stroke();}
 if(!r.postBroken){c.fillStyle='#c58758';c.fillRect(t.offset+b.spec.length*.59+.25,-.12,.2,.24);}if(!r.attached){c.fillStyle='#7d8f78';c.fillRect(t.hitch-.5,-.3,.12,.6);}c.fillStyle='#e1b764';c.fillRect(rear-.10,-t.beam*.46,.14,.32);c.fillStyle='#be7159';c.fillRect(rear-.10,t.beam*.46-.32,.14,.32);
 c.globalAlpha=1;c.restore();}if(r.parkedOnly)return;
 const q=r.car;if(!bridgeOnly||onBridge(q,2)){c.save();c.translate(q.x,q.y);c.rotate(q.a);
 c.fillStyle='#66877933';c.fillRect(-2.5+.15,-1+.2,4.9,2);c.strokeStyle='#6a7e77';c.lineWidth=.13;c.beginPath();c.moveTo(-SUV.length/2,0);c.lineTo(-SUV.hitch,0);c.stroke();
 for(const x of [-SUV.wb/2,SUV.wb/2])for(const side of [-1,1]){c.save();c.translate(x,side*1);if(x>0)c.rotate(r.tyreSteer??r.actualSteer);c.fillStyle='#344c47';c.fillRect(-.38,-.15,.76,.30);c.restore();}
 c.fillStyle='#d8dfd2';c.strokeStyle='#47675d';c.lineWidth=.08;c.beginPath();c.roundRect(-2.45,-.94,4.9,1.88,.28);c.fill();c.stroke();
 c.fillStyle='#728f89';c.beginPath();c.moveTo(.65,-.80);c.lineTo(1.12,-.72);c.lineTo(1.12,.72);c.lineTo(.65,.80);c.closePath();c.fill();c.fillRect(-1.5,-.73,.40,1.46);
 c.fillStyle='#e7eadd';c.fillRect(-.98,-.70,1.56,1.40);c.strokeStyle='#8b9c88';c.beginPath();c.moveTo(-.8,-.48);c.lineTo(.35,-.48);c.moveTo(-.8,.48);c.lineTo(.35,.48);c.stroke();
 c.fillStyle='#f4edbb';c.fillRect(2.30,-.75,.13,.40);c.fillRect(2.30,.35,.13,.40);c.fillStyle=r.brake>.1||r.gear==='P'?'#d07551':'#ac8066';c.fillRect(-2.43,-.78,.12,.36);c.fillRect(-2.43,.42,.12,.36);
 if(r.gear==='R'){c.fillStyle='#f3f3df';c.fillRect(-2.43,-.40,.12,.18);c.fillRect(-2.43,.22,.12,.18);}
 for(const [x,slip,sink]of [[1.45,r.frontSlip,r.frontSink],[-1.45,r.rearSlip,r.rearSink]]){if(sink>.02){c.strokeStyle='#a68d63';c.lineWidth=.18;for(const side of [-1,1]){c.beginPath();c.moveTo(x-.7,side*1.02);c.lineTo(x+.4,side*1.02);c.stroke();}}if(slip>.05){c.strokeStyle=r.surface==='sand'?'#c0a879':'#c8c7a5';c.lineWidth=.13;for(let i=0;i<5;i++){const a=(r.time*5+i*.19)%1;c.beginPath();c.arc(x-a*.8,(i%2?1:-1)*1.12,.08+a*.15,0,Math.PI*2);c.stroke();}}}
 c.restore();}if(!r.postBroken&&(!bridgeOnly||onBridge(p))){c.fillStyle='#d3a34b';c.strokeStyle='#7b6943';c.lineWidth=.07;c.beginPath();c.arc(p.x,p.y,.23,0,Math.PI*2);c.fill();c.stroke();}
 if(r.winch.attached&&!bridgeOnly){const eye=bowEye(b),post=winchPost(r);c.strokeStyle=r.winch.tension>r.winch.capacity*.8?'#b6794d':'#788b89';c.lineWidth=.085;c.beginPath();c.moveTo(eye.x,eye.y);c.lineTo(post.x,post.y);c.stroke();}

}
