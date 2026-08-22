const axios = require('axios');
const cheerio = require('cheerio');

async function testAkwam() {
  const { data } = await axios.get('https://akwam.to/search?q=spider-man');
  const $ = cheerio.load(data);
  const results = [];
  $('.entry-box').each((i, el) => {
    const href = $(el).find('.entry-title a').attr('href');
    const title = $(el).find('.entry-title a').text().trim();
    if (href) results.push({ href, title });
  });
  console.log(results);
}
testAkwam().catch(console.error);
