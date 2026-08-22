const fs = require('fs');

try {
  const html = fs.readFileSync('probing_success.html', 'utf8');
  const searchStr = '"name":"HD - \\u0645\\u062a\\u0631\\u062c\\u0645 Deadpool 2016 \\u0641\\u064a\\u0644\\u0645"';
  const index = html.indexOf(searchStr);
  
  if (index !== -1) {
    console.log("Found match at index:", index);
    
    // Find the nearest opening script or tag before it
    const preText = html.substring(Math.max(0, index - 500), index);
    console.log("--- 500 chars before ---");
    console.log(preText);
    
    const postText = html.substring(index, index + 500);
    console.log("--- 500 chars after ---");
    console.log(postText);
    
  } else {
    console.log("Search string not found.");
  }
} catch(err) {
  console.error(err);
}
