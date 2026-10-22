import {PARKING,SERVICE_STATION,bottomAt,clamp} from './world.js';
import {SUV,bodyPoint,trailerPost,hitchStatus} from './towing.js';
import {SAND_PRACTICE} from './vehicle-terrain.js';
export function drawParking(c){
 const p=PARKING;c.fillStyle='#a6b1a0';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle='#879b87';c.lineWidth=.18;c.strokeRect(p.x,p.y,p.w,p.h);
 c.fillStyle='#acb5a3';c.fillRect(119.5,-8,11,16);c.strokeStyle='#e6e9cf';c.lineWidth=.15;
 for(const y of [-45,-20])for(let i=0;i<5;i++){const x=103+i*5.3;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+13);c.lineTo(x+4.7,y+13);c.lineTo(x+4.7,y);c.stroke();}
 c.setLineDash([1,.7]);c.beginPath();c.moveTo(103,-26);c.lineTo(161,-26);c.stroke();c.setLineDash([]);
 c.fillStyle='#637e68';c.font='bold 1.2px system-ui';c.fillText('P  ZESTAWY Z PRZYCZEPĄ',135,-44);c.font='1px system-ui';c.fillText('SLIP ↓',122,-10);
 c.strokeStyle='#edf0d9';c.lineWidth=.17;c.beginPath();c.moveTo(124.5,-17);c.lineTo(124.5,-10);c.moveTo(123.5,-11);c.lineTo(124.5,-10);c.lineTo(125.5,-11);c.stroke();
 const sand=SAND_PRACTICE;c.fillStyle='#d7c598';c.fillRect(sand.x,sand.y,sand.w,sand.h);c.fillStyle='#baa779';for(let i=0;i<90;i++)c.fillRect(sand.x+(i*7.13%sand.w),sand.y+(i*4.73%sand.h),.1,.1);c.font='bold 1px system-ui';c.fillStyle='#8f825c';c.fillText('PIACH · PRÓBA TRAKCJI',sand.x+.6,sand.y+2);
}
export function drawTowRig(c,r,b){
 if(!r)return;const t=r.trailer,p=trailerPost(r),rear=t.offset-b.spec.length*.51,front=t.offset+b.spec.length*.45;
 c.save();c.translate(t.x,t.y);c.rotate(t.a);
 const wet=bottomAt(t.x,t.y).depth>0;c.globalAlpha=wet?.75:1;c.strokeStyle='#697f79';c.lineWidth=.12;
 for(const side of [-1,1]){c.beginPath();c.moveTo(t.hitch,0);c.lineTo(front-.4,side*t.beam*.46);c.lineTo(rear,side*t.beam*.46);c.stroke();}
 c.strokeStyle='#a9bab1';c.lineWidth=.14;for(const x of [rear+.2,0,front-.3]){c.beginPath();c.moveTo(x,-t.beam*.48);c.lineTo(x,t.beam*.48);c.stroke();}
 c.strokeStyle='#877f62';c.lineWidth=.18;for(const side of [-1,1]){c.beginPath();c.moveTo(rear+.2,side*b.spec.beam*.27);c.lineTo(front-.6,side*b.spec.beam*.27);c.stroke();}
 c.fillStyle='#3e514e';for(let i=0;i<t.axles;i++)for(const side of [-1,1])c.fillRect((i-(t.axles-1)/2)*.62-.24,side*t.beam*.51-.15,.48,.30);
 if(!r.postBroken){c.fillStyle='#c58758';c.fillRect(front-.1,-.12,.2,.24);}if(!r.attached){c.fillStyle='#7d8f78';c.fillRect(t.hitch-.5,-.3,.12,.6);}c.fillStyle='#e1b764';c.fillRect(rear-.10,-t.beam*.46,.14,.32);c.fillStyle='#be7159';c.fillRect(rear-.10,t.beam*.46-.32,.14,.32);
 c.globalAlpha=1;c.restore();
 const q=r.car;c.save();c.translate(q.x,q.y);c.rotate(q.a);
 c.fillStyle='#66877933';c.fillRect(-2.5+.15,-1+.2,4.9,2);c.strokeStyle='#6a7e77';c.lineWidth=.13;c.beginPath();c.moveTo(-SUV.length/2,0);c.lineTo(-SUV.hitch,0);c.stroke();
 for(const x of [-SUV.wb/2,SUV.wb/2])for(const side of [-1,1]){c.save();c.translate(x,side*1);if(x>0)c.rotate(r.actualSteer);c.fillStyle='#344c47';c.fillRect(-.38,-.15,.76,.30);c.restore();}
 c.fillStyle='#d8dfd2';c.strokeStyle='#47675d';c.lineWidth=.08;c.beginPath();c.roundRect(-2.45,-.94,4.9,1.88,.28);c.fill();c.stroke();
 c.fillStyle='#728f89';c.beginPath();c.moveTo(.65,-.80);c.lineTo(1.12,-.72);c.lineTo(1.12,.72);c.lineTo(.65,.80);c.closePath();c.fill();c.fillRect(-1.5,-.73,.40,1.46);
 c.fillStyle='#e7eadd';c.fillRect(-.98,-.70,1.56,1.40);c.strokeStyle='#8b9c88';c.beginPath();c.moveTo(-.8,-.48);c.lineTo(.35,-.48);c.moveTo(-.8,.48);c.lineTo(.35,.48);c.stroke();
 c.fillStyle='#f4edbb';c.fillRect(2.30,-.75,.13,.40);c.fillRect(2.30,.35,.13,.40);c.fillStyle=r.brake>.1||r.gear==='P'?'#d07551':'#ac8066';c.fillRect(-2.43,-.78,.12,.36);c.fillRect(-2.43,.42,.12,.36);
 if(r.gear==='R'){c.fillStyle='#f3f3df';c.fillRect(-2.43,-.40,.12,.18);c.fillRect(-2.43,.22,.12,.18);}
 for(const [x,slip,sink]of [[1.45,r.frontSlip,r.frontSink],[-1.45,r.rearSlip,r.rearSink]]){if(sink>.02){c.strokeStyle='#a68d63';c.lineWidth=.18;for(const side of [-1,1]){c.beginPath();c.moveTo(x-.7,side*1.02);c.lineTo(x+.4,side*1.02);c.stroke();}}if(slip>.05){c.strokeStyle=r.surface==='sand'?'#c0a879':'#c8c7a5';c.lineWidth=.13;for(let i=0;i<5;i++){const a=(r.time*5+i*.19)%1;c.beginPath();c.arc(x-a*.8,(i%2?1:-1)*1.12,.08+a*.15,0,Math.PI*2);c.stroke();}}}
 c.restore();c.fillStyle='#d3a34b';c.strokeStyle='#7b6943';c.lineWidth=.07;c.beginPath();c.arc(p.x,p.y,.23,0,Math.PI*2);c.fill();c.stroke();
 if(!r.attached){const h=hitchStatus(r);c.strokeStyle=h.ready?'#6ba65b':'#c68648';c.lineWidth=.1;c.setLineDash([.25,.2]);c.beginPath();c.moveTo(h.p.x,h.p.y);c.lineTo(h.q.x,h.q.y);c.stroke();c.setLineDash([]);for(const q of [h.p,h.q]){c.beginPath();c.arc(q.x,q.y,.32,0,Math.PI*2);c.stroke();}}
}
