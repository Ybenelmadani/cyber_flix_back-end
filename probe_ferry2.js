const axios = require('axios');
const fs = require('fs');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function probe() {
  const url = 'https://egydead.ca/titles/2730';
  try {
    console.log(`Probing: ${url} ...`);
    const res = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const match = res.data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
    if (match) {
      const data = JSON.parse(match[1]);
      const title = data.loaders.titlePage.title;
      console.log("Title details:", {
        id: title.id,
        name: title.name
      });
      console.log("Videos array:", JSON.stringify(title.videos, null, 2));
    } else {
      console.log("bootstrapData not found");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

probe();
