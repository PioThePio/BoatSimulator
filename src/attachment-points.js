export const BASE_CLEATS={bow:'Dziób',portBow:'Lewy przód',starboardBow:'Prawy przód',portStern:'Lewa rufa',starboardStern:'Prawa rufa',stern:'Rufa · punkt holowniczy'};
export function attachmentNames(b){
 let names=b.fleetKind==='banana'||b.fleetKind==='mat'?{bow:'Przednie ucho holownicze'}:b.fleetKind==='kayak'||b.fleetKind==='rowboat'?{bow:'Dziób',stern:'Rufa'}:b.fleetKind==='barge'?{...BASE_CLEATS,portMid:'Lewa burta · środek',starboardMid:'Prawa burta · środek',towCenter:'Centralny poler holowniczy'}:{...BASE_CLEATS};
 // Old saves may have ties at points which are no longer offered on that type.
 for(const r of b.ropes??[])if(!names[r.end])names[r.end]=BASE_CLEATS[r.end]??r.end;
 return names;
}
export function localAttachment(S,end){
 if(end==='towCenter')return{x:0,y:0};
 if(end==='portMid'||end==='starboardMid')return{x:0,y:(end==='portMid'?-1:1)*S.beam*.43};
 const side=end.startsWith('port')?-1:end.startsWith('starboard')?1:0;
 const stern=end==='stern'||end.endsWith('Stern'),x=(end==='stern'?-.46:stern?-.39:end==='bow'?.39:.19)*S.length;
 return{x,y:side*S.beam*(stern?.43:.32)};
}
