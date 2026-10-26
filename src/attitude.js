const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Positive roll raises starboard and lowers port (same convention as drive and
// bottom geometry). A positive/right yaw therefore banks to negative roll.
export function rollTarget(S,{crossSlope=0,windSide=0,surge=0,yaw=0,planing=0,towHeel=0}={}){
 const limit=({tender:.18,runabout:.20,cabin:.18,cruiser:.08,pwc:.28,flat:.16,rib:.22,swamp:.10,racing:.22})[S.profile]??.20;
 const bank=S.planing&&!S.air?-clamp(.55*Math.atan(surge*yaw/9.81),-limit,limit)*planing:0;
 const wind=-windSide*Math.abs(windSide)*S.freeboard/(S.mass*.9);
 return clamp(Math.atan(crossSlope)*(S.waveResponse??1)+wind+bank+towHeel,-.38,.38);
}
export function heelReading(roll){const degrees=Math.abs(roll*180/Math.PI);return{degrees,side:degrees<.2?'równo':roll>0?'L':'P',lowSide:roll>0?-1:1};}
export function heelProjection(S,roll){return{deckShift:-Math.sin(roll)*(S.freeboard??.6)*.6,lowSide:roll>0?-1:1,strength:Math.min(1,Math.abs(roll)/.25)};}
