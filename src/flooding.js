import {clamp} from './world.js';
export function floodingDepth(b){
 const level=b.bilge?.level??0;
 return clamp((level-.35)/.65,0,1)**1.65*(b.spec.freeboard*1.3+.65);
}
export function floodingStep(b,dt,surface=0){
 const wet=b.bilge?.level??0;
 const deck=b.heave+b.spec.freeboard*.5,top=b.heave+b.spec.freeboard;
 b.submersion=clamp((surface-deck+.08)/(b.spec.freeboard*.6+.4),0,1);
 b.swamped=wet>.5&&surface>deck;b.sunken=wet>.85&&surface>top+.05;
 for(const en of b.engines){
  const submerged=wet>.5&&surface>b.heave+b.spec.freeboard*.75+.10;
  en.floodTime=submerged?(en.floodTime??0)+dt:Math.max(0,(en.floodTime??0)-dt);
  if(en.floodTime>1.5&&['running','starting'].includes(en.key)){
   en.key='ignition';en.thrust=en.rpm=en.n=en.gear=en.ventilation=0;en.flooded=true;
   b.events.unshift({time:b.time,message:'Silnik zgasł · woda dosięgła silnika. Wypompuj wodę i skorzystaj z serwisu.'});b.events.splice(12);
  }
 }
}
