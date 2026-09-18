const axios = require('axios');
const cheerio = require('cheerio');

async function testWecima() {
  const r = await axios.get('https://wecima.show/search/Good+Will+Hunting', {headers: {'User-Agent': 'Mozilla/5.0'}});
  const $ = cheerio.load(r.data);
  const links = [];
  $('.GridItem a').each((i, el) => {
    links.push($(el).attr('href'));
  });
  console.log('WeCima Links:', links);
}
testWecima().catch(console.error);
