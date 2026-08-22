const axios = require('axios');

async function test() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'https://tv9.egydead.live/',
  };

  // Fetch the main JS plugin file - look for how serversList is built
  try {
    const r = await axios.get(
      'https://tv9.egydead.live/wp-content/themes/egydeadc-taq/Interface/js/plugins.js',
      { timeout: 10000, headers }
    );
    const content = String(r.data);
    console.log('plugins.js size:', content.length);
    
    // Search for relevant code
    const serverIdx = content.indexOf('serversList');
    if (serverIdx !== -1) {
      console.log('serversList in plugins.js:', content.slice(Math.max(0, serverIdx-200), serverIdx+500));
    }
    
    // Look for ajax calls that fetch the server list
    const ajaxIdx = content.indexOf('Ajax');
    if (ajaxIdx !== -1) {
      console.log('Ajax in plugins.js:', content.slice(Math.max(0, ajaxIdx-100), ajaxIdx+300));
    }
    
    // Look for 'watchArea'
    const watchIdx = content.indexOf('watchArea');
    if (watchIdx !== -1) {
      console.log('watchArea in plugins.js:', content.slice(Math.max(0, watchIdx-100), watchIdx+500));
    }
    
    // Print all URLs in plugins.js
    const urls = content.match(/https?:\/\/[^\s"']+/g) || [];
    console.log('URLs in plugins.js:', urls.slice(0, 20));
    
    // Save it
    require('fs').writeFileSync('./scratch/plugins.js', content);
    console.log('Saved to scratch/plugins.js');
  } catch(e) {
    console.log('ERROR:', e.message?.slice(0, 80));
  }
  
  // Also check the "large inline script" from the HTML - look for watchNow or getServers
  // Check if there's a PHP endpoint that returns server list
  try {
    const r = await axios.get(
      'https://tv9.egydead.live/wp-content/themes/egydeadc-taq/Ajax/live-search.php?search=house',
      { timeout: 8000, headers }
    );
    console.log('\nlive-search.php status:', r.status);
    console.log('Response:', String(r.data).slice(0, 500));
  } catch(e) {
    console.log('\nlive-search.php ERROR:', e.response?.status, e.code);
  }
  
  // Try the watch-later endpoint structure to understand how data is fetched
  try {
    const r = await axios.post(
      'https://tv9.egydead.live/wp-content/themes/egydeadc-taq/Ajax/getServers.php',
      'post_id=202668',
      { timeout: 8000, headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    console.log('\ngetServers.php status:', r.status);
    console.log('Response:', String(r.data).slice(0, 500));
  } catch(e) {
    console.log('\ngetServers.php ERROR:', e.response?.status, e.code);
  }
}

test();
