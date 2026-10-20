import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('production boots under Pages path without any separate JS or CSS requests',async({page})=>{
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.route('**/assets/**',r=>r.abort());await page.goto('./?v=4.0.1');await expect(page.locator('#lake')).toBeVisible();
 await page.keyboard.press('ArrowUp');await expect(page.locator('#gear')).toContainText('PEŁZAJĄCY');await page.keyboard.press('Space');await expect(page.locator('#gear')).toContainText('LUZ');
 expect(requests.filter(u=>/\.js(?:\?|$)|\.css(?:\?|$)/.test(u))).toEqual([]);expect(errors).toEqual([]);
});
test('production also boots with Android Chrome user agent and touch viewport',async({browser})=>{
 const context=await browser.newContext({viewport:{width:800,height:1100},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'});
 try{const page=await context.newPage();await page.goto('http://127.0.0.1:4174/BoatSimulator/?v=4.0.1');await expect(page.locator('#lake')).toBeVisible();await page.locator('#help').tap();await expect(page.locator('#info')).toBeVisible();}finally{await context.close();}
});
test('JavaScript disabled shows an explanation instead of a blank white page',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});try{const page=await context.newPage();await page.goto('http://127.0.0.1:4174/BoatSimulator/');await expect(page.locator('#startup-detail')).toContainText('JavaScript jest włączony');await expect(page.locator('#startup-retry')).toBeVisible();}finally{await context.close();}
});
test('startup exception is visible and retry gets a fresh HTML URL',async({page})=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 await page.route('**/BoatSimulator/**',route=>route.fulfill({contentType:'text/html',body:html.replace(/<script id="simulator-bundle">[\s\S]*?<\/script>/,'<script>throw new Error("Próba diagnostyki startu")</script>')}));
 await page.goto('./');await expect(page.locator('#startup-title')).toHaveText('Nie udało się uruchomić symulatora');await expect(page.locator('#startup-detail')).toContainText('Próba diagnostyki startu');await expect(page.locator('#startup-retry')).toBeVisible();await expect(page.locator('#startup-retry')).toHaveAttribute('href',/reload=\d+/);
});
