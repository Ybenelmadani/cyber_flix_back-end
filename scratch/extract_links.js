const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('scratch/ca_search.html', 'utf-8');
const $ = cheerio.load(html);
const links = [];
$('a[href]').each((i, el) => {
    links.push($(el).attr('href'));
});
fs.writeFileSync('scratch/ca_search_links.txt', links.join('\n'));
console.log('Extracted ' + links.length + ' links');
