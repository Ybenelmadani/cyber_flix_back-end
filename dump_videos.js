const fs = require('fs');

try {
  const html = fs.readFileSync('probing_success.html', 'utf8');
  const match = html.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
  if (match) {
    const data = JSON.parse(match[1]);
    const title = data.loaders.titlePage.title;
    console.log("Videos array:", JSON.stringify(title.videos, null, 2));
  } else {
    console.log("bootstrapData not found");
  }
} catch (err) {
  console.error("Error:", err);
}
