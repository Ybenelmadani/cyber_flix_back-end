const fs = require('fs');

try {
  const html = fs.readFileSync('probing_success.html', 'utf8');
  const match = html.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
  if (match) {
    const data = JSON.parse(match[1]);
    const tp = data.loaders.titlePage;
    
    // Create a copy and clean up large arrays
    const cleanTp = JSON.parse(JSON.stringify(tp));
    if (cleanTp.credits) delete cleanTp.credits;
    if (cleanTp.title && cleanTp.title.images) delete cleanTp.title.images;
    if (cleanTp.title && cleanTp.title.genres) delete cleanTp.title.genres;
    
    console.log("Cleaned TitlePage JSON:");
    console.log(JSON.stringify(cleanTp, null, 2));
  } else {
    console.log("bootstrapData not found");
  }
} catch (err) {
  console.error("Error:", err);
}
