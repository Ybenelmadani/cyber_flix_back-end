const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');

async function check() {
  // 1. Check episode POST response for download links
  const html = fs.readFileSync('./scratch/episode_post_response.html', 'utf8');
  const $ = cheerio.load(html);

  console.log('=== DOWNLOAD LINKS IN POST RESPONSE ===');
  // Look for download tables/sections
  $('.downloadTable, .download-table, .download-links, #downloadLinks, .downloadLinks, .quality-row, .quality-section').each((i, el) => {
    console.log(`Found: .${$(el).attr('class')}`, $(el).html()?.slice(0, 200));
  });

  // All anchor links (look for download-friendly hosts)
  const downloadHosts = ['1fichier', 'mega', 'drive.google', 'uptobox', 'nitroflare', 'ddownload', 'mdiaload', 'updown', 'vidtube', 'fastdl', 'mediafire', 'zippyshare', 'fz'];
  console.log('\nDownload links found:');
  let dlCount = 0;
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (downloadHosts.some(h => href.toLowerCase().includes(h))) {
      console.log(`  ${text} => ${href}`);
      dlCount++;
    }
  });
  console.log('Total download links:', dlCount);

  // Find ANY link tables
  console.log('\n=== ALL TABLES / QUALITY SECTIONS ===');
  $('table, .qualitySection, .quality, .resolution, [class*="quality"], [class*="download"], [class*="Quality"]').each((i, el) => {
    const cls = $(el).attr('class') || el.name;
    console.log(`[${cls}]:`, $(el).html()?.slice(0, 300).replace(/\s+/g, ' '));
  });

  // 2. Test TopCinema for House of Dragon SPECIFICALLY
  console.log('\n=== TOPCINEMA TEST for House of Dragon ===');
  const queries = [
    'https://web.topcinemaa.com/?s=house+of+the+dragon+s01e01',
    'https://web.topcinemaa.com/?s=house+dragon+s01e01',
    'https://web.topcinemaa.com/?s=house+of+the+dragon',
  ];

  for (const url of queries) {
    try {
      const r = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000
      });
      const $tc = cheerio.load(r.data);
      // Find all links on topcinemaa
      const links = [];
      $tc('a[href]').each((i, el) => {
        const href = $tc(el).attr('href') || '';
        const text = $tc(el).text().trim().slice(0, 50);
        if (href.includes('topcinemaa') && !href.match(/(category|page|tag|#)/)) {
          links.push({ href: href.slice(0, 100), text });
        }
      });
      console.log(`\n${url}`);
      console.log(`Status: ${r.status} | Links: ${links.length}`);
      links.slice(0, 5).forEach(l => console.log(`  ${l.text} => ${l.href}`));
    } catch(e) {
      console.log(`${url} => ERROR: ${e.code || e.response?.status} ${e.message?.slice(0, 50)}`);
    }
  }
}

check().catch(e => console.error('ERROR:', e.message));
