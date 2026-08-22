const axios = require('axios');

async function testCaApi() {
  const q = encodeURIComponent("House of the Dragon");
  const endpoints = [
    `https://egydead.ca/api/v1/search/${q}`,
    `https://egydead.ca/api/v1/search?query=${q}`,
    `https://egydead.ca/api/v1/titles?query=${q}`,
    `https://egydead.ca/api/v1/titles/search?query=${q}`
  ];
  
  for (const url of endpoints) {
    try {
      console.log(`Testing ${url}`);
      const res = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      });
      console.log(`[SUCCESS] ${url} -> length: ${JSON.stringify(res.data).length}`);
    } catch(e) {
      console.log(`[FAIL] ${url} -> ${e.response ? e.response.status : e.message}`);
    }
  }
}

testCaApi();
