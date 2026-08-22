const { fetchWithPuppeteer, closeBrowser } = require('../utils/puppeteerBypass.js');

async function test() {
    try {
        const res = await fetchWithPuppeteer('https://tv9.egydead.live/?s=Deadpool');
        const fs = require('fs');
        fs.writeFileSync('scratch/bypass_html.html', res.data);
        console.log("Saved html");
    } catch(e) {
        console.error("FAIL:", e.message);
    }
    closeBrowser();
    process.exit(0);
}
test();
