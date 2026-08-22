const axios = require('axios');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function testSearch(query) {
  const searchUrl = `https://egydead.ca/search/${encodeURIComponent(query)}/`;
  try {
    console.log(`\nSearching for: ${query} ...`);
    const res = await axios.get(searchUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const match = res.data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
    if (match) {
      const data = JSON.parse(match[1]);
      const results = data.loaders?.searchPage?.results || [];
      console.log(`Found ${results.length} results:`);
      results.forEach((r, i) => {
        console.log(`  Result #${i + 1}: ID=${r.id} | Name="${r.name}" | Type=${r.type} | ModelType=${r.model_type}`);
      });
    } else {
      console.log("bootstrapData not found");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function run() {
  await testSearch("Loki");
  await testSearch("Loki s01e01");
  await testSearch("Loki الموسم الاول الحلقة 1");
}

run();
