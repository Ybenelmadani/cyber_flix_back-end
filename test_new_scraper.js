const axios = require('axios');
const cheerio = require('cheerio');

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

// Search titles on egydead.ca
async function searchTitle(query) {
  const searchUrl = `https://egydead.ca/search/${encodeURIComponent(query)}/`;
  try {
    console.log(`Searching for '${query}' on EgyDead.ca...`);
    const { data } = await axios.get(searchUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const bootData = parseBootstrapData(data);
    if (!bootData) {
      console.log("No bootstrapData found in search results.");
      return [];
    }
    
    const results = bootData.loaders?.searchPage?.results || [];
    console.log(`Search returned ${results.length} items.`);
    return results;
  } catch (err) {
    console.error("Search error:", err.message);
    return [];
  }
}

// Score results to find the best match
function scoreResult(item, title, year, isTV = false) {
  let score = 0;
  const name = String(item.name || "").toLowerCase();
  const orig = String(item.original_title || "").toLowerCase();
  const query = title.toLowerCase();
  
  if (name.includes(query) || orig.includes(query)) score += 50;
  if (orig === query) score += 30;
  
  // Year matching
  if (year && String(item.year) === String(year)) {
    score += 40;
  }
  
  // TV/Movie matching
  const itemIsTV = Boolean(item.is_series || item.type === 'series' || name.includes('مسلسل'));
  if (isTV === itemIsTV) {
    score += 30;
  } else {
    score -= 20;
  }
  
  return score;
}

// Main scrape function
const scrapeEgyDead = async (title, year, isTV = false, season = null, episode = null) => {
  try {
    const results = await searchTitle(title);
    if (results.length === 0) return null;
    
    // Score results
    let bestItem = null;
    let bestScore = -999;
    
    results.forEach(item => {
      const score = scoreResult(item, title, year, isTV);
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    });
    
    if (!bestItem || bestScore < 10) {
      console.log(`No good matching title found. Best score: ${bestScore}`);
      return null;
    }
    
    console.log(`Best matching title: ID=${bestItem.id} | Name="${bestItem.name}" | Score=${bestScore}`);
    
    const servers = [];
    
    if (!isTV) {
      // Movie watch URL
      const watchUrl = `https://egydead.ca/titles/${bestItem.id}/watch`;
      console.log(`Fetching movie details: ${watchUrl}`);
      const { data } = await axios.get(watchUrl, {
        headers: { "User-Agent": USER_AGENT }
      });
      
      const bootData = parseBootstrapData(data);
      const titleObj = bootData?.loaders?.titlePage?.title;
      const videos = titleObj?.videos || [];
      
      console.log(`Found ${videos.length} movie videos/servers.`);
      videos.forEach(v => {
        servers.push({
          name: v.name || "Watch Server",
          provider: "EgyDead",
          url: v.src,
          quality: String(v.quality || "HD").toUpperCase()
        });
      });
    } else {
      // Episode watch URL
      const watchUrl = `https://egydead.ca/titles/${bestItem.id}/watch/season/${season}/episode/${episode}`;
      console.log(`Fetching episode details: ${watchUrl}`);
      const { data } = await axios.get(watchUrl, {
        headers: { "User-Agent": USER_AGENT }
      });
      
      const bootData = parseBootstrapData(data);
      const epObj = bootData?.loaders?.episodePage?.episode;
      const videos = epObj?.videos || [];
      
      console.log(`Found ${videos.length} episode videos/servers.`);
      videos.forEach(v => {
        servers.push({
          name: v.name || "Watch Server",
          provider: "EgyDead",
          url: v.src,
          quality: String(v.quality || "HD").toUpperCase()
        });
      });
    }
    
    return servers.length > 0 ? { provider: "EgyDead", servers } : null;
  } catch (err) {
    console.error("Scrape error:", err.message);
    return null;
  }
};

async function test() {
  console.log("=== TEST 1: MOVIE (Deadpool 2016) ===");
  const movieRes = await scrapeEgyDead("Deadpool", 2016, false);
  console.log("Movie results:", JSON.stringify(movieRes, null, 2));
  
  console.log("\n=== TEST 2: TV EPISODE (المتشرد Season 1 Episode 1) ===");
  const tvRes = await scrapeEgyDead("المتشرد", 2024, true, 1, 1);
  console.log("TV episode results:", JSON.stringify(tvRes, null, 2));
}

test();
