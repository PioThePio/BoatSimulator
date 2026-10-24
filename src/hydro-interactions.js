const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Pure SI forces. normals point FROM the vessel TOWARD the bank/other vessel.
// A finite cap bounds very fast, nearly touching configurations; no force at rest.
export function bankSuctionForce({mass,length,beam,draft,speed,gap,depth,steepness,nx,ny,heading}){
 const c=Math.cos(heading),s=Math.sin(heading),side=-nx*s+ny*c,range=Math.max(.5,beam*1.1);
 if(gap<0||gap>length*2||steepness<=.15||Math.abs(speed)<.05||Math.abs(side)<.05)return{x:0,y:0,arm:0,magnitude:0};
 const proximity=Math.exp(-gap/range),confinement=1+.5*clamp(draft/Math.max(.1,depth),0,1);
 const magnitude=Math.min(mass*9.81*.08,.5*1000*length*draft*.012*speed*speed*proximity*proximity*steepness*side*side*confinement);
 return{x:-s*Math.sign(side)*magnitude,y:c*Math.sign(side)*magnitude,arm:-.18*length,magnitude};
}
export function passingInteraction(a,b,waterA={x:0,y:0},waterB={x:0,y:0}){
 const c=Math.cos(a.a),s=Math.sin(a.a),dx=b.x-a.x,dy=b.y-a.y,along=dx*c+dy*s,across=-dx*s+dy*c;
 const align=Math.abs(Math.cos(a.a-b.a));if(align<.65)return null;
 const crossB=Math.abs(Math.sin(b.a-a.a))*b.spec.length*.5+Math.abs(Math.cos(b.a-a.a))*b.spec.beam*.5;
 const gap=Math.abs(across)-a.spec.beam*.5-crossB,span=(a.spec.length+b.spec.length)*.5,overlap=clamp(1-Math.abs(along)/span,0,1);
 if(gap<0||gap>Math.max(a.spec.beam,b.spec.beam)*3||!overlap)return null;
 const ua=(a.vx-waterA.x)*c+(a.vy-waterA.y)*s,ub=(b.vx-waterB.x)*Math.cos(b.a)+(b.vy-waterB.y)*Math.sin(b.a),speed2=(ua*ua+ub*ub)*.5;
 const force=Math.min(Math.min(a.spec.mass,b.spec.mass)*9.81*.05,.5*1000*Math.min(a.spec.length,b.spec.length)*Math.min(a.spec.draft,b.spec.draft)*.008*speed2*Math.exp(-gap/Math.max(.5,(a.spec.beam+b.spec.beam)*.4))*overlap*align);
 if(force<.001)return null;const sign=Math.sign(across)||1;
 return{x:-s*sign*force,y:c*sign*force,armA:clamp(along*.25,-a.spec.length*.3,a.spec.length*.3),armB:clamp(-along*.25,-b.spec.length*.3,b.spec.length*.3),magnitude:force,gap};
}
