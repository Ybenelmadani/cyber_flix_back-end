const fs = require('fs');

try {
  const html = fs.readFileSync('probing_success.html', 'utf8');
  const query = "Deadpool";
  
  let index = html.indexOf(query);
  while (index !== -1) {
    const start = Math.max(0, index - 50);
    const end = Math.min(html.length, index + query.length + 50);
    console.log(`\nMatch at index ${index}:`);
    console.log(html.substring(start, end));
    
    index = html.indexOf(query, index + 1);
  }
} catch(err) {
  console.error(err);
}
