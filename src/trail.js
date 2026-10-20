// A distance-based track cannot accumulate a fan of coincident points at rest.
export function recordTrail(points,boat){
 const last=points[points.length-1];
 if(!last||Math.hypot(boat.x-last.x,boat.y-last.y)>=.35){points.push({x:boat.x,y:boat.y});if(points.length>1800)points.shift();}
 return points;
}
