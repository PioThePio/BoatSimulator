import {heelProjection} from './attitude.js';
import {hullOutline} from './hull-geometry.js';
// Visual projection only: contact points/ropes stay in the water-plane frame.
export function drawHeelEdges(ctx,b){
 const q=heelProjection(b.spec,b.roll),shape=hullOutline(b.spec);if(q.strength<.015)return;
 for(const side of[-1,1]){const low=side===q.lowSide,points=shape.filter(p=>p.y*side>=0);ctx.strokeStyle=low?`rgba(163,221,218,${q.strength*.85})`:`rgba(40,65,53,${q.strength*.6})`;ctx.lineWidth=(low?.14:.10)*q.strength;ctx.beginPath();for(const[i,p]of points.entries())i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);ctx.stroke();}
}
