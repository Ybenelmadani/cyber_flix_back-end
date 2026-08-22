const axios = require('axios');
const fs = require('fs');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function probeUrls() {
  const possiblePaths = [
    'titles/596',
    'titles/596/deadpool',
    'watch/596',
    'watch/596/deadpool',
    'movie/596',
    'movies/596',
    'title/596'
  ];
  
  for (const path of possiblePaths) {
    const url = `https://egydead.ca/${path}`;
    try {
      console.log(`Probing: ${url} ...`);
      const res = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT },
        maxRedirects: 5
      });
      console.log(`  SUCCESS: Status ${res.status}, Length: ${res.data.length}`);
      
      // Let's save a snippet or check for title
      if (res.data.includes("Deadpool")) {
        console.log(`  Contains Deadpool! Title tag: ${res.data.match(/<title>(.*?)<\/title>/)?.[1]}`);
        fs.writeFileSync('probing_success.html', res.data);
        console.log(`  Saved to probing_success.html`);
        return; // found it!
      }
    } catch (err) {
      console.log(`  FAILED: ${err.message}`);
    }
  }
}

probeUrls();
