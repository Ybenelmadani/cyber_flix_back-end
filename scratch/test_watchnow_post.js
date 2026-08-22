const axios = require('axios');
const cheerio = require('cheerio');

// Test: POST to episode page (watchNow form submit) to get serversList
async function testWatchNow() {
  const BASE = 'https://tv9.egydead.live';
  const episodeUrl = `${BASE}/episode/house-of-the-dragon-s01e01-01/`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
    'Referer': episodeUrl,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': BASE,
  };

  // First get the GET page to check for nonces/hidden fields
  const getResp = await axios.get(episodeUrl, { timeout: 10000, headers });
  const $get = cheerio.load(getResp.data);
  
  // Find any hidden input fields in the watchNow form
  const watchForm = $get('.watchNow form, form.watchNow');
  console.log('Form found:', watchForm.length);
  const inputs = {};
  watchForm.find('input').each((i, el) => {
    const name = $get(el).attr('name');
    const val = $get(el).attr('value');
    console.log(`  input: name=${name} value=${val}`);
    if (name) inputs[name] = val || '';
  });
  
  // POST to episode page
  console.log('\nPOSTing to episode page...');
  const formData = new URLSearchParams(inputs).toString() || 'watch=1';
  console.log('Form data:', formData);
  
  try {
    const postResp = await axios.post(episodeUrl, formData, { timeout: 15000, headers, maxRedirects: 5 });
    const $post = cheerio.load(postResp.data);
    
    console.log('POST status:', postResp.status);
    
    // Check for serversList
    const servers = $post('.serversList li, ul.serversList li');
    console.log('Servers in POST response:', servers.length);
    servers.each((i, el) => {
      const link = $post(el).attr('data-link');
      const text = $post(el).text().trim();
      console.log(`  Server[${i}]: data-link="${link}" text="${text}"`);
    });
    
    // Check for watchAreaMaster
    const watchArea = $post('.watchAreaMaster');
    console.log('watchAreaMaster in POST:', watchArea.length);
    if (watchArea.length) console.log(watchArea.html()?.slice(0, 500));
    
    // Check for iframes
    const iframes = $post('iframe');
    console.log('Iframes in POST:', iframes.length);
    iframes.each((i, el) => {
      console.log(`  iframe[${i}] src="${$post(el).attr('src')}"`);
    });
    
    // Check for any data-link
    $post('[data-link]').each((i, el) => {
      console.log(`  data-link[${i}]: ${$post(el).attr('data-link')?.slice(0, 100)}`);
    });
    
    // Save POST response
    require('fs').writeFileSync('./scratch/episode_post_response.html', postResp.data);
    console.log('\nSaved POST response to scratch/episode_post_response.html');
    
  } catch(e) {
    console.log('POST error:', e.response?.status, e.message?.slice(0, 80));
  }
}

testWatchNow().catch(e => console.error('ERROR:', e.message));
