const axios = require('axios');
const fs = require('fs');

async function dumpNew() {
  try {
    const res = await axios.get("https://egydead.cloud/?s=House%20of%20the%20Dragon", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
      }
    });
    fs.writeFileSync('scratch/cloud_dump.html', res.data);
    console.log("Dumped egydead.cloud HTML");
  } catch(e) {
    console.error("Error:", e.message);
  }
}

dumpNew();
