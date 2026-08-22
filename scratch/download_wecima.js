const axios = require('axios');
axios.get('https://wecima.show/search/Deadpool/', {headers:{'User-Agent':'Mozilla/5.0'}})
.then(r => {
    require('fs').writeFileSync('scratch/wecima.html', r.data);
    console.log('Saved wecima.html. Length:', r.data.length);
}).catch(e => console.error(e.message));
