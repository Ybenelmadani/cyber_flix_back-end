const axios = require('axios');
axios.get('https://egydead.ca/search/Inception/', { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(res => {
  const match = res.data.match(/href="([^"]+titles\/[^"]+)"/);
  if(match){
    let url = match[1];
    if (url.endsWith('/')) url = url.slice(0, -1);
    axios.get(url+'/watch').then(res2 => {
      const m2 = res2.data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
      if(m2){
        const data = JSON.parse(m2[1]);
        const titleObj = data?.loaders?.titlePage?.title;
        console.log('Videos:', titleObj?.videos?.length);
        if (titleObj?.downloads) {
          console.log('Downloads array found with length:', titleObj.downloads.length);
          console.log('First download item:', titleObj.downloads[0]);
        } else {
          console.log('No downloads array found on EgyDead');
        }
      }
    });
  }
});
