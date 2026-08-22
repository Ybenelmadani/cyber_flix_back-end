const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function testLinks() {
  try {
    const searchUrl = 'https://egydead.ca/search/Deadpool/';
    console.log(`Fetching search page: ${searchUrl}`);
    const res = await axios.get(searchUrl, {
      headers: { 
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      }
    });
    
    console.log("Status Code:", res.status);
    console.log("Data length:", res.data.length);
    
    const fs = require('fs');
    fs.writeFileSync('deadpool_search.html', res.data);
    console.log("Saved html to deadpool_search.html");
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testLinks();
