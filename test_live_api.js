const axios = require('axios');

async function testLive() {
  const url = 'https://cyber-flix-back-end.vercel.app/api/scraper/links?title=Deadpool&year=2016&mediaType=movie';
  try {
    console.log(`Querying live API: ${url} ...`);
    const res = await axios.get(url, {
      timeout: 15000
    });
    console.log("SUCCESS! Status:", res.status);
    console.log("Headers:", res.headers);
    console.log("Response JSON:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("FAILED!");
    console.error("Message:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    }
  }
}

testLive();
