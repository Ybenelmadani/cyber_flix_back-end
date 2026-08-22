const fs = require('fs');

try {
  const html = fs.readFileSync('probing_success.html', 'utf8');
  console.log("File length:", html.length);
  
  const keywords = ['voe', 'dood', 'mixdrop', 'earnvids', 'streamix', 'byse', 'streamhg', 'streamruby', 'uptobox', '1fichier', 'mega.nz'];
  
  keywords.forEach(keyword => {
    let index = html.toLowerCase().indexOf(keyword);
    let count = 0;
    while (index !== -1) {
      count++;
      if (count === 1) {
        console.log(`\n--- First match for '${keyword}' at index ${index} ---`);
        console.log(html.substring(index - 100, index + 300));
      }
      index = html.toLowerCase().indexOf(keyword, index + 1);
    }
    console.log(`Keyword '${keyword}': found ${count} occurrences.`);
  });
  
} catch (err) {
  console.error("Error:", err);
}
