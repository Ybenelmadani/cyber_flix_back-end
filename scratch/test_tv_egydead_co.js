const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const targetUrl = 'https://tv.egydead.co/?s=House%20of%20the%20Dragon';
  const { data } = await axios.get(targetUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36' }
  });
  const $ = cheerio.load(data);
  let hasItems = false;
  $("li.movieItem a").each((i, el) => {
    hasItems = true;
    console.log($(el).attr('href'), $(el).find(".BottomTitle").text().trim());
  });
  console.log('Has items:', hasItems);
}
test();
