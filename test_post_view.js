const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');
const fs = require('fs');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function testPost() {
  const url = 'https://egydead.ca/titles/596';
  try {
    console.log(`Sending POST to: ${url} with View=1 ...`);
    const res = await axios.post(url, qs.stringify({ View: "1" }), {
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    
    console.log(`SUCCESS: Status ${res.status}, Length: ${res.data.length}`);
    fs.writeFileSync('post_view_success.html', res.data);
    console.log("Saved response to post_view_success.html");
    
    const $ = cheerio.load(res.data);
    
    // Look for data-link or server tabs
    console.log("\n--- Checking elements with data-link ---");
    let linksCount = 0;
    $('[data-link]').each((i, el) => {
      linksCount++;
      console.log(`El #${linksCount}: tag="${el.tagName}" text="${$(el).text().trim()}" data-link="${$(el).attr('data-link')}"`);
    });
    
    // Look for all <a> tags that might be download or watch links
    console.log("\n--- Checking first 20 <a> tags ---");
    let aCount = 0;
    $('a').each((i, el) => {
      aCount++;
      if (aCount <= 20) {
        console.log(`A #${aCount}: text="${$(el).text().trim()}" href="${$(el).attr('href')}"`);
      }
    });
    
    // Look for all <li> tags
    console.log("\n--- Checking first 20 <li> tags ---");
    let liCount = 0;
    $('li').each((i, el) => {
      liCount++;
      if (liCount <= 20) {
        console.log(`LI #${liCount}: text="${$(el).text().trim()}" data-link="${$(el).attr('data-link') || 'none'}"`);
      }
    });
    
  } catch (err) {
    console.error("Error:", err.message);
    if (err.response) {
      console.log("Error status:", err.response.status);
    }
  }
}

testPost();
