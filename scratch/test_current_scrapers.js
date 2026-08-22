const { getLinks } = require('../controllers/scraperController');

const req = {
  query: {
    title: 'House of the Dragon',
    year: '',
    mediaType: 'tv',
    season: '1',
    episode: '1'
  }
};

const res = {
  json: (data) => console.log(JSON.stringify(data, null, 2)),
  status: (code) => {
    console.log("Status:", code);
    return { json: (data) => console.log(JSON.stringify(data, null, 2)) };
  }
};

getLinks(req, res).catch(console.error);
