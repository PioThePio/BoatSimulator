// CPU workload only; this does not measure the user's GPU or promise a frame rate.
// Optional argument: source directory of another checkout for the same comparison.
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=process.argv[2]?pathToFileURL(resolve(process.argv[2])+'/'):new URL('../src/',import.meta.url);
const [{createBoat},{createFleet,addFleetBoat,fleetStep},{sampleWakeField}]=await Promise.all(['physics.js','fleet.js','wake.js'].map(name=>import(new URL(name,root))));
const env={traffic:true,windSpeed:3,currentSpeed:.1,currentDirection:90,waveHeight:.1,waveDirection:90};
const fleet=createFleet(createBoat('lake'));fleet.boats[0].throttle=.7;addFleetBoat(fleet,'banana',{x:64,y:110,a:0});
for(let i=0;i<1200;i++)fleetStep(fleet,env,1/120);
let start=performance.now();for(let i=0;i<600;i++)fleetStep(fleet,env,1/120);const fleetMS=(performance.now()-start)/600;
const history=Array.from({length:180},(_,i)=>({x:80+i*1.6,y:110+Math.sin(i*.06)*4,boatX:80+i*1.6,boatY:110,nx:0,ny:1,time:i*.2,currentX:.1,currentY:0,spread:3,width:1,amplitude:.15}));
const faces=[{a:{x:60,y:0},b:{x:400,y:0},nx:0,ny:1,coefficient:.5}],points=Array.from({length:80},(_,i)=>({x:70+(i%20)*15,y:85+Math.floor(i/20)*20}));
let checksum=0;start=performance.now();for(let j=0;j<100;j++)for(const p of points)checksum+=sampleWakeField(history,p.x,p.y,36,faces).eta;
console.log(JSON.stringify({fleetMS,fieldMS:performance.now()-start,queries:8000,checksum},null,2));
