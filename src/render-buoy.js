export function drawMooringBuoy(ctx,q,selected,time){
 const h=q.heave??0,x=q.x+(q.heelX??0)*.8,y=q.y-.19-h*.7+(q.heelY??0)*.8;
 ctx.strokeStyle='#d8eee5a0';ctx.lineWidth=.06;ctx.beginPath();ctx.ellipse(q.x,q.y,.59,.32,0,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#507e7d55';ctx.beginPath();ctx.ellipse(q.x+.1,q.y+.16,.43,.27,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#6d7754';ctx.lineWidth=.09;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(x,y-.3);ctx.stroke();
 ctx.fillStyle=selected?'#bd7541':time-(q.contactAt??-10)<.6?'#e7bd72':'#e7d4a1';ctx.strokeStyle='#7b6943';ctx.lineWidth=.06;ctx.beginPath();ctx.ellipse(x,y,.40,.30,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#f5f2d3';ctx.beginPath();ctx.ellipse(x-.06,y-.10,.20,.09,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#625b40';ctx.lineWidth=.055;ctx.beginPath();ctx.arc(x,y-.28,.095,0,Math.PI*2);ctx.stroke();
}
