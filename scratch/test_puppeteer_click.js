const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto('https://tv10.egydead.live/?s=House+of+the+Dragon', { waitUntil: 'networkidle2' });
    console.log('Waiting 5s for challenge...');
    await new Promise(r => setTimeout(r, 5000));
    
    // Check if there are iframes
    const frames = page.frames();
    console.log('Frames:', frames.length);
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('cloudflare')) {
        console.log('Found Cloudflare iframe:', url);
      }
    }
    
    // Try to click checkbox if it exists
    await page.mouse.click(100, 100); // Random click
    
    await new Promise(r => setTimeout(r, 10000));
    
    const html = await page.content();
    console.log(html.substring(0, 300));
    console.log('Includes Cloudflare?', html.includes('Cloudflare') || html.includes('Just a moment'));
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}
run();
