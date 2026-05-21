import { chromium } from 'playwright';
import path from 'path';

const OUT = 'C:/Users/Usuario-PC/AppData/Local/Temp/az-compare';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet',  width: 768,  height: 900 },
  { name: 'mobile',  width: 375,  height: 900 },
];

const SITES = [
  { name: 'real', url: 'https://azaleasports.com.uy' },
  { name: 'ours', url: 'http://localhost:5174' },
];

const browser = await chromium.launch();

for (const site of SITES) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Header screenshot
    const header = await page.$('header');
    if (header) {
      await header.screenshot({ path: `${OUT}/${site.name}_${vp.name}_header.png` });
    } else {
      await page.screenshot({ path: `${OUT}/${site.name}_${vp.name}_header.png`, clip: { x: 0, y: 0, width: vp.width, height: 120 } });
    }

    // Footer screenshot
    const footer = await page.$('footer');
    if (footer) {
      await footer.screenshot({ path: `${OUT}/${site.name}_${vp.name}_footer.png` });
    } else {
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.screenshot({ path: `${OUT}/${site.name}_${vp.name}_footer.png`, clip: { x: 0, y: Math.max(0, pageHeight - 500), width: vp.width, height: 500 } });
    }

    await page.close();
    console.log(`✓ ${site.name} ${vp.name}`);
  }
}

await browser.close();
console.log('Done. Screenshots saved to', OUT);
