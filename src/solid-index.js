// Broad phase only: exact rectangle/circle contacts and their processing order
// are unchanged. Static geometry is indexed once after world construction.
const caches=new WeakMap(),CELL=24;
export function nearbySolids(solids,x,y,radius){
 let cache=caches.get(solids);if(!cache||cache.length!==solids.length){const grid=new Map();for(const [i,d]of solids.entries())for(let j=Math.floor(d.y/CELL);j<=Math.floor((d.y+d.h)/CELL);j++)for(let k=Math.floor(d.x/CELL);k<=Math.floor((d.x+d.w)/CELL);k++){const key=k+','+j;let list=grid.get(key);if(!list)grid.set(key,list=[]);list.push(i);}cache={grid,length:solids.length};caches.set(solids,cache);}
 const found=new Set();for(let j=Math.floor((y-radius)/CELL);j<=Math.floor((y+radius)/CELL);j++)for(let i=Math.floor((x-radius)/CELL);i<=Math.floor((x+radius)/CELL);i++)for(const k of cache.grid.get(i+','+j)??[])found.add(k);
 return [...found].sort((a,b)=>a-b).filter(i=>{const d=solids[i],dx=Math.max(d.x-x,0,x-d.x-d.w),dy=Math.max(d.y-y,0,y-d.y-d.h);return dx*dx+dy*dy<radius*radius;});
}
