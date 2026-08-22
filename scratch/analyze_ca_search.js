const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('scratch/ca_search.html', 'utf-8');
const $ = cheerio.load(html);
$('a[href]').each((i, el) => {
    console.log($(el).attr('href'));
});
$('script').each((i, el) => {
    const src = $(el).attr('src');
    if (src) console.log('Script Src:', src);
    else {
        const text = $(el).html().substring(0, 100).replace(/\s+/g, ' ');
        console.log('Script content:', text);
    }
});
