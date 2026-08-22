const axios = require('axios');
const fs = require('fs');

async function dumpCa() {
  const url = "https://egydead.ca/?s=House%20of%20the%20Dragon";
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
      }
    });
    fs.writeFileSync('scratch/ca_dump.html', res.data);
    console.log("Dumped CA HTML");
  } catch(e) {
    console.error("Error:", e.message);
  }
}

dumpCa();
