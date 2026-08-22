const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://html.duckduckgo.com/html/?q=site:web.topcinemaa.com+"House+of+the+Dragon"').then(res => {
  const $ = cheerio.load(res.data);
  $('.result__url').each((i, el) => console.log($(el).text().trim()));
}).catch(e => console.log(e.message));
