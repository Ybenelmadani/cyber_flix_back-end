const axios = require('axios');
const fs = require('fs');
const path = require('path');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const parseBootstrapData = (html) => {
  const match = html.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error("Failed to parse bootstrap JSON:", e.message);
    }
  }
  return null;
};

async function run() {
  const query = "House of the Dragon";
  const searchUrl = `https://egydead.ca/search/${encodeURIComponent(query)}/`;
  console.log(`Searching for: ${query}`);
  
  try {
    const { data: searchHtml } = await axios.get(searchUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    fs.writeFileSync('scratch_search_house.html', searchHtml);
    const bootData = parseBootstrapData(searchHtml);
    if (!bootData) {
      console.log("No bootstrapData found in search results.");
      return;
    }
    
    const results = bootData.loaders?.searchPage?.results || [];
    console.log(`Found ${results.length} search results:`);
    results.forEach((r, i) => {
      console.log(`Result #${i + 1}: ID=${r.id} | Name="${r.name}" | OriginalTitle="${r.original_title}" | Type=${r.type} | IsSeries=${r.is_series}`);
    });
    
    if (results.length === 0) return;
    
    // Let's inspect the first result (which should be Season 1 or Season 2 or the series itself)
    const bestItem = results[0];
    
    // Fetch watch page or title page
    const titleUrl = `https://egydead.ca/titles/${bestItem.id}`;
    console.log(`Fetching title page: ${titleUrl}`);
    const { data: titleHtml } = await axios.get(titleUrl, { headers: { "User-Agent": USER_AGENT } });
    fs.writeFileSync('scratch_title_house.html', titleHtml);
    const titleBoot = parseBootstrapData(titleHtml);
    
    if (titleBoot) {
      console.log("Title Boot Data keys:", Object.keys(titleBoot.loaders || {}));
      const titleObj = titleBoot.loaders?.titlePage?.title;
      if (titleObj) {
        console.log(`Title info: Name="${titleObj.name}" | Genres=${JSON.stringify(titleObj.genres)}`);
        console.log(`Seasons:`, (titleObj.seasons || []).map(s => `Season ${s.number} (${s.episodes_count} episodes, ID=${s.id})`));
      }
    }
    
    // Fetch episode 1 of season 1 watch page
    const watchUrl = `https://egydead.ca/titles/${bestItem.id}/watch/season/1/episode/1`;
    console.log(`Fetching episode watch page: ${watchUrl}`);
    const { data: watchHtml } = await axios.get(watchUrl, { headers: { "User-Agent": USER_AGENT } });
    fs.writeFileSync('scratch_watch_house.html', watchHtml);
    const watchBoot = parseBootstrapData(watchHtml);
    
    if (watchBoot) {
      const epObj = watchBoot.loaders?.episodePage?.episode;
      if (epObj) {
        console.log(`Episode info: Name="${epObj.name}" | Title="${epObj.title}"`);
        console.log(`Videos (${(epObj.videos || []).length}):`, JSON.stringify(epObj.videos, null, 2));
      } else {
        console.log("No episode details found in loaders.episodePage");
        console.log("Loaders keys:", Object.keys(watchBoot.loaders || {}));
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
