import {test,expect} from '@playwright/test';

test('FPS meter reports frame rate and longest frame while playing',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#fps-meter')).toHaveText('FPS —');
 await page.locator('#begin-session').click();
 await expect(page.locator('#fps-meter')).toHaveText(/^FPS \d+ · \d+ ms$/,{timeout:5000});
 await page.setViewportSize({width:390,height:844});
 const box=await page.locator('#fps-meter').boundingBox();
 expect(box.x).toBeGreaterThanOrEqual(0);
 expect(box.x+box.width).toBeLessThanOrEqual(390);
});
