const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');

async function check() {
  // 1. Deep check EgyDead download section
  const html = fs.readFileSync('./scratch/episode_post_response.html', 'utf8');
  const $ = cheerio.load(html);

  console.log('=== EGYDEAD DOWNLOAD MASTER SECTION ===');
  const dlMaster = $('.downloadMaster');
  console.log('downloadMaster found:', dlMaster.length);
  console.log('Full HTML:');
  console.log(dlMaster.html()?.slice(0, 3000).replace(/\s+/g, ' '));

  // Extract download links with quality info
  console.log('\n=== DOWNLOAD LINKS WITH QUALITY ===');
  $('.downloadMaster a[href], .donwload-table a[href], [class*="donwload"] a[href]').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    const parent = $(el).parent().html() || '';
    if (href.startsWith('http')) {
      console.log(`  [${i}] "${text}" => ${href}`);
      // Find quality near this link
      const qualityEl = $(el).closest('[class*="quality"], [class*="Quality"], li, tr').find('[class*="quality"], .resolution, span').first().text().trim();
      if (qualityEl) console.log(`      quality hint: ${qualityEl}`);
    }
  });

  // 2. Test new TopCinema domain (topcinemaa.top)
  console.log('\n=== TOPCINEMA.TOP TEST ===');
  const newDomains = [
    'https://topcinemaa.top/?s=house+of+the+dragon+s01e01',
    'https://topcinemaa.top/?s=house+dragon',
  ];
  for (const url of newDomains) {
    try {
      const r = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
        timeout: 15000,
        maxRedirects: 5,
      });
      const $tc = cheerio.load(r.data);
      const links = [];
      $tc('a[href]').each((i, el) => {
        const href = $tc(el).attr('href') || '';
        const text = $tc(el).text().trim().slice(0, 60);
        if ((href.includes('topcinemaa') || href.includes('topcinema')) && !href.match(/(category|page|tag|#|recent|movies|netflix|rating)/)) {
          links.push({ href: href.slice(0, 120), text });
        }
      });
      console.log(`\n${url}`);
      console.log(`Status: ${r.status} | Result links: ${links.length}`);
      links.slice(0, 8).forEach(l => console.log(`  "${l.text}" => ${l.href}`));
    } catch(e) {
      console.log(`${url} => ERROR: ${e.code} ${e.message?.slice(0, 60)}`);
    }
  }

  // 3. Also try fetching a direct topcinema episode page to see download link structure
  console.log('\n=== TOPCINEMA EPISODE PAGE DOWNLOAD LINKS ===');
  try {
    // Try the direct episode URL on new domain
    const r = await axios.get('https://topcinemaa.top/مسلسل-house-of-the-dragon-الموسم-الاول-الحلقة-1/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000, maxRedirects: 5,
    });
    const $p = cheerio.load(r.data);
    const downloadHosts = ['1fichier', 'updown', 'mdiaload', 'ddownload', 'nitroflare', 'uptobox', 'mega', 'drive.google', 'vidtube', 'mixdrop', 'voe', 'dood'];
    $p('a[href]').each((i, el) => {
      const href = $p(el).attr('href') || '';
      const text = $p(el).text().trim();
      if (downloadHosts.some(h => href.toLowerCase().includes(h))) {
        console.log(`  "${text}" => ${href.slice(0, 100)}`);
      }
    });
  } catch(e) {
    console.log('Direct page error:', e.code, e.message?.slice(0, 60));
  }
}

check().catch(e => console.error('ERROR:', e.message));
