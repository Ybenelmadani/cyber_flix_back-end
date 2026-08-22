const { getLinks } = require('./controllers/scraperController');

const req = {
  query: { title: 'Deadpool', mediaType: 'movie' }
};

const res = {
  status: (code) => ({
    json: (data) => console.log(`Status ${code}:`, JSON.stringify(data, null, 2))
  }),
  json: (data) => console.log('JSON:', JSON.stringify(data, null, 2))
};

getLinks(req, res).catch(console.error);
