const axios = require('axios');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function probe() {
  const possiblePaths = [
    'titles/950/watch/season/1/episode/1',
    'titles/950/slug/season/1/episode/1',
    'titles/950/season/1/episode/1/watch',
    'titles/950/season/1/episode/1/a'
  ];
  
  for (const path of possiblePaths) {
    const url = `https://egydead.ca/${path}`;
    try {
      console.log(`Probing: ${url} ...`);
      const res = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT }
      });
      
      const match = res.data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
      if (match) {
        const data = JSON.parse(match[1]);
        console.log(`  SUCCESS! Loaders keys:`, Object.keys(data.loaders || {}));
        const k = Object.keys(data.loaders || {})[0];
        if (k && data.loaders[k].episode) {
          console.log(`  Found episode loader in '${k}'! Videos count:`, data.loaders[k].episode.videos?.length || 0);
          return; // stop on first success
        }
      } else {
        console.log("  bootstrapData not found");
      }
    } catch (err) {
      console.log(`  FAILED: ${err.message}`);
    }
  }
}

probe();
