const fs = require('fs');

try {
  const html = fs.readFileSync('probing_success.html', 'utf8');
  
  // Look for any string that looks like a relative or absolute API url
  const apiMatches = html.match(/(?:'|")(\/(?:api|ajax)\/[^'"]+)(?:'|")/g);
  if (apiMatches) {
      console.log("Found API endpoints:");
      console.log([...new Set(apiMatches)]);
  } else {
      console.log("No API endpoints found.");
  }
  
  // Look for video hosts
  const videoMatches = html.match(/(?:'|")(https?:\/\/[^'"]*(?:vid|embed|iframe|watch)[^'"]*)(?:'|")/ig);
  if (videoMatches) {
      console.log("\nFound potential video URLs:");
      console.log([...new Set(videoMatches)]);
  } else {
      console.log("No video URLs found.");
  }

} catch(err) {
  console.error(err);
}
