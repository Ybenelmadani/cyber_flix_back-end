const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const BASE = 'https://tv9.egydead.live';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': BASE + '/',
  };

  // Try WordPress AJAX / REST API search
  const endpoints = [
    `${BASE}/wp-json/wp/v2/search?search=house+dragon&per_page=5`,
    `${BASE}/wp-json/wp/v2/posts?search=house+dragon&per_page=5`,
    `${BASE}/wp-admin/admin-ajax.php`,
    `${BASE}/?s=house+dragon&ajax=true`,
  ];

  for (const url of endpoints) {
    try {
      const method = url.includes('admin-ajax') ? 'POST' : 'GET';
      const data = url.includes('admin-ajax') ? 
        'action=ajax_search&query=house+dragon' : null;
      const r = await axios({
        method,
        url,
        headers: method === 'POST' ? {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded',
        } : headers,
        data,
        timeout: 8000
      });
      
      if (typeof r.data === 'object') {
        console.log(url, '=> JSON response, length:', JSON.stringify(r.data).length);
        if (Array.isArray(r.data)) {
          r.data.slice(0, 3).forEach(item => {
            console.log('  item:', item.title?.rendered || item.title || JSON.stringify(item).slice(0, 80));
            console.log('  link:', item.link || item.url);
          });
        } else {
          console.log('  keys:', Object.keys(r.data).slice(0, 10).join(', '));
        }
      } else {
        const snippet = String(r.data).slice(0, 150).replace(/\n/g, ' ');
        console.log(url, '=> text, status:', r.status, snippet);
      }
    } catch(e) {
      console.log(url, '=> ERROR:', e.response?.status || e.code, e.message?.slice(0, 50));
    }
  }
  
  // Also check if egydead.ca has an API endpoint that works
  console.log('\n=== egydead.ca API test ===');
  const caHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://egydead.ca/',
    'X-Requested-With': 'XMLHttpRequest',
  };
  const caEndpoints = [
    'https://egydead.ca/api/search?q=house',
    'https://egydead.ca/api/titles?search=house',
    'https://egydead.ca/api/titles/search?q=house',
  ];
  for (const url of caEndpoints) {
    try {
      const r = await axios.get(url, { timeout: 8000, headers: caHeaders });
      console.log(url, '=> status:', r.status, typeof r.data === 'object' ? 'JSON' : String(r.data).slice(0,80));
    } catch(e) {
      console.log(url, '=> ERROR:', e.response?.status || e.code);
    }
  }
}

test();
