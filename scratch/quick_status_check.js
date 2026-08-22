const axios = require('axios');
const cheerio = require('cheerio');

async function quickTest() {
  // Verify tv9 still works today
  try {
    const r = await axios.post('https://tv9.egydead.live/episode/house-of-the-dragon-s01e01-01/', 'View=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://tv9.egydead.live/',
        'Origin': 'https://tv9.egydead.live',
      },
      timeout: 12000
    });
    const $ = cheerio.load(r.data);
    const servers = [];
    $('.serversList li[data-link]').each((i, el) => {
      servers.push({ name: $(el).text().trim(), link: $(el).attr('data-link') });
    });
    console.log('tv9 status:', r.status, '| servers:', servers.length);
    servers.forEach(s => console.log(' -', s.name, '=>', s.link ? s.link.slice(0, 70) : 'null'));
  } catch(e) {
    console.log('tv9 ERROR:', e.response ? e.response.status : e.code, e.message ? e.message.slice(0, 80) : '');
  }

  // Also verify TopCinema still works
  try {
    const r = await axios.get('https://web.topcinemaa.com/?s=house+dragon', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 8000
    });
    console.log('TopCinema status:', r.status);
  } catch(e) {
    console.log('TopCinema ERROR:', e.response ? e.response.status : e.code);
  }
  
  // Test movie on tv9
  try {
    const r = await axios.get('https://tv9.egydead.live/?s=deadpool', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });
    const $ = cheerio.load(r.data);
    const items = [];
    $('li.movieItem a').each((i, el) => {
      const href = $(el).attr('href');
      const title = $(el).attr('title') || '';
      if (href) items.push({ href: href.slice(0, 80), title: title.slice(0, 50) });
    });
    console.log('\nMovie search (deadpool) results:', items.length);
    items.slice(0, 5).forEach(it => console.log(' -', it.href, '|', it.title));
  } catch(e) {
    console.log('Movie search ERROR:', e.message ? e.message.slice(0, 60) : '');
  }
}

quickTest();
