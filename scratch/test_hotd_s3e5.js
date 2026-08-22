// Test the new EgyDead scraper end-to-end
process.env.NODE_PATH = require('path').resolve('./node_modules');

const { getLinks } = require('../controllers/scraperController');

// Simulate express req/res for House of the Dragon S3E5
const req = {
  query: {
    title: 'House of the Dragon',
    year: '2022',
    mediaType: 'tv',
    season: '3',
    episode: '5',
    tmdbId: '94997'
  }
};

const res = {
  json: (data) => {
    console.log('=== RESPONSE ===');
    console.log('success:', data.success);
    console.log('debugCode:', data.debugCode);
    console.log('providers:', data.results?.length);
    data.results?.forEach(p => {
      console.log(`\nProvider: ${p.provider} — ${p.servers?.length} servers`);
      p.servers?.slice(0, 5).forEach(s => {
        console.log(`  [${s.quality}] ${s.name} (${s.provider}) => ${s.url?.slice(0, 70)}`);
      });
    });
  },
  status: (code) => ({ json: (d) => console.log('ERROR', code, d) })
};

console.log('Testing scraper with House of the Dragon S3E5...\n');
getLinks(req, res).then(() => {
  console.log('\nDone!');
}).catch(e => {
  console.error('Test error:', e.message);
});
