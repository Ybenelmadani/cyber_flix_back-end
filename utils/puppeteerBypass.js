const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

let browserInstance = null;

async function getBrowser() {
  if (browserInstance) {
    // Check if the browser is still connected
    try {
      await browserInstance.version();
      return browserInstance;
    } catch (e) {
      browserInstance = null; // Browser was disconnected/closed
    }
  }

  console.log('Launching new Puppeteer browser instance...');
  browserInstance = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
    ],
  });
  return browserInstance;
}

/**
 * Fetches HTML from a URL using Puppeteer to bypass Cloudflare.
 * Supports GET and POST.
 */
async function fetchWithPuppeteer(url, method = 'GET', postData = null) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  // Set headers to act more human
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  });
  
  // We want to intercept requests if it's a POST to send the postData
  if (method === 'POST') {
    await page.setRequestInterception(true);
    page.once('request', interceptedRequest => {
      if (interceptedRequest.url() === url) {
        interceptedRequest.continue({
          method: 'POST',
          postData: postData,
          headers: {
            ...interceptedRequest.headers(),
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://tv10.egydead.live',
            'Referer': url
          }
        });
      } else {
        interceptedRequest.continue();
      }
    });
  }

  try {
    console.log(`Puppeteer: Navigating to ${url} (Method: ${method})`);
    
    // Wait until network is idle so Cloudflare challenge has time to resolve
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check if it's still stuck on Cloudflare challenge (sometimes it takes a bit more time)
    let pageTitle = await page.title();
    if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare') || pageTitle.includes('لحظة')) {
      console.log('Cloudflare challenge detected! Waiting for resolution...');
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      } catch (err) {
        console.log('Timeout waiting for Cloudflare resolution, proceeding anyway...');
      }
    }

    const html = await page.content();
    return { data: html, status: response ? response.status() : 200 };
  } catch (error) {
    console.error(`Puppeteer Error fetching ${url}:`, error.message);
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * Gracefully close the browser when the app terminates
 */
function closeBrowser() {
  if (browserInstance) {
    console.log('Closing Puppeteer browser instance...');
    browserInstance.close();
    browserInstance = null;
  }
}

// Clean up on exit
process.on('exit', closeBrowser);
process.on('SIGINT', () => { closeBrowser(); process.exit(); });
process.on('SIGTERM', () => { closeBrowser(); process.exit(); });

module.exports = {
  fetchWithPuppeteer,
  closeBrowser
};
