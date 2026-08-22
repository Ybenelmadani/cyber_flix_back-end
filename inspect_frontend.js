const fs = require('fs');
const path = require('path');

const movieDetailPath = 'c:/Users/pc/Desktop/the Movies/movies/src/components/MovieDetail.js';
const episodeDetailPath = 'c:/Users/pc/Desktop/the Movies/movies/src/components/EpisodeDetail.js';

function searchInFile(filePath, term) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const lines = code.split('\n');
    console.log(`\n--- Searching for '${term}' in ${path.basename(filePath)} ---`);
    lines.forEach((line, index) => {
      if (line.includes(term)) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
      }
    });
  } catch (err) {
    console.error(err.message);
  }
}

searchInFile(movieDetailPath, 'const [servers');
searchInFile(movieDetailPath, 'setServers');
searchInFile(movieDetailPath, 'fetchLinks');
searchInFile(movieDetailPath, 'scraper');

searchInFile(episodeDetailPath, 'const [servers');
searchInFile(episodeDetailPath, 'setServers');
searchInFile(episodeDetailPath, 'fetchLinks');
searchInFile(episodeDetailPath, 'scraper');
