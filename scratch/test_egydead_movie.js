const { fetchWithPuppeteer, closeBrowser } = require('../utils/puppeteerBypass.js');
const cheerio = require('cheerio');
const fs = require('fs');

async function test() {
    try {
        console.log("Fetching movie page...");
        const res = await fetchWithPuppeteer('https://egydead.ca/titles/596/hd-mtrjm-deadpool-2016-fylm');
        fs.writeFileSync('scratch/ca_movie.html', res.data);
        const $ = cheerio.load(res.data);
        const servers = [];
        $('[class*="server"], [id*="server"], a, iframe').each((i, el) => {
           // We just dump it to file, we'll manually inspect it
        });
        console.log("Saved ca_movie.html");
    } catch(e) {
        console.error("FAIL:", e.message);
    }
    closeBrowser();
    process.exit(0);
}
test();
