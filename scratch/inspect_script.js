const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('scratch_watch_house.html', 'utf8');
const $ = cheerio.load(html);

$('script').each((i, el) => {
  const text = $(el).html();
  if (text.includes('customDownloadButton') || text.includes('AD_LINK')) {
    console.log(`--- Script #${i} content ---`);
    console.log(text);
  }
});
