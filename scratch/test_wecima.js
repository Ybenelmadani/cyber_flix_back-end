const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://wecima.show/search/Deadpool/', {headers:{'User-Agent':'Mozilla/5.0'}})
.then(r => {
    const $ = cheerio.load(r.data);
    $('.GridItem a').each((i, el) => console.log($(el).attr('href')));
}).catch(e => console.error(e.message));
