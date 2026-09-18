const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://web.topcinemaa.live/?s=Good+Will+Hunting', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => {
  const $ = cheerio.load(r.data);
  const titles = [];
  $('.BlockItem').each((i, el) => titles.push($(el).find('.Title').text().trim()));
  console.log('TopCinema:', titles);
}).catch(console.error);

axios.get('https://tv10.egydead.live/?s=Good+Will+Hunting', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => {
  console.log('EgyDead old:', r.status);
}).catch(e => {
  console.log('EgyDead old Error:', e.response ? e.response.status : e.message);
});
