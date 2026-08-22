const axios = require('axios');

async function checkDomains() {
  const domains = [];
  for (let i = 8; i <= 20; i++) {
    domains.push(`https://tv${i}.egydead.live`);
  }
  domains.push("https://egydead.live");
  domains.push("https://egydead.art");
  domains.push("https://egydead.cam");
  domains.push("https://egydead.cloud");
  domains.push("https://egydead.co");
  
  for (const domain of domains) {
    try {
      console.log(`Testing ${domain}...`);
      const res = await axios.get(domain, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
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
