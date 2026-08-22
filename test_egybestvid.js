const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function testEmbed() {
  const url = 'https://egybestvid.com/embed-hi42abfian0h.html';
  try {
    console.log(`Fetching embed URL: ${url} ...`);
    const res = await axios.get(url, {
      headers: { 
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Referer": "https://egydead.ca/"
      }
    });
    
    console.log(`SUCCESS: Status ${res.status}, Length: ${res.data.length}`);
    fs.writeFileSync('egybestvid.html', res.data);
    console.log("Saved response to egybestvid.html");
    
    const $ = cheerio.load(res.data);
    console.log("Title tag:", $('title').text().trim());
    
    // Check for iframes or script sources or direct links
    console.log("\n--- Checking <a> tags ---");
    $('a').each((i, el) => {
      console.log(`Link #${i}: text="${$(el).text().trim()}" href="${$(el).attr('href')}"`);
    });
    
    console.log("\n--- Checking script tags (first 500 chars of each) ---");
    $('script').each((i, el) => {
      const src = $(el).attr('src');
      const html = $(el).html().trim();
      console.log(`Script #${i}: src="${src || 'none'}"`);
      if (html) {
        console.log(`  Code: ${html.substring(0, 300)}...`);
      }
    });
    
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testEmbed();
