const fs = require('fs');

const html = fs.readFileSync('scratch_watch_house.html', 'utf8');
const match = html.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
if (match) {
  try {
    const data = JSON.parse(match[1]);
    fs.writeFileSync('scratch_watch_house_boot.json', JSON.stringify(data, null, 2));
    console.log("Successfully wrote scratch_watch_house_boot.json");
    console.log("Keys of bootstrapData:", Object.keys(data));
    if (data.loaders) {
      console.log("Keys of bootstrapData.loaders:", Object.keys(data.loaders));
      if (data.loaders.episodePage) {
        console.log("Keys of bootstrapData.loaders.episodePage:", Object.keys(data.loaders.episodePage));
        const ep = data.loaders.episodePage.episode;
        if (ep) {
          console.log("Keys of episode object:", Object.keys(ep));
          console.log("Episode links (if any):", ep.links);
          console.log("Episode season:", ep.season);
        }
      }
    }
  } catch (e) {
    console.error("Failed parsing/writing JSON:", e.message);
  }
} else {
  console.log("bootstrapData not found in HTML");
}
