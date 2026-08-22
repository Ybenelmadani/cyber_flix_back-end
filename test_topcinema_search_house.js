const axios = require('axios');
axios.get('https://web.topcinemaa.com/?s=House').then(res => {
  const matches = [...res.data.matchAll(/<div class="post-title">.*?<a href="([^"]+)".*?>(.*?)<\/a>/gs)];
  matches.forEach(m => console.log(m[2].trim()));
}).catch(e => console.log(e.message));
