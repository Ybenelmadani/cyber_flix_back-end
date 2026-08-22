const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
      console.log('API Request:', req.method(), req.url());
    }
    req.continue();
  });

  page.on('response', async res => {
    if (res.request().resourceType() === 'xhr' || res.request().resourceType() === 'fetch') {
      try {
        const text = await res.text();
        if (text.length < 500) {
          console.log('Response:', text);
        } else {
          console.log('Response length:', text.length);
        }
      } catch (e) {}
    }
  });

  await page.goto('https://egydead.ca/search/Deadpool', { waitUntil: 'networkidle2' });
  await browser.close();
})();
