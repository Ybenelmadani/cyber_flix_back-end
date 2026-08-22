const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function testSearch() {
  try {
    const searchUrl = `https://egydead.co/search/Loki/`;
    console.log(`Searching: ${searchUrl}`);
    
    let res = await axios.get(searchUrl, {
      headers: { 
        "User-Agent": USER_AGENT,
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    let $ = cheerio.load(res.data);
    const enterLink = $('a').first().attr('href');
    
    if (enterLink && enterLink.includes('tr_uuid')) {
      console.log(`Following transition link: ${enterLink}`);
      
      const res2 = await axios.get(enterLink, {
        headers: {
          "User-Agent": USER_AGENT,
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': searchUrl
        }
      });
      
      $ = cheerio.load(res2.data);
      console.log("New page title:", $('title').text());
      console.log("New page body length:", res2.data.length);
      
      console.log("Printing first 40 links on target page:");
      let count = 0;
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && count < 40) {
          console.log(`Link #${count}: ${href} | Text: ${text}`);
          count++;
        }
      });
    } else {
      console.log("No transition page detected.");
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testSearch();
