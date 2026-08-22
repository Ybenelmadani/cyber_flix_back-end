const fs = require('fs');

try {
  const html = fs.readFileSync('probing_success.html', 'utf8');
  
  const match = html.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
  if (match) {
    const dataStr = match[1];
    const data = JSON.parse(dataStr);
    console.log("Bootstrap Data keys:", Object.keys(data));
    console.log("Loaders keys:", Object.keys(data.loaders || {}));
    
    if (data.loaders && data.loaders.titlePage) {
      const tp = data.loaders.titlePage;
      console.log("TitlePage keys:", Object.keys(tp));
      if (tp.title) {
        console.log("Title details:", {
          id: tp.title.id,
          name: tp.title.name,
          type: tp.title.type
        });
      }
      
      // Look for stream links or videos or watch links
      console.log("\nSearching recursively for video/stream links inside titlePage...");
      const results = [];
      function searchObj(obj, path = '') {
        if (!obj) return;
        if (typeof obj === 'string') {
          if (obj.startsWith('http') && (obj.includes('embed') || obj.includes('play') || obj.includes('watch') || obj.includes('link') || obj.includes('dood') || obj.includes('mixdrop') || obj.includes('voe') || obj.includes('stream') || obj.includes('cdn'))) {
            results.push({ path, value: obj });
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            searchObj(item, `${path}[${index}]`);
          });
        } else if (typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            searchObj(obj[key], `${path}.${key}`);
          }
        }
      }
      searchObj(tp, 'titlePage');
      console.log(`Found ${results.length} URL matches:`);
      results.forEach(r => {
        console.log(`  Path: ${r.path} -> ${r.value}`);
      });
    }
  } else {
    console.log("window.bootstrapData not found");
  }
} catch (err) {
  console.error("Error:", err);
}
