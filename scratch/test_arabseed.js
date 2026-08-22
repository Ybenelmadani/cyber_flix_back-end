const axios = require('axios');
const cheerio = require('cheerio');

async function testArabSeed() {
  try {
    const searchUrl = 'https://arabseed.center/find/?find=Deadpool';
    console.log("Fetching", searchUrl);
    const { data } = await axios.get(searchUrl, { headers: {'User-Agent':'Mozilla/5.0'} });
    const $ = cheerio.load(data);
    const results = [];
    $('.MovieBlock a, a').each((i, el) => {
      const href = $(el).attr('href') || '';
      if(href.toLowerCase().includes('deadpool')) {
        results.push(href);
      }
    });
    console.log("Found", results.length, "results");
    if(results.length > 0) {
      console.log("First result:", results[0]);
      const res = await axios.get(results[0], { headers: {'User-Agent':'Mozilla/5.0'} });
      const $page = cheerio.load(res.data);
      let watchUrl = $page('.watchBTn').attr('href') || $page('a.watch-now').attr('href') || $page('a:contains("مشاهدة")').attr('href');
      console.log("Watch URL:", watchUrl);
      if (watchUrl) {
        const watchRes = await axios.get(watchUrl, { headers: {'User-Agent':'Mozilla/5.0'} });
        const $watch = cheerio.load(watchRes.data);
        const servers = [];
        $watch('ul.servers-list li, .serversList li, li[data-url]').each((i,el) => {
            servers.push($watch(el).attr('data-url') || $watch(el).attr('data-link'));
        });
        console.log("Servers:", servers);
      }
    }
  } catch(e) {
    console.error(e.message);
  }
}
testArabSeed();
