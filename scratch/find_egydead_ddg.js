const axios = require('axios');
const cheerio = require('cheerio');

async function findActiveEgydead() {
  try {
    const res = await axios.get('https://html.duckduckgo.com/html/?q=site:egydead.live', {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
      }
    });
    const $ = cheerio.load(res.data);
    const urls = new Set();
    $('.result__url').each((i, el) => {
      const text = $(el).text().trim();
      const match = text.match(/tv\d+\.egydead\.live/i);
      if (match) {
        urls.add(match[0].toLowerCase());
      }
    });
    console.log("Found domains on DDG:", Array.from(urls));
  } catch(e) {
    console.log("DDG Error:", e.message);
  }
}

findActiveEgydead();
