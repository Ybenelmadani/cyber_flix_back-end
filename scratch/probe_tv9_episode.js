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

  // 1. Fetch a search page and extract all result items
  console.log('=== SEARCH RESULTS EXTRACTION ===');
  try {
    const r = await axios.get(`${BASE}/?s=house+of+the+dragon`, { timeout: 10000, headers });
    const $ = cheerio.load(r.data);
    
    // Find all movieItem links
    const items = [];
    $('li.movieItem a, .movieItem a, ul.posts-list a, .posts-list li a').each((i, el) => {
      const href = $(el).attr('href');
      const title = $(el).attr('title') || $(el).find('h1, h2, .BottomTitle').text().trim();
      const cat = $(el).find('.cat_name').text().trim();
      const ep = $(el).find('.number_episode em').text().trim();
      if (href && href.includes('egydead')) {
        items.push({ href, title, cat, ep });
      }
    });
    console.log(`Found ${items.length} results:`);
    items.forEach((it, i) => {
      console.log(`[${i}] ${it.title?.slice(0, 70)}`);
      console.log(`     URL: ${it.href}`);
      console.log(`     cat: ${it.cat} | ep: ${it.ep}`);
    });
  } catch(e) {
    console.log('Search ERROR:', e.message?.slice(0, 80));
  }

  // 2. Fetch an episode page to see video links structure
  console.log('\n=== EPISODE PAGE STRUCTURE ===');
  try {
    const r = await axios.get(`${BASE}/episode/house-of-the-dragon-s03e01-01/`, { 
      timeout: 10000, 
      headers: { ...headers, 'Referer': `${BASE}/?s=house+of+the+dragon` }
    });
    const $ = cheerio.load(r.data);
    
    console.log('Episode page title:', $('title').text().trim());
    
    // Look for iframes (embed players)
    const iframes = $('iframe');
    console.log('\nIframes found:', iframes.length);
    iframes.each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      console.log(`  iframe[${i}]: ${src?.slice(0, 100)}`);
    });
    
    // Look for download links
    console.log('\nDownload links:');
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().slice(0, 50);
      if (href && (href.includes('1fichier') || href.includes('mega') || href.includes('drive.google') ||
          href.includes('dood') || href.includes('voe') || href.includes('mixdrop') ||
          href.includes('uptobox') || href.includes('nitroflare') || href.includes('vidtube') ||
          href.includes('streamhg') || href.includes('audinifer') || href.includes('download') ||
          href.includes('stream'))) {
        console.log(`  ${text} => ${href?.slice(0, 100)}`);
      }
    });
    
    // Look for server buttons or tabs
    console.log('\nServer/quality buttons:');
    $('a[data-src], a[data-link], button[data-src], .server-item, .quality-btn, [class*="server"], [class*="quality"], [class*="watch"], [class*="embed"]').each((i, el) => {
      const src = $(el).attr('data-src') || $(el).attr('data-link') || $(el).attr('href');
      const text = $(el).text().trim().slice(0, 40);
      const cls = $(el).attr('class');
      if (src || cls?.includes('server') || cls?.includes('watch')) {
        console.log(`  [${el.name}.${cls?.slice(0,30)}] text:"${text}" src:${src?.slice(0,80)}`);
      }
    });
    
    // Print a snippet of the body for analysis
    console.log('\nBody snippet (first 1000 chars):');
    const bodyText = $('body').html()?.slice(0, 1500).replace(/\n+/g, '\n').replace(/  +/g, ' ');
    console.log(bodyText);
    
  } catch(e) {
    console.log('Episode page ERROR:', e.message?.slice(0, 80));
  }
}

test();
