// Main training harbour. All manufactured dimensions are metres, independent
// of the compressed atlas. These are exercise facilities, not a surveyed port.
export const PARKING={x:91,y:-112,w:139,h:104};
export const SERVICE_BUILDING={x:139,y:-9,w:16,h:10,roof:'#839a92',service:true};
// Trailer tails face the workshop. Car and trailer bays open onto the aisles,
// with the planted islands between their CLOSED ends, never across an entrance.
export const SERVICE_BAYS=[{id:1,x:140,y:-24,w:4.5,h:12,heading:-Math.PI/2},{id:2,x:147,y:-24,w:4.5,h:12,heading:-Math.PI/2}];
export const PARKING_SPACES=[
 ...[-97.5,-90].flatMap((y,row)=>Array.from({length:8},(_,i)=>({x:95+i*3,y,w:2.7,h:5.5,type:'car',closedEdge:row?'north':'south',heading:row?-Math.PI/2:Math.PI/2}))),
 ...[-98,-84].flatMap((y,row)=>Array.from({length:6},(_,i)=>({x:144+i*5,y,w:4.5,h:12,type:'trailer',closedEdge:row?'north':'south',heading:row?Math.PI/2:-Math.PI/2}))),
 ...Array.from({length:3},(_,i)=>({x:99+i*5.5,y:-36,w:4.5,h:22,type:'rig',heading:-Math.PI/2}))
];
export const YARD_ISLANDS=[{x:95,y:-92,w:24,h:2},{x:144,y:-86,w:29.5,h:2}];
export const HANGAR={x:68,y:-92,w:22,h:18,roof:'#7c8c86',hangar:true};
export const RETURN_BAY={x:73,y:-89,w:6,h:14,heading:Math.PI/2};
export function buildingWalls(house){return house.hangar?[
 {x:house.x,y:house.y,w:house.w,h:.4},
 {x:house.x,y:house.y,w:.4,h:house.h},
 {x:house.x+house.w-.4,y:house.y,w:.4,h:house.h},
 {x:house.x,y:house.y+house.h-.4,w:4,h:.4},
 {x:house.x+14,y:house.y+house.h-.4,w:8,h:.4}
]:[house];}
export const WILD_SLIP={x:244,y:-31,w:10,h:48,waterY:-18,angle:10};
export const TECHNICAL_DOCKS=[
 ...[[146,164],[173,184],[193,219]].map(([a,b])=>({x:a,y:4,w:b-a,h:4})),
 ...[164,184].flatMap(x=>[{x:x-2,y:-17,w:2,h:21},{x:x+9,y:-17,w:2,h:21},{x,y:-17,w:9,h:2}])
].map(q=>({...q,service:true,site:'technical',material:'concrete'}));
export const SAND_PRACTICE={x:238,y:-101,w:23,h:32,outline:[[239,-98],[245,-102],[256,-99],[262,-90],[259,-81],[261,-74],[253,-68],[242,-70],[237,-81]].map(([x,y])=>({x,y}))};
export const MAIN_BEACH={x:-38,y:-2.5,r:34,name:'Plaża portowa',outline:[[-78,-10],[-75,-23],[-65,-36],[-46,-39],[-26,-34],[-8,-21],[-5,0],[-23,4],[-47,1],[-65,-4]].map(([x,y])=>({x,y}))};
export const SPARE_TRAILER_BAYS=[{x:201,y:-71,length:4.2,beam:1.85,mass:650},{x:210,y:-71,length:5.5,beam:2.25,mass:1400},{x:219,y:-71,length:7.5,beam:2.65,mass:3000}];
export function polygonContains(points,x,y){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++)if((points[i].y>y)!==(points[j].y>y)&&x<(points[j].x-points[i].x)*(y-points[i].y)/(points[j].y-points[i].y)+points[i].x)hit=!hit;return hit;}
export function rectContains(p,x,y){return x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h;}
// Retain the original quay and slip waterline; add only local shoreline detail.
export function refineMainShore(points){
 const west=points.findIndex(p=>p.x>= -101&&p.x< -60&&p.y> -30&&p.y<0),east=points.findIndex((p,i)=>i>west&&p.x>260&&p.y< -30);if(west<0||east<0)return points;
 return [...points.slice(0,west),...[[ -100,-11.333333333333334],[-93,-13],[-80,-12],[-71,-7],[-59,-5],[-47,-1],[-35,-3],[-23,0],[-12,-1],[0,1],[11,4],[38,4],[46,2.8],[52,4],[103,4],[116,4],[116,6],[133,6],[140,4],[164,4],[164,-15],[173,-15],[173,4],[184,4],[184,-15],[193,-15],[193,4],[216,2],[231,-2],[241,-18],[257,-18],[261,-28]].map(([x,y])=>({x,y})),...points.slice(east)];
}
