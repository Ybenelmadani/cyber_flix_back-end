const axios = require('axios');
axios.get('https://web.topcinemaa.com/?s=' + encodeURIComponent('آل التنين')).then(res => {
  const match = res.data.match(/<div class="post-title">.*?<a href="([^"]+)".*?>(.*?)<\/a>/s);
  if(match) console.log(match[1], match[2].trim());
  else console.log('No matches');
}).catch(e => console.log(e.message));
