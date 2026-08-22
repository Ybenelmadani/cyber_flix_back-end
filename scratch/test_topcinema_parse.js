const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const url = 'https://topcinemaa.top/?s=House+of+the+Dragon';
  console.log('Fetching', url);
  try {
    const r = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(r.data);
    console.log('Found:', $('.BlockItem').length, 'items');
    $('.BlockItem').each((i, el) => {
      console.log($(el).find('.Title').text().trim(), $(el).find('a').attr('href'));
    });
  } catch (e) {
    console.error(e.message);
  }
}
run();
