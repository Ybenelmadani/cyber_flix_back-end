const axios = require('axios');

async function test() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ar,en;q=0.5',
    'Referer': 'https://www.google.com/',
    'Upgrade-Insecure-Requests': '1',
  };

  // Check what egydead.live/com/pro actually are
  for (const domain of ['https://egydead.live', 'https://egydead.com', 'https://egydead.pro']) {
    try {
      const r = await axios.get(domain, { timeout: 8000, headers, maxRedirects: 5 });
      const titleMatch = r.data.match(/<title[^>]*>(.*?)<\/title>/i);
      console.log(domain, '=> title:', titleMatch?.[1]?.trim()?.slice(0, 80));
      console.log('  finalURL:', r.request?.res?.responseUrl || domain);
      console.log('  snippet:', r.data.slice(0, 300).replace(/\n/g, ' '));
    } catch(e) {
      console.log(domain, '=> ERROR:', e.message?.slice(0, 80));
    }
  }

  // Try egydead.ca with full browser-like headers
  const fullHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
  };

  try {
    const r = await axios.get('https://egydead.ca/', {
      timeout: 10000,
      headers: fullHeaders,
      maxRedirects: 10
    });
    console.log('\negydead.ca full headers => status:', r.status, '| has bootstrap:', r.data.includes('bootstrapData'));
    const titleMatch = r.data.match(/<title[^>]*>(.*?)<\/title>/i);
    console.log('  title:', titleMatch?.[1]?.trim()?.slice(0, 80));
  } catch(e) {
    console.log('\negydead.ca full headers => ERROR:', e.response?.status, e.code, e.message?.slice(0, 80));
  }

  // Also try the search endpoint with referer
  try {
    const r = await axios.get('https://egydead.ca/search/house/', {
      timeout: 10000,
      headers: { ...fullHeaders, 'Referer': 'https://egydead.ca/' },
      maxRedirects: 10
    });
    console.log('\negydead.ca search => status:', r.status, '| has bootstrap:', r.data.includes('bootstrapData'));
  } catch(e) {
    console.log('\negydead.ca search => ERROR:', e.response?.status, e.code);
  }
}

test();
