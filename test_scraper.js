const scraperController = require('./controllers/scraperController');

// Mock request and response
async function testMovie() {
  console.log('--- TESTING MOVIE: Deadpool 2016 ---');
  const req = {
    query: {
      title: 'Deadpool',
      year: '2016',
      mediaType: 'movie'
    }
  };
  const res = {
    status(code) {
      console.log('Status:', code);
      return this;
    },
    json(data) {
      console.log('Response JSON Success:', data.success);
      if (data.results) {
        data.results.forEach(r => {
          console.log(`Provider: ${r.provider}, Servers Count: ${r.servers?.length || 0}`);
          if (r.servers) {
            r.servers.slice(0, 3).forEach(s => {
              console.log(`  -> ${s.name}: ${s.url}`);
            });
          }
        });
      }
    }
  };

  await scraperController.getLinks(req, res);
}

async function testTV() {
  console.log('\n--- TESTING TV: Loki Season 1 Episode 1 ---');
  const req = {
    query: {
      title: 'Loki',
      mediaType: 'tv',
      season: '1',
      episode: '1'
    }
  };
  const res = {
    status(code) {
      console.log('Status:', code);
      return this;
    },
    json(data) {
      console.log('Response JSON Success:', data.success);
      if (data.results) {
        data.results.forEach(r => {
          console.log(`Provider: ${r.provider}, Servers Count: ${r.servers?.length || 0}`);
          if (r.servers) {
            r.servers.slice(0, 3).forEach(s => {
              console.log(`  -> ${s.name}: ${s.url}`);
            });
          }
        });
      }
    }
  };

  await scraperController.getLinks(req, res);
}

async function run() {
  await testMovie();
  await testTV();
}
run();
