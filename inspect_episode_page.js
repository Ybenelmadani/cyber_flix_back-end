const axios = require('axios');
const fs = require('fs');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function probeEpisode() {
  const url = 'https://egydead.ca/titles/950/season/1/episode/1';
  try {
    console.log(`Probing Episode page: ${url} ...`);
    const res = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    fs.writeFileSync('episode_page_success.html', res.data);
    
    const match = res.data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
    if (match) {
      const data = JSON.parse(match[1]);
      console.log("Loaders keys:", Object.keys(data.loaders || {}));
      
      const k = Object.keys(data.loaders || {})[0];
      if (k) {
        console.log(`Keys in loaders.${k}:`, Object.keys(data.loaders[k] || {}));
        const tp = data.loaders[k];
        
        // Find if there is episode details and videos
        if (tp.episode) {
          console.log("Episode details:", {
            id: tp.episode.id,
            name: tp.episode.name,
            season_number: tp.episode.season_number,
            episode_number: tp.episode.episode_number
          });
          console.log("Episode videos count:", tp.episode.videos?.length || 0);
          if (tp.episode.videos) {
            console.log("Episode videos:", JSON.stringify(tp.episode.videos, null, 2));
          }
        }
      }
    } else {
      console.log("bootstrapData not found");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

probeEpisode();
