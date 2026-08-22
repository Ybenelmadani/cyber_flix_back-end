const axios = require('axios');

async function test() {
  // The VST token found in the episode page
  const vstToken = '_jMvNjYwM2UwN-EtYmIxZSWWN-M2L-FiM2MtNjM1M-JjMjBkM2Zk';
  const encodedVst = encodeURIComponent(vstToken);
  
  const cp = JSON.stringify({
    domain: 'tv8.egydead.live',
    host: '555b531df08644848f9ceb0188082e5e|tv8.egydead.live',
  });

  const params = new URLSearchParams({
    vst: encodedVst,
    lang: 'en',
    container: '.holder',
    cp,
  });

  const url = `https://cvt-s1.agl006.host/o?${params.toString()}`;
  console.log('Fetching:', url.slice(0, 150));

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'https://tv9.egydead.live/',
    'Origin': 'https://tv9.egydead.live',
  };

  try {
    const r = await axios.get(url, { timeout: 15000, headers });
    console.log('Status:', r.status);
    console.log('Content-Type:', r.headers['content-type']);
    const content = typeof r.data === 'object' ? JSON.stringify(r.data, null, 2) : String(r.data);
    console.log('Content (first 3000):', content.slice(0, 3000));
  } catch(e) {
    console.log('ERROR:', e.response?.status, e.code, e.message?.slice(0, 100));
    if (e.response?.data) {
      console.log('Response data:', String(e.response.data).slice(0, 500));
    }
  }
  
  // Also try the /s/ endpoint which is often the player script
  try {
    const scriptUrl = `https://cvt-s1.agl006.host/s/${encodedVst}`;
    console.log('\nTrying script URL:', scriptUrl);
    const r = await axios.get(scriptUrl, { timeout: 10000, headers });
    console.log('Status:', r.status);
    console.log('Content:', String(r.data).slice(0, 500));
  } catch(e) {
    console.log('Script URL ERROR:', e.response?.status, e.code);
  }
}

test();
