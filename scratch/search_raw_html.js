const fs = require('fs');

const html = fs.readFileSync('scratch_egydead_live.html', 'utf8');
const lines = html.split('\n');

const searchTerms = ['vibuxer', 'serversList', 'egybestvid', 'dood', 'watchAreaMaster', 'holder', 'download', 'episode', 'series', 'title', 'season'];

searchTerms.forEach(term => {
  console.log(`=== Searching for "${term}" ===`);
  let count = 0;
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(term.toLowerCase())) {
      count++;
      if (count <= 10) {
        console.log(`Line ${index + 1}: ${line.trim().substring(0, 200)}`);
      }
    }
  });
  console.log(`Total matches for "${term}": ${count}\n`);
});
