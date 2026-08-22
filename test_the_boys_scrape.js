const scraperController = require('./controllers/scraperController');

async function test() {
  const req = {
    query: {
      title: 'The Boys',
      year: '2019',
      mediaType: 'tv',
      season: '1',
      episode: '1'
    }
  };
  
  const res = {
    status(code) {
      console.log('Status Code:', code);
      return this;
    },
    json(data) {
      console.log('Response JSON:', JSON.stringify(data, null, 2));
    }
  };
  
  await scraperController.getLinks(req, res);
}

test();
