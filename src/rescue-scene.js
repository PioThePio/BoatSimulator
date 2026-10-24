import {createRescue,RESCUE_TYPES,advanceRescueObject,pickupStatus} from './rescue.js';
import {environment,bottomAt,SOLIDS} from './world.js';
import {point} from './rigging.js';
import {sampleWater} from './wave-field.js';
export function throwRescue(fleet,b,kind='ring',side=1){
 fleet.rescue??=createRescue();const state=fleet.rescue,p=RESCUE_TYPES[kind];
 if(!p)return{ok:false,message:'Wybierz koło lub manekin treningowy.'};
 if(b.towRig?.boatLoaded||bottomAt(b.x,b.y).depth<=0)return{ok:false,message:'Obiekt ratunkowy można wyrzucić z pływającej łodzi.'};
 if(state.objects.filter(o=>!o.recovered).length>=12)return{ok:false,message:'Najpierw podejmij część obiektów (limit 12 na wodzie).'};
 const sign=side<0?-1:1,pos=point(b,0,sign*(b.spec.beam*.5+1.2)),c=Math.cos(b.a),s=Math.sin(b.a);
 if(bottomAt(pos.x,pos.y).depth<=0||SOLIDS.some(d=>pos.x>d.x-p.beam*.5&&pos.x<d.x+d.w+p.beam*.5&&pos.y>d.y-p.beam*.5&&pos.y<d.y+d.h+p.beam*.5))return{ok:false,message:'Po tej stronie jest ląd lub pomost. Wybierz drugą burtę.'};
 const o={id:'rescue-'+state.nextId++,kind,...pos,a:b.a,vx:b.vx-sign*s*1.5,vy:b.vy+sign*c*1.5,heave:0,roll:0,thrownAt:fleet.time,recovered:false,contactAt:-10};
 state.objects=[...state.objects.filter(q=>!q.recovered),...state.objects.filter(q=>q.recovered).slice(-15),o];return{ok:true,object:o,message:p.name+' · wyrzucono z '+(sign<0?'lewej':'prawej')+' burty.'};
}
export function recoverRescue(fleet,b,id){
 const o=fleet.rescue?.objects.find(o=>o.id===id),status=pickupStatus(b,o);if(!status.ok)return status;
 o.recovered=true;o.recoveredAt=fleet.time;o.elapsed=fleet.time-o.thrownAt;fleet.rescue.recovered++;return{ok:true,message:'Podjęto: '+RESCUE_TYPES[o.kind].name+' · '+Math.round(o.elapsed)+' s.'};
}
export function rescueStep(fleet,e,dt){
 const state=fleet.rescue??=createRescue(),world=fleet.boats[0];
 for(let i=0;i<state.objects.length;i++){
  let o=state.objects[i];if(o.recovered)continue;
  const flow=environment(fleet.time,e,o.x,o.y),wave=sampleWater(world,o.x,o.y,e),floor=bottomAt(o.x,o.y);
  Object.assign(o,advanceRescueObject(o,flow,wave,floor,dt));
  // Soft contact with hulls; a floating training object yields to the boat.
  for(const b of fleet.boats){if(Math.hypot(o.x-b.x,o.y-b.y)>b.spec.length+1)continue;const c=Math.cos(b.a),s=Math.sin(b.a),dx=o.x-b.x,dy=o.y-b.y,x=dx*c+dy*s,y=-dx*s+dy*c,r=RESCUE_TYPES[o.kind].beam*.5,rx=b.spec.length*.45,ry=b.spec.beam*.48,n=Math.hypot(x/(rx+r),y/(ry+r));if(n>=1)continue;
   const nx=n<.001?0:x/((rx+r)**2),ny=n<.001?1:y/((ry+r)**2),d=Math.hypot(nx,ny),wx=(c*nx-s*ny)/d,wy=(s*nx+c*ny)/d,depth=(1-n)*Math.min(rx+r,ry+r),rel=(o.vx-b.vx)*wx+(o.vy-b.vy)*wy;
   o.vx+=wx*Math.max(0,-rel+depth*3);o.vy+=wy*Math.max(0,-rel+depth*3);if(fleet.time-o.contactAt>2){state.contacts++;o.contactAt=fleet.time;}
  }
  for(const d of SOLIDS){const x=Math.max(d.x,Math.min(o.x,d.x+d.w)),y=Math.max(d.y,Math.min(o.y,d.y+d.h)),dx=o.x-x,dy=o.y-y,r=RESCUE_TYPES[o.kind].beam*.5,dist=Math.hypot(dx,dy);if(dist>.001&&dist<r){const nx=dx/dist,ny=dy/dist,rel=o.vx*nx+o.vy*ny;o.x+=nx*(r-dist);o.y+=ny*(r-dist);if(rel<0){o.vx-=rel*nx;o.vy-=rel*ny;}}}
 }
}
