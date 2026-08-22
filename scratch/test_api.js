const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://egydead.ca/search/Deadpool', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => {
  const $ = cheerio.load(r.data);
  const scripts = $('script').map((i, el) => $(el).html()).get();
  const nuxtScript = scripts.find(s => s && s.includes('window.bootstrapData'));
  const match = nuxtScript.match(/window\.bootstrapData = (.*);/);
  if (match) {
    const data = JSON.parse(match[1]);
    const state = data.state;
    console.log(Object.keys(state));
    console.log(state.search ? state.search.results : 'No search results in state');
  }
}).catch(console.error);
