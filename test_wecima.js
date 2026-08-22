const axios = require('axios');
const cheerio = require('cheerio');

async function testWecima() {
  const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36" };
  const { data } = await axios.get('https://wecima.show/search/spider-man', { headers });
  const $ = cheerio.load(data);
  const results = [];
  $('.GridItem a').each((i, el) => {
    const href = $(el).attr('href');
    const title = $(el).attr('title') || $(el).text().trim();
    if (href) results.push({ href, title });
  });
  console.log(results);
}
testWecima().catch(console.error);
