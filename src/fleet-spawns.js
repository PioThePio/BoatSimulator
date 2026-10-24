import {createFleetCraft} from './fleet-craft.js';
import {placementStatus,addFleetBoat} from './fleet.js';
import {createBoat} from './physics.js';
import {DOCKS,BOLLARDS} from './world.js';
import {attachmentNames} from './attachment-points.js';
import {cleat,attachRope} from './rigging.js';
import {mooringPoint} from './marina.js';
export function mooringChoices(fleet,b){
 b.booms=fleet.boats[0].booms;b.buoys=fleet.boats[0].buoys;b.worldRig=fleet.boats[0].worldRig;
 const choices=[];const used=new Set();
 for(const end of Object.keys(attachmentNames(b))){const p=cleat(b,end);let best=null,d=6;
  for(let i=0;i<BOLLARDS.length;i++){const q=mooringPoint(b,i);if(q.trailer||used.has(i))continue;const distance=Math.hypot(p.x-q.x,p.y-q.y);if(distance<d){d=distance;best=i;}}
  if(best!==null){choices.push({end,bollard:best,distance:d});used.add(best);}
 }return choices.sort((a,b)=>a.distance-b.distance).slice(0,2);
}
export function resolveFleetSpawn(fleet,kind,location,options={}){
 if(location==='map')return{ok:true,map:true,message:options.moored?'Wskaż wodę przy polerze · po dodaniu zostaną założone cumy.':'Wskaż dowolną wolną pozycję na wodzie.'};
 const base=createBoat(location,{coldStart:true}),b=createFleetCraft(kind,options),poses=[];
 if(options.moored){
  for(const d of DOCKS){if(Math.hypot(base.x-(d.x+d.w/2),base.y-(d.y+d.h/2))>55)continue;
   for(const side of [-1,1]){
    if(d.h>=b.spec.length*.8)for(const fraction of [.5,.25,.75])poses.push({x:side<0?d.x-b.spec.beam*.5-.65:d.x+d.w+b.spec.beam*.5+.65,y:d.y+d.h*fraction,a:-Math.PI/2});
    if(d.w>=b.spec.length*.8)for(const fraction of [.5,.25,.75])poses.push({x:d.x+d.w*fraction,y:side<0?d.y-b.spec.beam*.5-.65:d.y+d.h+b.spec.beam*.5+.65,a:0});
   }
  }
  poses.sort((a,b)=>Math.hypot(a.x-base.x,a.y-base.y)-Math.hypot(b.x-base.x,b.y-base.y));
 }else{
  poses.push({x:base.x,y:base.y,a:options.heading??base.a});
  for(const radius of [8,14,22,32])for(let i=0;i<12;i++)poses.push({x:base.x+Math.cos(i*Math.PI/6)*radius,y:base.y+Math.sin(i*Math.PI/6)*radius,a:options.heading??base.a});
 }
 for(const pose of poses){const status=placementStatus(fleet,b,pose,{grounded:options.condition==='grounded',traffic:options.traffic!==false});if(!status.ok)continue;const ties=options.moored?mooringChoices(fleet,{...b,...pose}):[];if(options.moored&&!ties.length)continue;return{ok:true,pose,ties,message:options.moored?`Zacumowana · ${ties.length} cumy do dostępnych polerów`:'Bez cum · wolna pozycja na wodzie'};}
 return{ok:false,message:options.moored?'Brak wolnego stanowiska z polerem dla tej jednostki. Wybierz inne miejsce lub wskaż na mapie.':'Brak wolnej wody o odpowiedniej głębokości. Zmień miejsce lub wskaż na mapie.'};
}
export function spawnFleetCraft(fleet,kind,pose,options={}){
 const probe=createFleetCraft(kind,options);Object.assign(probe,pose);
 const ties=options.moored?mooringChoices(fleet,probe):[];if(options.moored&&!ties.length)return{ok:false,message:'Nie ma polera w zasięgu 6 m od tej jednostki. Wskaż miejsce bliżej pomostu.'};
 const result=addFleetBoat(fleet,kind,pose,options);if(!result.ok)return result;
 for(const tie of ties)attachRope(result.boat,tie.end,tie.bollard);
 result.message+=' · '+(ties.length?'zacumowana':'bez cum');return result;
}
