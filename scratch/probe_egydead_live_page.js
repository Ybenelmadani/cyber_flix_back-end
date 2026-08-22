const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function run() {
  const url = "https://tv9.egydead.live/episode/house-of-the-dragon-s02e01/";
  console.log(`Fetching: ${url}`);
  try {
    const { data: html } = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    fs.writeFileSync('scratch_egydead_live.html', html);
    console.log("Successfully wrote scratch_egydead_live.html");
    
    const $ = cheerio.load(html);
    console.log("Page Title:", $('title').text().trim());
    
    // Dump iframe sources
    console.log("\n=== Iframes ===");
    $('iframe').each((i, el) => {
      console.log(`Iframe #${i+1}: src="${$(el).attr('src')}"`);
    });
    
    // Dump download links or streaming buttons
    console.log("\n=== Links (A tags) ===");
    $('a').each((i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      const href = $(el).attr('href');
      if (href && (href.includes('watch') || href.includes('download') || href.includes('server') || href.includes('vibuxer') || href.includes('egybestvid') || href.includes('dood') || href.includes('mixdrop') || href.includes('voe') || href.includes('1fichier') || href.includes('mega') || text.length > 0)) {
        // filter out internal wordpress links unless relevant
        if (href.startsWith('http') && !href.includes('wp-content') && !href.includes('wp-json')) {
          console.log(`Link: "${text}" -> href="${href}"`);
        }
      }
    });
    
    // Dump script sources/snippets
    console.log("\n=== Script tags ===");
    $('script').each((i, el) => {
      const src = $(el).attr('src');
      const text = $(el).html();
      if (src) {
        if (!src.includes('wp-includes') && !src.includes('wp-content')) {
          console.log(`External script: ${src}`);
        }
      } else {
        if (text.includes('bootstrapData') || text.includes('vibuxer') || text.includes('iframe') || text.includes('player')) {
          console.log(`Inline script #${i} snippet:`, text.trim().substring(0, 200) + "...");
        }
      }
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
