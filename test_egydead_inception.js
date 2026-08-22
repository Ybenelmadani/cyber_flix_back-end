const axios = require('axios');
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

axios.get('https://egydead.ca/search/Inception/', { headers, timeout: 10000 }).then(res => {
  const m2 = res.data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
  if(m2){
    const data = JSON.parse(m2[1]);
    const items = data?.loaders?.searchPage?.results?.data || [];
    console.log('Search items found:', items.length);
    if(items.length > 0) {
      const bestItem = items[0];
      const watchUrl = `https://egydead.ca/titles/${bestItem.id}/watch`;
      console.log('Watch URL:', watchUrl);
      axios.get(watchUrl, { headers }).then(res2 => {
        const m3 = res2.data.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
        if(m3) {
          const wdata = JSON.parse(m3[1]);
          const t = wdata?.loaders?.titlePage?.title;
          console.log('Videos array:', t?.videos?.length);
          if(t?.downloads) {
             console.log('Downloads array:', t.downloads.length);
             console.log(t.downloads.slice(0, 2));
          } else {
             console.log('No downloads array in watch page');
          }
        }
      });
    }
  } else {
    console.log('No bootstrapData matched in search');
  }
}).catch(e => console.log('Error1:', e.message));
