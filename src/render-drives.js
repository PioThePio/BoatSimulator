// Local SI geometry. An outboard has a large above-water cowling; a sterndrive
// shows only the slender external leg (the engine is inside the hull).
export function drawSternDrive(ctx,b,en){
 const out=b.spec.propulsion==='outboard',tilt=en.trim;
 ctx.save();ctx.translate(-b.spec.length*.51,en.y);ctx.rotate(-(en.forceSteer??en.steerAngle??b.actualSteer));
 ctx.strokeStyle=en.propDamage>=70?'#a96852':'#41675f';ctx.lineCap='round';ctx.lineWidth=.12;
 if(out){
  // Clamp bracket at the transom and a recognisable broad engine cover.
  ctx.fillStyle='#758b80';ctx.beginPath();ctx.roundRect(-.15,-.24,.22,.48,.04);ctx.fill();
  ctx.fillStyle='#3f5858';ctx.strokeStyle='#d8e6d8';ctx.lineWidth=.035;ctx.beginPath();ctx.roundRect(-.83,-.31,.76,.62,.19);ctx.fill();ctx.stroke();
  ctx.fillStyle='#708b88';ctx.beginPath();ctx.roundRect(-.68,-.25,.42,.50,.13);ctx.fill();ctx.strokeStyle='#b8ccc0';ctx.lineWidth=.025;ctx.beginPath();ctx.moveTo(-.55,-.2);ctx.lineTo(-.55,.2);ctx.stroke();
  ctx.fillStyle='#d1dfce';ctx.fillRect(-.26,-.11,.06,.22);
  if(tilt>.4){ctx.fillStyle='#263f42';ctx.beginPath();ctx.roundRect(-.86-.32*tilt,-.095,.32*tilt,.19,.04);ctx.fill();}
 }else{
  // Restore the earlier narrow leg + transverse propeller silhouette.
  ctx.fillStyle='#6c8280';ctx.beginPath();ctx.roundRect(-.12,-.13,.17,.26,.045);ctx.fill();
  ctx.strokeStyle=en.propDamage>=70?'#a96852':'#41675f';ctx.lineWidth=.14;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-.52-.25*tilt,0);ctx.stroke();
  ctx.fillStyle='#617e75';ctx.beginPath();ctx.ellipse(-.47-.25*tilt,0,.19,.085,0,0,Math.PI*2);ctx.fill();ctx.lineWidth=.09;ctx.beginPath();ctx.moveTo(-.55-.25*tilt,-.20);ctx.lineTo(-.55-.25*tilt,.20);ctx.stroke();
 }
 ctx.restore();
}
