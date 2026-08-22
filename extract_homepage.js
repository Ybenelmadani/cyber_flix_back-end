const axios = require('axios');
const fs = require('fs');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function extractHomepage() {
  const url = 'https://egydead.ca/';
  try {
    console.log(`Fetching homepage: ${url} ...`);
    const { data } = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    fs.writeFileSync('homepage.html', data);
    console.log("Saved homepage to homepage.html");
    
    const match = data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
    if (match) {
      const bootData = JSON.parse(match[1]);
      console.log("Bootstrap Data keys:", Object.keys(bootData));
      console.log("Loaders keys:", Object.keys(bootData.loaders || {}));
      
      const channelLoader = bootData.loaders.channelPage || bootData.loaders.homepage || bootData.loaders.homepageChannel;
      if (bootData.loaders) {
        for (const k of Object.keys(bootData.loaders)) {
          console.log(`Loader for '${k}':`, Object.keys(bootData.loaders[k]));
        }
      }
      
      // Let's search for any imported titles in bootstrapData
      console.log("\nSearching recursively for titles in bootstrapData...");
      const titles = [];
      function searchObj(obj, path = '') {
        if (!obj) return;
        if (typeof obj === 'object') {
          if (obj.model_type === 'title' || (obj.id && obj.name && obj.type && (obj.type === 'movie' || obj.type === 'series'))) {
            titles.push(obj);
          } else {
            if (Array.isArray(obj)) {
              obj.forEach((item, index) => searchObj(item, `${path}[${index}]`));
            } else {
              for (const key of Object.keys(obj)) {
                searchObj(obj[key], `${path}.${key}`);
              }
            }
          }
        }
      }
      searchObj(bootData, 'root');
      console.log(`Found ${titles.length} titles on homepage:`);
      
      const uniqueTitles = {};
      titles.forEach(t => {
        uniqueTitles[t.id] = { id: t.id, name: t.name, type: t.type };
      });
      
      console.log(Object.values(uniqueTitles).slice(0, 30));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

extractHomepage();
