const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://egydead.ca/search/Deadpool', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => {
  const $ = cheerio.load(r.data);
  const scripts = $('script').map((i, el) => $(el).html()).get();
  const nuxtScript = scripts.find(s => s && s.includes('Deadpool'));
  console.log(nuxtScript ? nuxtScript.substring(0, 1000) : 'Not found');
}).catch(console.error);
