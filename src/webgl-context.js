import earcut from 'earcut';

const VERTEX=`#version 300 es
layout(location=0) in vec2 position;
layout(location=1) in vec4 shade;
uniform vec2 resolution;
out vec4 color;
void main(){gl_Position=vec4(position/resolution*2.0-1.0,0.0,1.0);gl_Position.y=-gl_Position.y;color=shade;}`;
const FRAGMENT=`#version 300 es
precision mediump float;
in vec4 color;
out vec4 pixel;
void main(){pixel=color;}`;
const TEXTURED_VERTEX=`#version 300 es
layout(location=0) in vec2 position;
layout(location=1) in vec2 uv;
uniform vec2 resolution;
out vec2 coordinate;
void main(){gl_Position=vec4(position/resolution*2.0-1.0,0.0,1.0);gl_Position.y=-gl_Position.y;coordinate=uv;}`;
const TEXTURED_FRAGMENT=`#version 300 es
precision mediump float;
in vec2 coordinate;
uniform sampler2D source;
uniform float opacity;
out vec4 pixel;
void main(){pixel=texture(source,coordinate)*opacity;}`;
const identity=()=>[1,0,0,1,0,0];
const multiply=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
const transform=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
const closeEnough=(a,b)=>Math.abs(a[0]-b[0])<1e-6&&Math.abs(a[1]-b[1])<1e-6;
const colorCanvas=document.createElement('canvas'),colorContext=colorCanvas.getContext('2d');
const colorCache=new Map();
function colorOf(value){
 if(typeof value!=='string')value=value?.stops?.at(-1)?.[1]??'#000';
 if(colorCache.has(value))return colorCache.get(value);
 colorContext.fillStyle='#000';colorContext.fillStyle=value;
 const canonical=colorContext.fillStyle;let rgba;
 if(canonical.startsWith('#')){const hex=canonical.slice(1),pairs=hex.length===3?[...hex].map(v=>v+v):hex.match(/../g);rgba=[...pairs.slice(0,3).map(v=>parseInt(v,16)/255),pairs[3]?parseInt(pairs[3],16)/255:1];}
 else{const numbers=canonical.match(/[\d.]+/g)?.map(Number)??[0,0,0,1];rgba=[numbers[0]/255,numbers[1]/255,numbers[2]/255,numbers[3]??1];}
 colorCache.set(value,rgba);return rgba;
}
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(gl,vertex,fragment){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}

export class WebGLPath{
 constructor(){this.paths=[];this.current=null;}
 moveTo(x,y){this.current=[[x,y]];this.paths.push(this.current);}
 lineTo(x,y){if(!this.current)this.moveTo(x,y);else this.current.push([x,y]);}
 closePath(){if(this.current?.length>1&&!closeEnough(this.current[0],this.current.at(-1)))this.current.push([...this.current[0]]);}
 rect(x,y,w,h){this.moveTo(x,y);this.lineTo(x+w,y);this.lineTo(x+w,y+h);this.lineTo(x,y+h);this.closePath();}
 quadraticCurveTo(cx,cy,x,y){const p=this.current?.at(-1)??[0,0];for(let i=1;i<=8;i++){const t=i/8,s=1-t;this.lineTo(s*s*p[0]+2*s*t*cx+t*t*x,s*s*p[1]+2*s*t*cy+t*t*y);}}
 bezierCurveTo(c1x,c1y,c2x,c2y,x,y){const p=this.current?.at(-1)??[0,0];for(let i=1;i<=12;i++){const t=i/12,s=1-t;this.lineTo(s*s*s*p[0]+3*s*s*t*c1x+3*s*t*t*c2x+t*t*t*x,s*s*s*p[1]+3*s*s*t*c1y+3*s*t*t*c2y+t*t*t*y);}}
 ellipse(x,y,rx,ry,rotation,start,end,ccw=false){if(rx<=0||ry<=0)return;let sweep=end-start;if(!ccw&&sweep<0)sweep+=Math.PI*2;if(ccw&&sweep>0)sweep-=Math.PI*2;if(Math.abs(sweep)>=Math.PI*2)sweep=ccw?-Math.PI*2:Math.PI*2;const n=Math.max(8,Math.min(64,Math.ceil(Math.abs(sweep)*Math.max(rx,ry)*3))),co=Math.cos(rotation),si=Math.sin(rotation);for(let i=0;i<=n;i++){const a=start+sweep*i/n,px=rx*Math.cos(a),py=ry*Math.sin(a),qx=x+px*co-py*si,qy=y+px*si+py*co;if(i===0){if(this.current?.length)this.lineTo(qx,qy);else this.moveTo(qx,qy);}else this.lineTo(qx,qy);}}
 arc(x,y,r,start,end,ccw=false){this.ellipse(x,y,r,r,0,start,end,ccw);}
 roundRect(x,y,w,h,r=0){r=Math.max(0,Math.min(typeof r==='number'?r:r[0]??0,Math.abs(w)/2,Math.abs(h)/2));if(!r){this.rect(x,y,w,h);return;}this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.arc(x+w-r,y+r,r,-Math.PI/2,0);this.lineTo(x+w,y+h-r);this.arc(x+w-r,y+h-r,r,0,Math.PI/2);this.lineTo(x+r,y+h);this.arc(x+r,y+h-r,r,Math.PI/2,Math.PI);this.lineTo(x,y+r);this.arc(x+r,y+r,r,Math.PI,Math.PI*1.5);this.closePath();}
}

export function createWebGLContext(canvas){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,stencil:true,preserveDrawingBuffer:false});
 if(!gl)throw Error('WebGL2 jest niedostępny w tej przeglądarce.');
 const colorProgram=program(gl,VERTEX,FRAGMENT),textureProgram=program(gl,TEXTURED_VERTEX,TEXTURED_FRAGMENT),colorBuffer=gl.createBuffer(),textureBuffer=gl.createBuffer();
 const textContext=document.createElement('canvas').getContext('2d');
 const imageTextures=new Map(),textTextures=new Map();let pending=[];
 let state={matrix:identity(),fillStyle:'#000',strokeStyle:'#000',lineWidth:1,lineCap:'butt',lineJoin:'miter',font:'10px sans-serif',textAlign:'start',textBaseline:'alphabetic',globalAlpha:1,lineDash:[],clipMask:0,imageSmoothingEnabled:true};
 const stack=[];let path=new WebGLPath();
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
 function useColor(vertices){if(!vertices.length)return;gl.useProgram(colorProgram);gl.uniform2f(gl.getUniformLocation(colorProgram,'resolution'),canvas.width,canvas.height);gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STREAM_DRAW);gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(0,2,gl.FLOAT,false,24,0);gl.vertexAttribPointer(1,4,gl.FLOAT,false,24,8);gl.drawArrays(gl.TRIANGLES,0,vertices.length/6);}
 function flush(){if(pending.length){useColor(pending);pending=[];}}
 function clipState(){if(state.clipMask){gl.enable(gl.STENCIL_TEST);gl.stencilFunc(gl.EQUAL,state.clipMask,state.clipMask);gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);gl.stencilMask(0);}else gl.disable(gl.STENCIL_TEST);}
 function triangles(points,indices,color,out=pending,matrix=state.matrix){const rgba=colorOf(color),alpha=rgba[3]*state.globalAlpha;for(const i of indices){const p=points[i],q=transform(matrix,p[0],p[1]);out.push(q[0],q[1],rgba[0],rgba[1],rgba[2],alpha);}}
 function pathTriangles(paths,evenodd=false,matrix=state.matrix,color=state.fillStyle,out=pending){if(evenodd&&paths.length>1){const vertices=[],holes=[];for(const [i,points]of paths.entries()){if(points.length<3)continue;if(i)holes.push(vertices.length/2);for(const p of points)vertices.push(p[0],p[1]);}const indices=earcut(vertices,holes);triangles(Array.from({length:vertices.length/2},(_,i)=>[vertices[i*2],vertices[i*2+1]]),indices,color,out,matrix);return;}
  for(const points of paths){if(points.length<3)continue;const raw=points.length>3&&closeEnough(points[0],points.at(-1))?points.slice(0,-1):points;const flat=raw.flat();triangles(raw,earcut(flat),color,out,matrix);}}
 function line(a,b,width,color){const p=transform(state.matrix,...a),q=transform(state.matrix,...b),dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy);if(length<1e-6)return;const m=state.matrix,scale=(Math.hypot(m[0],m[1])+Math.hypot(m[2],m[3]))/2,half=Math.max(.35,width*scale/2),nx=-dy/length*half,ny=dx/length*half,rgba=colorOf(color),alpha=rgba[3]*state.globalAlpha;for(const v of [[p[0]+nx,p[1]+ny],[p[0]-nx,p[1]-ny],[q[0]+nx,q[1]+ny],[q[0]+nx,q[1]+ny],[p[0]-nx,p[1]-ny],[q[0]-nx,q[1]-ny]])pending.push(v[0],v[1],rgba[0],rgba[1],rgba[2],alpha);}
 function strokePaths(paths){
  const dash=state.lineDash.length%2?[...state.lineDash,...state.lineDash]:state.lineDash;
  for(const points of paths){let dashIndex=0,dashLeft=dash[0]??0;
   for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(!dash.length){line(a,b,state.lineWidth,state.strokeStyle);continue;}
    for(let at=0;at<length;){
     const span=Math.min(dashLeft,length-at);
     if(dashIndex%2===0&&span>0){const start=at/length,end=(at+span)/length;line([a[0]+(b[0]-a[0])*start,a[1]+(b[1]-a[1])*start],[a[0]+(b[0]-a[0])*end,a[1]+(b[1]-a[1])*end],state.lineWidth,state.strokeStyle);}
     at+=span;dashLeft-=span;
     if(dashLeft<=1e-8){dashIndex=(dashIndex+1)%dash.length;dashLeft=Math.max(1e-6,dash[dashIndex]);}
    }
   }
  }
 }
 function stencil(paths,evenodd=false){flush();let mask=1;while(mask&state.clipMask)mask<<=1;if(mask>128)throw Error('Too many nested WebGL clips');gl.stencilMask(mask);gl.clearStencil(0);gl.clear(gl.STENCIL_BUFFER_BIT);gl.colorMask(false,false,false,false);gl.enable(gl.STENCIL_TEST);gl.stencilFunc(gl.EQUAL,state.clipMask,state.clipMask);gl.stencilOp(gl.KEEP,gl.KEEP,gl.INVERT);gl.stencilMask(mask);
  for(const points of paths){if(points.length<3)continue;const vertices=[];pathTriangles([points],false,state.matrix,'#fff',vertices);useColor(vertices);}
  gl.colorMask(true,true,true,true);state.clipMask|=mask;clipState();}
 function textureFor(image,cache,limit){let entry=cache.get(image);if(entry){cache.delete(image);cache.set(image,entry);return entry;}const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);entry={texture,width:image.width,height:image.height};cache.set(image,entry);if(cache.size>limit){const old=cache.keys().next().value;gl.deleteTexture(cache.get(old).texture);cache.delete(old);}return entry;}
 function imageRect(entry,x,y,w,h){flush();clipState();const m=state.matrix,points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(p=>transform(m,...p)),v=[];for(const [i,u,t]of [[0,0,0],[1,1,0],[2,0,1],[2,0,1],[1,1,0],[3,1,1]])v.push(points[i][0],points[i][1],u,t);gl.useProgram(textureProgram);gl.uniform2f(gl.getUniformLocation(textureProgram,'resolution'),canvas.width,canvas.height);gl.uniform1f(gl.getUniformLocation(textureProgram,'opacity'),state.globalAlpha);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,entry.texture);gl.uniform1i(gl.getUniformLocation(textureProgram,'source'),0);gl.bindBuffer(gl.ARRAY_BUFFER,textureBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STREAM_DRAW);gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(0,2,gl.FLOAT,false,16,0);gl.vertexAttribPointer(1,2,gl.FLOAT,false,16,8);gl.drawArrays(gl.TRIANGLES,0,6);}
 const info=gl.getExtension('WEBGL_debug_renderer_info'),renderer=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):'';
 const ctx={canvas,gl,softwareRenderer:/SwiftShader|llvmpipe|softpipe/i.test(renderer),createPath:()=>new WebGLPath(),
  save(){stack.push({...state,matrix:[...state.matrix],lineDash:[...state.lineDash]});},restore(){flush();if(stack.length){state=stack.pop();clipState();}},
  setTransform(a,b,c,d,e,f){state.matrix=[a,b,c,d,e,f];},getTransform(){const [a,b,c,d,e,f]=state.matrix;return{a,b,c,d,e,f};},translate(x,y){state.matrix=multiply(state.matrix,[1,0,0,1,x,y]);},scale(x,y){state.matrix=multiply(state.matrix,[x,0,0,y,0,0]);},rotate(a){const c=Math.cos(a),s=Math.sin(a);state.matrix=multiply(state.matrix,[c,s,-s,c,0,0]);},
  beginPath(){path=new WebGLPath();},moveTo(...a){path.moveTo(...a);},lineTo(...a){path.lineTo(...a);},closePath(){path.closePath();},rect(...a){path.rect(...a);},roundRect(...a){path.roundRect(...a);},quadraticCurveTo(...a){path.quadraticCurveTo(...a);},bezierCurveTo(...a){path.bezierCurveTo(...a);},arc(...a){path.arc(...a);},ellipse(...a){path.ellipse(...a);},
  fill(input,rule){let p=path;if(input instanceof WebGLPath)p=input;else if(typeof input==='string')rule=input;pathTriangles(p.paths,rule==='evenodd');},stroke(input){strokePaths(input instanceof WebGLPath?input.paths:path.paths);},clip(input,rule){let p=path;if(input instanceof WebGLPath)p=input;else if(typeof input==='string')rule=input;stencil(p.paths,rule==='evenodd');},clipPolygons(polygons,evenodd=false){stencil(polygons.map(points=>points.map(q=>[q.x,q.y])),evenodd);},
  fillRect(x,y,w,h){pathTriangles([[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]]);},strokeRect(x,y,w,h){strokePaths([[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]]);},clearRect(){flush();gl.viewport(0,0,canvas.width,canvas.height);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.STENCIL_TEST);gl.stencilMask(255);gl.clearColor(0,0,0,1);gl.clearStencil(0);gl.clear(gl.COLOR_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);state.clipMask=0;},
  drawImage(image,x,y,w=image.width,h=image.height){imageRect(textureFor(image,imageTextures,32),x,y,w,h);},
  createLinearGradient(){const stops=[];return{stops,addColorStop(at,color){stops.push([at,color]);}};},
  setLineDash(dash){state.lineDash=[...dash];},measureText(text){textContext.font=state.font;return textContext.measureText(String(text));},
  fillText(text,x,y){text=String(text);const font=state.font,color=state.fillStyle,key=font+'|'+color+'|'+text;let entry=textTextures.get(key);if(!entry){textContext.font=font;const metrics=textContext.measureText(text),fontSize=Number(font.match(/[\d.]+(?=px)/)?.[0]??10),ascent=Math.max(fontSize,metrics.actualBoundingBoxAscent??fontSize),descent=Math.max(fontSize*.3,metrics.actualBoundingBoxDescent??0),factor=4,pad=2;const off=document.createElement('canvas');off.width=Math.max(1,Math.ceil((metrics.width+pad*2)*factor));off.height=Math.max(1,Math.ceil((ascent+descent+pad*2)*factor));const c=off.getContext('2d');c.scale(factor,factor);c.font=font;c.textBaseline='alphabetic';c.fillStyle=typeof color==='string'?color:'#000';c.fillText(text,pad,ascent+pad);entry={...textureFor(off,textTextures,512),advance:metrics.width,ascent,descent,pad,factor};textTextures.delete(off);textTextures.set(key,entry);}
   else{textTextures.delete(key);textTextures.set(key,entry);}const align=state.textAlign,baseline=state.textBaseline,left=x-(align==='center'?entry.advance/2:align==='right'||align==='end'?entry.advance:0)-entry.pad,top=y-(baseline==='top'||baseline==='hanging'?0:baseline==='middle'?(entry.ascent-entry.descent)/2:baseline==='bottom'?entry.ascent+entry.descent:entry.ascent)-entry.pad;imageRect(entry,left,top,entry.width/entry.factor,entry.height/entry.factor);},
  finish(){flush();}
 };
 for(const key of ['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','font','textAlign','textBaseline','globalAlpha','imageSmoothingEnabled'])Object.defineProperty(ctx,key,{get:()=>state[key],set:value=>state[key]=value});
 return ctx;
}
