import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('production SUV controls start, switch PRND and show the immersion profile without separate assets',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./?v=15.0.0');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await expect(page.locator('.tow-attitude')).toBeVisible();await page.locator('#car-key-right').click();await page.locator('#car-key-right').click();await expect(page.locator('#car-key-state')).toHaveText('Pracuje');await page.locator('[data-car-gear=R]').click();await expect(page.locator('[data-car-gear=R]')).toHaveAttribute('aria-pressed','true');await page.keyboard.press('e');await expect(page.locator('[data-car-gear=N]')).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Space');await expect(page.locator('#car-handbrake')).toHaveAttribute('aria-pressed','true');await page.locator('#car-awd').click();await expect(page.locator('#car-awd')).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});
test('production boots under Pages path without any separate JS or CSS requests',async({page})=>{
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.route('**/assets/**',r=>r.abort());await page.goto('./?v=15.0.0');await expect(page.locator('#lake')).toBeVisible();await page.locator('#begin-session').click();
 await page.keyboard.press('ArrowUp');await expect(page.locator('#gear')).toContainText('PEŁZAJĄCY');await page.keyboard.press('Space');await expect(page.locator('#gear')).toContainText('LUZ');
 expect(requests.filter(u=>/\.js(?:\?|$)|\.css(?:\?|$)/.test(u))).toEqual([]);expect(errors).toEqual([]);
});
test('production also boots with Android Chrome user agent and touch viewport',async({browser,baseURL})=>{
 const context=await browser.newContext({viewport:{width:800,height:1100},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'});
 try{const page=await context.newPage();await page.goto(baseURL+'?v=15.0.0');await expect(page.locator('#lake')).toBeVisible();await page.locator('#begin-session').click();await page.locator('#help').tap();await expect(page.locator('#info')).toBeVisible();}finally{await context.close();}
});
test('JavaScript disabled shows an explanation instead of a blank white page',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false});try{const page=await context.newPage();await page.goto(baseURL);await expect(page.locator('#startup-detail')).toContainText('JavaScript jest włączony');await expect(page.locator('#startup-retry')).toBeVisible();}finally{await context.close();}
});
test('startup exception is visible and retry gets a fresh HTML URL',async({page})=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 await page.route('**/BoatSimulator/**',route=>route.fulfill({contentType:'text/html',body:html.replace(/<script id="simulator-bundle">[\s\S]*?<\/script>/,'<script>throw new Error("Próba diagnostyki startu")</script>')}));
 await page.goto('./');await expect(page.locator('#startup-title')).toHaveText('Nie udało się uruchomić symulatora');await expect(page.locator('#startup-detail')).toContainText('Próba diagnostyki startu');await expect(page.locator('#startup-retry')).toBeVisible();await expect(page.locator('#startup-retry')).toHaveAttribute('href',/reload=\d+/);
});
