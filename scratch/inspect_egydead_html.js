const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const BASE = 'https://tv9.egydead.live';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
    'Referer': `${BASE}/?s=house+of+the+dragon`,
  };

  // Fetch episode page
  const r = await axios.get(`${BASE}/episode/house-of-the-dragon-s01e01-01/`, { timeout: 15000, headers });
  const html = r.data;
  const $ = cheerio.load(html);

  // Print all script blocks
  console.log('=== ALL SCRIPT CONTENT ===');
  $('script').each((i, el) => {
    const content = $(el).html() || '';
    const src = $(el).attr('src');
    if (src) {
      if (!src.includes('google') && !src.includes('jquery') && !src.includes('analytics')) {
        console.log(`\n[script src="${src}"]`);
      }
    } else if (content.length > 50) {
      // Print script content that might contain video/player info
      if (content.includes('src') || content.includes('link') || content.includes('url') || 
          content.includes('video') || content.includes('player') || content.includes('embed') ||
          content.includes('post_id') || content.includes('ajax') || content.includes('nonce')) {
        console.log(`\n[inline script ${i}] length=${content.length}:`);
        console.log(content.slice(0, 600));
      }
    }
  });

  // Print .watchNow area HTML
  console.log('\n=== WATCHNOW / PLAYER AREA HTML ===');
  const watchArea = $('.watchNow, #watchNow, .player-area, #player, .video-player, .episode-content, .post-content, .entry-content').html();
  if (watchArea) {
    console.log(watchArea.slice(0, 2000));
  } else {
    console.log('No specific watch area found');
    // Print the full HTML around the iframe
    const iframeParent = $('iframe').parent().parent().html();
    console.log('Iframe parent HTML:', iframeParent?.slice(0, 1500));
  }

  // Look for any data attributes with video sources
  console.log('\n=== DATA ATTRIBUTES ===');
  $('[data-src], [data-url], [data-link], [data-video], [data-embed]').each((i, el) => {
    const src = $(el).attr('data-src') || $(el).attr('data-url') || $(el).attr('data-link') || $(el).attr('data-video') || $(el).attr('data-embed');
    const cls = $(el).attr('class');
    const id = $(el).attr('id');
    console.log(`  [${el.name}#${id}.${cls}] = ${src?.slice(0, 100)}`);
  });

  // Check for AJAX endpoints or post IDs
  console.log('\n=== POST META / IDS ===');
  const bodyText = html;
  const postIdMatch = bodyText.match(/post_?id['":\s]+(\d+)/gi);
  const nonceMatch = bodyText.match(/nonce['":\s]+['"]([^'"]+)['"]/gi);
  const ajaxMatch = bodyText.match(/ajaxurl['":\s]+['"]([^'"]+)['"]/gi);
  console.log('post_id matches:', postIdMatch?.slice(0, 5));
  console.log('nonce matches:', nonceMatch?.slice(0, 3));
  console.log('ajaxurl matches:', ajaxMatch?.slice(0, 3));
}

test().catch(e => console.error('ERROR:', e.message));
