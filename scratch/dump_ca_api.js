const axios = require('axios');
const fs = require('fs');

async function dumpApi() {
  const url = `https://egydead.ca/api/v1/search?query=House%20of%20the%20Dragon`;
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });
    fs.writeFileSync('scratch/ca_search.json', JSON.stringify(res.data, null, 2));
    console.log("Dumped JSON");
  } catch(e) {
    console.log("Error:", e.message);
  }
}

dumpApi();
