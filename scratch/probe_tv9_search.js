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

  // 1. Search page - look at ALL links
  console.log('=== SEARCH RESULTS ===');
  try {
    const r = await axios.get(`${BASE}/?s=house+dragon`, { timeout: 10000, headers });
    const $ = cheerio.load(r.data);
    
    // Look for article/post result items
    const articles = $('article, .post, .item, .movie-item, .result-item, h2 a, h3 a, .entry-title a');
    console.log('Articles/result items found:', articles.length);
    articles.slice(0, 10).each((i, el) => {
      const href = $(el).attr('href') || $(el).find('a').attr('href');
      const text = $(el).text().trim().slice(0, 60);
      if (href && text) console.log(`  [${i}] ${text} | ${href}`);
    });

    // Also look at ALL links to tv9.egydead.live
    const allLinks = $('a[href*="tv9.egydead.live"]').toArray();
    console.log('\nAll tv9.egydead.live links:', allLinks.length);
    allLinks.slice(0, 20).forEach(el => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().slice(0, 50);
      if (href && !href.match(/(category|page\/movies|page\/dmca|#)/)) {
        console.log('  ', href, '-', text);
      }
    });
  } catch(e) {
    console.log('Search ERROR:', e.message?.slice(0, 80));
  }

  // 2. Try a known movie page to understand video link structure
  console.log('\n=== MOVIE PAGE TEST ===');
  // Check if Deadpool 3 exists
  try {
    const r = await axios.get(`${BASE}/?s=deadpool`, { timeout: 10000, headers });
    const $ = cheerio.load(r.data);
    const allLinks = $('a[href*="tv9.egydead.live"]').toArray();
    console.log('Deadpool search - links:', allLinks.length);
    allLinks.slice(0, 15).forEach(el => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().slice(0, 50);
      if (href && !href.match(/(category|page\/movies|page\/dmca|#)/)) {
        console.log('  ', href, '-', text);
      }
    });
  } catch(e) {
    console.log('Deadpool search ERROR:', e.message?.slice(0, 80));
  }
}

test();
