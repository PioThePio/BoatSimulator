// Exact zero-force fast path, not reduced-rate integration or frozen moorings.
// The first nonzero field, rope reaction or collision velocity wakes the body.
export function waterAtRest(flow,wave,ends=[]){
 const zero=q=>q.eta===0&&q.sx===0&&q.sy===0&&q.vx===0&&q.vy===0&&q.ax===0&&q.ay===0;
 return flow.wind.x===0&&flow.wind.y===0&&flow.current.x===0&&flow.current.y===0&&zero(wave)&&ends.every(zero);
}
export function bodyAtRest(q){return q.vx===0&&q.vy===0&&q.w===0&&q.heave===0&&q.heaveVelocity===0&&q.roll===0&&q.rollVelocity===0&&q.pitch===0&&q.pitchVelocity===0;}
