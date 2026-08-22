const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      console.log('API Request:', req.method(), req.url());
    }
    req.continue();
  });

  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      try {
        const text = await res.text();
        console.log('API Response:', res.url(), text.substring(0, 500));
      } catch (e) {}
    }
  });

  await page.goto('https://egydead.ca/', { waitUntil: 'networkidle2' });
  
  // Click on the search button and search for "Deadpool"
  await page.type('input[placeholder="Search..."]', 'Deadpool');
  await page.keyboard.press('Enter');
  
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
