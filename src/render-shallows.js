import {EUZEBIA,bottomAt} from './world.js';
let image;
// A small cached bathymetry raster is interpolated by Canvas. Colour and
// contacts query the exact same bottomAt; dry land is painted over it afterwards.
export function drawEuzebiaShallows(ctx){
 const box=EUZEBIA.bounds,pad=40,left=box.left-pad,top=box.top-pad,width=box.right-box.left+pad*2,height=box.bottom-box.top+pad*2,cell=2;
 if(!image){const canvas=document.createElement('canvas');canvas.width=Math.ceil(width/cell);canvas.height=Math.ceil(height/cell);const c=canvas.getContext('2d');for(let j=0;j<canvas.height;j++)for(let i=0;i<canvas.width;i++){const d=bottomAt(left+(i+.5)*cell,top+(j+.5)*cell);if(d.land||d.depth>2.5)continue;c.fillStyle=d.depth<.2?'#d1d8b8':d.depth<.5?'#b9d5c5':d.depth<1?'#a8cecb':d.depth<1.6?'#9cc6cb':'#95bfc8';c.fillRect(i,j,1,1);}image=canvas;}
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(image,left,top,width,height);ctx.restore();
}
