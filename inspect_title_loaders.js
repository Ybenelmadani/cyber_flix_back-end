const axios = require('axios');
const fs = require('fs');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function probe() {
  const urls = [
    'https://egydead.ca/titles/2730',
    'https://egydead.ca/titles/2730/ferry-2'
  ];
  
  for (const url of urls) {
    try {
      console.log(`Probing: ${url} ...`);
      const res = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT }
      });
      
      const match = res.data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
      if (match) {
        const data = JSON.parse(match[1]);
        console.log(`  SUCCESS! Loaders keys:`, Object.keys(data.loaders || {}));
        if (data.loaders) {
          for (const k of Object.keys(data.loaders)) {
            console.log(`    Keys in loaders.${k}:`, Object.keys(data.loaders[k] || {}));
            if (data.loaders[k].title) {
              console.log(`      Title keys:`, Object.keys(data.loaders[k].title));
              console.log(`      Videos in title:`, data.loaders[k].title.videos?.length || 0);
              if (data.loaders[k].title.videos) {
                console.log(`      Videos:`, JSON.stringify(data.loaders[k].title.videos, null, 2));
              }
            }
          }
        }
      } else {
        console.log("  bootstrapData not found");
      }
    } catch (err) {
      console.error("  Error:", err.message);
    }
  }
}

probe();
