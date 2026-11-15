import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const pages=new Map([
 ['/BoatSimulator/',new URL('../dist/index.html',import.meta.url)],
 ['/BoatSimulator/index.html',new URL('../dist/index.html',import.meta.url)],
 ['/BoatSimulator/webgl/',new URL('../dist/webgl/index.html',import.meta.url)],
 ['/BoatSimulator/webgl/index.html',new URL('../dist/webgl/index.html',import.meta.url)]
]);
createServer(async(req,res)=>{
 const file=pages.get(new URL(req.url,'http://127.0.0.1').pathname);
 if(!file){res.writeHead(404);res.end('Not found');return;}
 try{const html=await readFile(file);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);}catch{res.writeHead(500);res.end('Build both apps first');}
}).listen(4176,'127.0.0.1');
