const { getLinks } = require('../controllers/scraperController');

const req = {
  query: {
    title: 'Mouse',
    year: '2021',
    mediaType: 'tv',
    season: '1',
    episode: '1',
    tmdbId: '117378'
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
