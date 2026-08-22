const axios = require('axios');
const fs = require('fs');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function fetchWatchPage() {
  try {
    const url = 'https://egydead.ca/titles/596/watch';
    console.log(`Fetching: ${url}`);
    
    // axios throws on 404/500, but let's see
    const res = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      validateStatus: () => true // Accept all statuses
    });
    
    console.log(`Status: ${res.status}`);
    
    if (res.data) {
        fs.writeFileSync('watch_page.html', res.data);
        const match = res.data.match(/window\.bootstrapData\s*=\s*({.*?});\s*<\/script>/s);
        if (match) {
            const data = JSON.parse(match[1]);
            // The old scraper says loaders.titlePage.title.videos
            if (data.loaders && data.loaders.titlePage && data.loaders.titlePage.title) {
                const videos = data.loaders.titlePage.title.videos;
                console.log(`Found titlePage videos:`, videos ? videos.length : 0);
                if (videos) {
                    console.log(JSON.stringify(videos, null, 2));
                }
            } else {
                console.log("No loaders.titlePage.title found. Dumping loaders keys:", Object.keys(data.loaders || {}));
                if (data.loaders?.watchPage) {
                    console.log("watchPage loader found:", Object.keys(data.loaders.watchPage));
                }
            }
        } else {
            console.log("No bootstrapData found in HTML.");
        }
    }
  } catch (err) {
    console.error("Error fetching watch page:", err.message);
  }
}

fetchWatchPage();
