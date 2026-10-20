import {readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,relative} from 'node:path';

const root=resolve('dist');
let html=await readFile(resolve(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
if(scripts.length!==1)throw new Error('Expected one application entry bundle');
async function readAsset(url){
 const path=resolve(root,url.replace(/^\.\//,''));
 if(relative(root,path).startsWith('..'))throw new Error('Asset outside dist');
 return readFile(path,'utf8');
}
const js=await readAsset(scripts[0][1]);
if(/\bimport\s*(?:\(|["'{*])|\bexport\s/.test(js))throw new Error('The standalone build still has module dependencies');
html=html.replace(scripts[0][0],'');
// A classic script must run after #app exists; module scripts had implicit defer.
html=html.replace('</body>',()=>'<script id="simulator-bundle">\n'+js.replace(/<\/script/gi,'<\\/script')+'\n</script>\n</body>');
for(const match of [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g)]){
 const css=await readAsset(match[1]);
 html=html.replace(match[0],()=>'<style id="simulator-style">\n'+css.replace(/<\/style/gi,'<\\/style')+'\n</style>');
}
if(/(?:src|href)="\.?\/?assets\//.test(html))throw new Error('External assets remain in standalone HTML');
await writeFile(resolve(root,'index.html'),html);
await rm(resolve(root,'assets'),{recursive:true,force:true});
console.log(`Standalone index.html: ${(Buffer.byteLength(html)/1024).toFixed(1)} KiB, no external JS or CSS`);
