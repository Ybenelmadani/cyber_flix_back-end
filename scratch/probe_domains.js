const axios = require('axios');

async function checkDomains() {
  const domains = [
    "https://tv12.egydead.live",
    "https://tv11.egydead.live",
    "https://tv10.egydead.live",
    "https://tv9.egydead.live",
    "https://tv8.egydead.live",
    "https://egydead.ca",
    "https://egydead.live",
    "https://egydead.com"
  ];

  for (const domain of domains) {
    try {
      console.log(`Testing ${domain}...`);
      const res = await axios.get(domain, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        },
        timeout: 5000
      });
      console.log(`[SUCCESS] ${domain} - Status: ${res.status}`);
      if (res.data.includes("House of the Dragon") || res.data.includes("search")) {
         console.log(`          -> Looks like valid HTML`);
      }
    } catch (e) {
      console.log(`[FAIL] ${domain} - Error: ${e.response ? e.response.status : e.message}`);
    }
  }
}

checkDomains();
