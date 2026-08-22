const axios = require('axios');
const cheerio = require('cheerio');

const domains = [
  'https://egydead.live',
  'https://egydead.vip',
  'https://egydead.ws',
  'https://egydead.cool',
  'https://egydead.ca',
  'https://egydead.co',
  'https://egydead.to',
  'https://egydead.pro',
  'https://egydead.cool',
  'https://tv.egydead.live',
  'https://tv.egydead.vip',
  'https://tv.egydead.ws',
  'https://tv.egydead.cool',
  'https://tv.egydead.co',
  'https://tv8.egydead.live',
  'https://tv9.egydead.live',
  'https://tv10.egydead.live',
  'https://tv11.egydead.live',
  'https://tv12.egydead.live',
  'https://tv13.egydead.live',
  'https://tv14.egydead.live',
  'https://tv15.egydead.live'
];

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function test() {
  for (const domain of domains) {
    try {
      console.log(`Testing: ${domain} ...`);
      const res = await axios.get(`${domain}/`, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
        },
        timeout: 4000
      });
      
      const $ = cheerio.load(res.data);
      const title = $('title').text().toLowerCase();
      const body = res.data;
      
      if (title.includes('egydead') || body.includes('egydead') || body.includes('ايجي ديد') || body.includes('ايجي ديت')) {
        if (!body.includes('godaddy') && !body.includes('buy this domain') && !body.includes('domain for sale')) {
          console.log(`\n🎉 SUCCESS: Found active EgyDead domain!`);
          console.log(`URL: ${domain}`);
          console.log(`Title: ${$('title').text()}`);
          console.log(`Length: ${body.length}\n`);
          return;
        } else {
          console.log(`Parked page: ${domain}`);
        }
      } else {
        console.log(`Status 200 but not EgyDead: ${domain}`);
      }
    } catch (err) {
      console.log(`FAILED: ${domain} -> ${err.message}`);
    }
  }
  console.log("Finished all tests. No active domains found.");
}

test();
