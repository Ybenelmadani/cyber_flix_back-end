const { fetchWithPuppeteer, closeBrowser } = require('../utils/puppeteerBypass');

async function run() {
  try {
    const { data } = await fetchWithPuppeteer('https://tv10.egydead.live/?s=House+of+the+Dragon');
    console.log(data.substring(0, 500));
    console.log('Includes Cloudflare?', data.includes('Cloudflare') || data.includes('Just a moment'));
  } catch (e) {
    console.error(e);
  } finally {
    closeBrowser();
  }
}
run();
