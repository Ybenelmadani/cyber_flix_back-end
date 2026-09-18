const axios = require('axios');
async function testDomains() {
  for (let i = 8; i <= 15; i++) {
    const url = `https://tv${i}.egydead.live`;
    try {
      const r = await axios.get(url, {timeout: 3000, headers: {'User-Agent': 'Mozilla/5.0'}});
      console.log(url, '=>', r.status);
    } catch (e) {
      console.log(url, '=>', e.response ? e.response.status : e.code);
    }
  }
}
testDomains();
