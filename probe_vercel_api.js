const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function probeVercelApi() {
  const url = 'https://cyber-flix-mu.vercel.app/';
  try {
    console.log(`Fetching frontend homepage: ${url} ...`);
    const { data: html } = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const $ = cheerio.load(html);
    const scripts = [];
    $('script').each((_, el) => {
      const src = $(el).attr('src');
      if (src && src.includes('static/js/main.')) {
        scripts.push(src);
      }
    });
    
    console.log("Main JS scripts found:", scripts);
    
    for (const src of scripts) {
      const scriptUrl = src.startsWith('http') ? src : `${url}${src.replace(/^\/+/, '')}`;
      console.log(`Fetching script: ${scriptUrl} ...`);
      const { data: js } = await axios.get(scriptUrl, {
        headers: { "User-Agent": USER_AGENT }
      });
      
      // Let's find any occurrences of URL or .vercel.app
      console.log("Searching JS for backend API URL patterns...");
      const match = js.match(/https?:\/\/[a-zA-Z0-9.-]+\.vercel\.app/g);
      if (match) {
        console.log("Found Vercel app URLs in JS:", [...new Set(match)]);
      }
      
      const matchLocal = js.match(/localhost:\d+/g);
      if (matchLocal) {
        console.log("Found localhost URLs in JS:", [...new Set(matchLocal)]);
      }
      
      const renderMatch = js.match(/https?:\/\/[a-zA-Z0-9.-]+\.onrender\.com/g);
      if (renderMatch) {
        console.log("Found Render URLs in JS:", [...new Set(renderMatch)]);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

probeVercelApi();
