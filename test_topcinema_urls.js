const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://web.topcinemaa.com/?s=' + encodeURIComponent('House of the Dragon s01e01')).then(res => {
  const $ = cheerio.load(res.data);
  let matches = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if(href && href.includes('web.topcinemaa.com') && href.includes('house-of-the-dragon')) {
      matches.push(href);
    }
  });
  console.log([...new Set(matches)]);
}).catch(e => console.log(e.message));
