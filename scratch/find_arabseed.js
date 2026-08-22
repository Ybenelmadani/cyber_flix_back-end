const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('scratch/arabseed.html', 'utf8');
const $ = cheerio.load(html);
$('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.toLowerCase().includes('deadpool') || $(el).text().toLowerCase().includes('deadpool')) {
        console.log($(el).attr('class') || 'NoClass', href);
    }
});
