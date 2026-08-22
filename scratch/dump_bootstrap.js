const fs = require('fs');
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
    fs.writeFileSync('scratch/bootstrap.json', match[1]);
    console.log('Wrote to scratch/bootstrap.json');
  }
}).catch(console.error);
