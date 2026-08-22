const axios = require('axios');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function testItem() {
  const query = "The Boys";
  const searchUrl = `https://egydead.ca/search/${encodeURIComponent(query)}/`;
  try {
    const res = await axios.get(searchUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const match = res.data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
    if (match) {
      const data = JSON.parse(match[1]);
      const results = data.loaders?.searchPage?.results || [];
      const item = results[0];
      console.log("Full Item JSON:", JSON.stringify(item, null, 2));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testItem();
