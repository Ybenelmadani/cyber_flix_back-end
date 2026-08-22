const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch_watch_house_boot.json', 'utf8'));
const title = data.loaders?.episodePage?.title;
if (title) {
  console.log("Keys of loaders.episodePage.title:", Object.keys(title));
  console.log("Title.links:", title.links);
  console.log("Title.videos count:", title.videos?.length);
  // print all top-level values that are arrays or objects
  for (const key of Object.keys(title)) {
    if (typeof title[key] === 'object' && title[key] !== null) {
      if (Array.isArray(title[key])) {
        console.log(`  - Array property: ${key} (length: ${title[key].length})`);
        if (key === 'links' || key === 'videos') {
          console.log(`    Values:`, JSON.stringify(title[key].slice(0, 3), null, 2));
        }
      } else {
        console.log(`  - Object property: ${key} (keys: ${Object.keys(title[key])})`);
      }
    } else {
      console.log(`  - Scalar property: ${key} = ${title[key]}`);
    }
  }
} else {
  console.log("loaders.episodePage.title is missing");
}
