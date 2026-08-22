const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const BASE = 'https://tv9.egydead.live';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
    'Referer': BASE + '/',
  };

  // 1. Test homepage
  try {
    const r = await axios.get(BASE, { timeout: 10000, headers });
    console.log('Homepage status:', r.status);
    const $ = cheerio.load(r.data);
    console.log('Title:', $('title').text().trim());
    // Find search form
    const searchForm = $('form[action*="search"], form[role="search"], input[name="s"], input[name="q"]');
    console.log('Search form found:', searchForm.length > 0);
    searchForm.each((i, el) => {
      console.log('  Search el:', el.name, $(el).attr('name'), $(el).attr('action'));
    });
    // Look for any search links
    const searchLinks = $('a[href*="search"]');
    console.log('Search links found:', searchLinks.length);
    searchLinks.slice(0, 3).each((i, el) => {
      console.log('  Link:', $(el).attr('href'));
    });
    // Find any navigation that hints at content structure
    const navLinks = $('a[href]').toArray().slice(0, 20);
    console.log('First nav links:');
    navLinks.forEach(el => console.log(' ', $(el).attr('href')));
  } catch(e) {
    console.log('Homepage ERROR:', e.message?.slice(0, 100));
  }

  // 2. Try search
  console.log('\n--- Search test ---');
  for (const searchUrl of [
    `${BASE}/?s=house+of+the+dragon`,
    `${BASE}/search/house-of-the-dragon`,
    `${BASE}/?q=house+of+the+dragon`,
  ]) {
    try {
      const r = await axios.get(searchUrl, { timeout: 10000, headers });
      const $ = cheerio.load(r.data);
      const links = $('a[href]').toArray().filter(el => $(el).attr('href').includes('egydead')).slice(0, 5);
      console.log(searchUrl, '=> status:', r.status, '| result links:', links.length);
      links.forEach(el => console.log('   ', $(el).attr('href'), '-', $(el).text().trim().slice(0, 50)));
    } catch(e) {
      console.log(searchUrl, '=> ERROR:', e.response?.status, e.code);
    }
  }
}

test();
