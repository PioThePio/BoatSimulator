import {EUZEBIA,NIEPORET_SURVEY_BOUNDS,bottomAt} from './world.js';
let image;
// A small cached bathymetry raster is interpolated by Canvas. Colour and
// contacts query the exact same bottomAt; dry land is painted over it afterwards.
export function drawEuzebiaShallows(ctx){
 const box=EUZEBIA.bounds,pad=40,left=box.left-pad,top=box.top-pad,width=box.right-box.left+pad*2,height=box.bottom-box.top+pad*2,cell=2;
 if(!image){const canvas=document.createElement('canvas');canvas.width=Math.ceil(width/cell);canvas.height=Math.ceil(height/cell);const c=canvas.getContext('2d');for(let j=0;j<canvas.height;j++)for(let i=0;i<canvas.width;i++){const d=bottomAt(left+(i+.5)*cell,top+(j+.5)*cell);if(d.land||d.depth>2.5)continue;c.fillStyle=d.depth<.2?'#d1d8b8':d.depth<.5?'#b9d5c5':d.depth<1?'#a8cecb':d.depth<1.6?'#9cc6cb':'#95bfc8';c.fillRect(i,j,1,1);}image=canvas;}
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(image,left,top,width,height);ctx.restore();
}

let surveyImage;
// Cached colours query the physical bottom and are clipped by the lake path.
// This is not a photograph or a separate land/water mask.
export function drawNieporetDepths(ctx,bounds){
 const box=NIEPORET_SURVEY_BOUNDS,left=box.left-55,top=box.top-30,width=box.right-left+85,height=box.bottom-top,cell=3;
 if(bounds&&(bounds.right<left||bounds.left>left+width||bounds.bottom<top||bounds.top>top+height))return;
 if(!surveyImage){const canvas=document.createElement('canvas');canvas.width=Math.ceil(width/cell);canvas.height=Math.ceil(height/cell);const c=canvas.getContext('2d');for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const q=bottomAt(left+(x+.5)*cell,top+(y+.5)*cell);if(q.land)continue;c.fillStyle=q.depth<.2?'#c0d7c5':q.depth<.6?'#afd0ce':q.depth<1.2?'#a0c8cb':q.depth<2?'#92bdc5':'#8bb5c0';c.globalAlpha=Math.max(0,Math.min(1,x*cell/35,y*cell/35,(width-x*cell)/35,(height-y*cell)/35));c.fillRect(x,y,1,1);}surveyImage=canvas;}
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(surveyImage,left,top,width,height);ctx.restore();
}
