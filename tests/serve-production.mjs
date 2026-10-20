import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
// Deliberately serve no assets directory: the published application must be standalone.
createServer(async(req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 if(path!=='/BoatSimulator/'&&path!=='/BoatSimulator/index.html'){res.writeHead(404);res.end('Not found');return;}
 try{const html=await readFile(new URL('../dist/index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);}catch{res.writeHead(500);res.end('Build the app first');}
}).listen(4174,'127.0.0.1');
