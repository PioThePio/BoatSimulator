export async function openTowTools(page){if(await page.locator('#tow-tools').isHidden())await page.locator('#tow-tools-open').click();}
