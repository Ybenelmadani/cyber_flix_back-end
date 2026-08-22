const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('scratch/ca_movie.html', 'utf8');
const $ = cheerio.load(html);
const servers = [];
$('*').each((i, el) => {
    const text = $(el).text().toLowerCase() || '';
    const href = $(el).attr('href') || '';
    if (text.includes('mixdrop') || text.includes('ruby') || text.includes('streamhg') || href.includes('mixdrop') || href.includes('ruby')) {
        servers.push({ tag: el.tagName, text: text.trim().substring(0, 50), href, class: $(el).attr('class') });
    }
});
console.log(JSON.stringify(servers, null, 2));
