const axios = require('axios');
const fs = require('fs');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function probeTV() {
  const url = 'https://egydead.ca/titles/950/watch';
  try {
    console.log(`Probing TV Show page: ${url} ...`);
    const res = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    fs.writeFileSync('tv_show_success.html', res.data);
    
    const match = res.data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
    if (match) {
      const data = JSON.parse(match[1]);
      const tp = data.loaders.titlePage;
      console.log("Title Details:", {
        id: tp.title.id,
        name: tp.title.name,
        type: tp.title.type,
        is_series: tp.title.is_series,
        seasons_count: tp.title.seasons_count
      });
      
      console.log("Seasons details:", JSON.stringify(tp.title.seasons, null, 2));
      
      // Let's print details of tp.episodes
      console.log("\nEpisodes loader structure:", Object.keys(tp.episodes || {}));
      if (tp.episodes && tp.episodes.data) {
        console.log(`Found ${tp.episodes.data.length} episodes:`);
        tp.episodes.data.slice(0, 5).forEach((ep, i) => {
          console.log(`  Episode #${i + 1}: ID=${ep.id} | Name="${ep.name}" | Season=${ep.season_number} | Episode=${ep.episode_number}`);
          if (ep.videos) {
            console.log(`    Videos:`, JSON.stringify(ep.videos, null, 2));
          }
        });
      }
    } else {
      console.log("bootstrapData not found");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

probeTV();
