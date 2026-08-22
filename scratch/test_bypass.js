const { fetchWithPuppeteer } = require('../utils/puppeteerBypass.js');

async function test() {
    try {
        console.log("Fetching tv9.egydead.live...");
        const res = await fetchWithPuppeteer('https://tv9.egydead.live/?s=Deadpool');
        console.log("Status:", res.status);
        console.log("Length:", res.data.length);
        if (res.data.includes('Deadpool')) {
            console.log("SUCCESS: Found Deadpool in HTML!");
        }
    } catch(e) {
        console.error("FAIL:", e.message);
    }
    process.exit(0);
}
test();
