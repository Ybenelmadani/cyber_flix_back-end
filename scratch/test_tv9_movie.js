const axios = require('axios');
const cheerio = require('cheerio');

async function testMovie() {
  const BASE = 'https://tv9.egydead.live';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
  };

  // 1. Find movie URL from search
  const searchResp = await axios.get(`${BASE}/?s=deadpool+wolverine`, { headers, timeout: 10000 });
  const $s = cheerio.load(searchResp.data);
  const items = [];
  $s('li.movieItem a').each((i, el) => {
    const href = $s(el).attr('href');
    const title = $s(el).attr('title') || '';
    if (href) items.push({ href, title });
  });
  console.log('Movie search results:', items.length);
  items.forEach(it => console.log(' -', it.href, '|', it.title.slice(0, 50)));

  // 2. POST View=1 to the first movie result
  if (items.length > 0) {
    const movieUrl = items.find(it => !it.href.includes('/assembly/'))?.href || items[0].href;
    console.log('\nTesting POST View=1 on:', movieUrl);
    try {
      const r = await axios.post(movieUrl, 'View=1', {
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': BASE,
          'Referer': movieUrl,
        },
        timeout: 15000,
        maxRedirects: 5,
      });
      const $ = cheerio.load(r.data);
      const servers = [];
      $('.serversList li[data-link]').each((i, el) => {
        servers.push({ name: $(el).text().trim(), link: $(el).attr('data-link') });
      });
      console.log('Movie servers:', servers.length);
      servers.forEach(s => console.log(' -', s.name, '=>', s.link ? s.link.slice(0, 70) : 'null'));
    } catch(e) {
      console.log('Movie POST error:', e.response ? e.response.status : e.code, e.message ? e.message.slice(0, 80) : '');
    }
  }
}

testMovie().catch(e => console.error('ERROR:', e.message));
