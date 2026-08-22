const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const url = 'https://topcinemaa.top/?s=House+of+the+Dragon+s03e05';
  console.log('Fetching', url);
  try {
    const r = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log('Status', r.status);
    console.log(r.data.substring(0, 500));
  } catch (e) {
    console.error(e.message);
  }
}
run();
