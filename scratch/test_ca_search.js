const axios = require('axios');
const cheerio = require('cheerio');

async function testCaSearch() {
  const url = "https://egydead.ca/?s=House%20of%20the%20Dragon";
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
      }
    });
    console.log("Search status:", res.status);
    const $ = cheerio.load(res.data);
    const links = [];
    $('.moviesBlocks a').each((i, el) => {
      links.push($(el).attr('href'));
    });
    console.log("Found links:", links);
  } catch(e) {
    console.error("Error:", e.message);
  }
}

testCaSearch();
