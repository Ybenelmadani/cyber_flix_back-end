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

  // Episode page - Episode 1 S01
  const r = await axios.get(`${BASE}/episode/house-of-the-dragon-s01e01-01/`, { timeout: 15000, headers });
  const $ = cheerio.load(r.data);

  // Look for serversList
  console.log('=== SERVERS LIST ===');
  const serversList = $('.serversList, #serversList, ul.serversList, .servers-list, .servers');
  console.log('serversList elements:', serversList.length);
  serversList.each((i, el) => {
    console.log(`  [${i}] class="${$(el).attr('class')}" id="${$(el).attr('id')}"`);
    $(el).find('li').each((j, li) => {
      const dataLink = $(li).attr('data-link') || $(li).attr('data-src') || $(li).attr('data-url');
      const text = $(li).text().trim().slice(0, 60);
      console.log(`    li[${j}] data-link="${dataLink?.slice(0,100)}" text="${text}"`);
    });
  });

  // Also look for watchAreaMaster
  console.log('\n=== WATCH AREA MASTER ===');
  const watchArea = $('.watchAreaMaster, #watchAreaMaster, .watch-area');
  console.log('watchAreaMaster elements:', watchArea.length);
  watchArea.each((i, el) => {
    console.log(`  HTML snippet: ${$(el).html()?.slice(0, 1000)}`);
  });

  // Search for data-link anywhere
  console.log('\n=== ALL data-link ATTRIBUTES ===');
  $('[data-link]').each((i, el) => {
    const link = $(el).attr('data-link');
    const text = $(el).text().trim().slice(0, 40);
    const cls = $(el).attr('class');
    console.log(`  [${el.name}.${cls}] data-link="${link?.slice(0, 100)}" text="${text}"`);
  });

  // Print the full HTML of the inline script 15 (largest one with servers)
  console.log('\n=== LARGE INLINE SCRIPT (might have embed links) ===');
  $('script').each((i, el) => {
    const content = $(el).html() || '';
    if (content.length > 5000 && content.includes('serversList')) {
      // Extract all URLs/links from this script
      const urlMatches = content.match(/https?:\/\/[^\s"']+/g) || [];
      const dataLinkMatches = content.match(/data\(['"]link['"]\s*,\s*['"]([^'"]+)['"]/g) || [];
      const iframeSrcMatches = content.match(/iframe.*?src\s*=\s*['"]([^'"]+)['"]/gi) || [];
      console.log('URL matches:', urlMatches.slice(0, 10));
      console.log('data-link set matches:', dataLinkMatches.slice(0, 10));
      console.log('iframe src matches:', iframeSrcMatches.slice(0, 10));
      
      // Print relevant sections
      const serverMatch = content.match(/(serversList[\s\S]{0,2000})/);
      if (serverMatch) console.log('serversList context:', serverMatch[1].slice(0, 500));
    }
  });

  // Save full HTML to file for manual inspection
  const fs = require('fs');
  fs.writeFileSync('./scratch/episode_s01e01.html', r.data);
  console.log('\nFull HTML saved to scratch/episode_s01e01.html');
}

test().catch(e => console.error('ERROR:', e.message));
