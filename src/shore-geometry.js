// BVH accelerates exact nearest-bank and ray-crossing queries. No metre grid
// approximation: a 5 m hull still contacts the same shoreline in a 17 km world.
export function createShoreQuery(points){
 const segments=points.map((b,i)=>{const a=points[(i+points.length-1)%points.length];return{a,b,minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minY:Math.min(a.y,b.y),maxY:Math.max(a.y,b.y)};});
 function build(items){
  const box={minX:Math.min(...items.map(q=>q.minX)),maxX:Math.max(...items.map(q=>q.maxX)),minY:Math.min(...items.map(q=>q.minY)),maxY:Math.max(...items.map(q=>q.maxY))};
  if(items.length<=6)return{...box,items};
  const axis=box.maxX-box.minX>box.maxY-box.minY?'X':'Y';items.sort((a,b)=>(a['min'+axis]+a['max'+axis])-(b['min'+axis]+b['max'+axis]));const middle=items.length>>1;
  return{...box,left:build(items.slice(0,middle)),right:build(items.slice(middle))};
 }
 const root=build(segments);const exact=new Map();
 return(x,y)=>{
  const key=x+','+y;if(exact.has(key))return{...exact.get(key)};
  let inside=false,best=Infinity,qx=0,qy=0;
  const distance=n=>Math.max(n.minX-x,0,x-n.maxX)**2+Math.max(n.minY-y,0,y-n.maxY)**2;
  function visit(node){
   const ray=y>=node.minY&&y<=node.maxY&&node.maxX>x;
   if(!ray&&distance(node)>best)return;
   if(node.items){for(const {a,b}of node.items){
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
    const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy))),px=a.x+t*dx,py=a.y+t*dy,d=(x-px)**2+(y-py)**2;
    if(d<best){best=d;qx=px;qy=py;}
   }}else{const first=distance(node.left)<distance(node.right)?node.left:node.right;visit(first);visit(first===node.left?node.right:node.left);}
  }
  visit(root);const d=Math.sqrt(best),sign=inside?1:-1;
  const result={distance:sign*d,qx,qy,nx:d>0?sign*(x-qx)/d:0,ny:d>0?sign*(y-qy)/d:1};if(exact.size>=1024)exact.delete(exact.keys().next().value);exact.set(key,result);return{...result};
 };
}
