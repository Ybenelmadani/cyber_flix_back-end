const axios = require('axios');
const fs = require('fs');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function fetchFullPage() {
  try {
    const url = 'https://egydead.ca/titles/596/hd-mtrgm-deadpool-2016-fylm';
    console.log(`Fetching: ${url}`);
    
    const res = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    fs.writeFileSync('full_movie_page.html', res.data);
    console.log(`Saved to full_movie_page.html, size: ${res.data.length}`);
    
    // Check if 'videos' or 'servers' exist
    if (res.data.includes('"servers"')) console.log("Found 'servers' in HTML!");
    if (res.data.includes('"videos"')) console.log("Found 'videos' in HTML!");
    if (res.data.includes('<iframe')) console.log("Found iframe in HTML!");
    
  } catch (err) {
    console.error("Error fetching full page:", err.message);
  }
}

fetchFullPage();
