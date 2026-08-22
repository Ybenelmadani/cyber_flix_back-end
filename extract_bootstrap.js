const fs = require('fs');

try {
  const html = fs.readFileSync('deadpool_search.html', 'utf8');
  
  // Find window.bootstrapData = ...
  const match = html.match(/window\.bootstrapData\s*=\s*({.*?});\s*<\/script>/s);
  if (!match) {
    console.log("window.bootstrapData not found using simple regex");
    // Try broader regex
    const match2 = html.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
    if (match2) {
      console.log("Found match2!");
      const dataStr = match2[1];
      console.log("Length of bootstrap data string:", dataStr.length);
      const data = JSON.parse(dataStr);
      inspectData(data);
    } else {
      console.log("Still not found");
    }
  } else {
    console.log("Found match!");
    const dataStr = match[1];
    console.log("Length of bootstrap data string:", dataStr.length);
    const data = JSON.parse(dataStr);
    inspectData(data);
  }
} catch (err) {
  console.error("Error:", err);
}

function inspectData(data) {
  console.log("Bootstrap Data keys:", Object.keys(data));
  if (data.loaders) {
    console.log("Loaders keys:", Object.keys(data.loaders));
    for (const key of Object.keys(data.loaders)) {
      console.log(`Loader for ${key}:`, typeof data.loaders[key], Array.isArray(data.loaders[key]) ? `Array length: ${data.loaders[key].length}` : 'Object');
      if (key === 'searchResponse' || key.toLowerCase().includes('search') || key.toLowerCase().includes('title') || key.toLowerCase().includes('results')) {
        console.log(`Dumping loader.${key}:`, JSON.stringify(data.loaders[key]).substring(0, 1000));
      }
    }
  }
  
  // Let's search inside the bootstrap data recursively for 'Deadpool'
  console.log("\nSearching recursively for 'Deadpool' inside bootstrapData...");
  const paths = [];
  function searchObj(obj, path = '') {
    if (!obj) return;
    if (typeof obj === 'string') {
      if (obj.toLowerCase().includes('deadpool')) {
        paths.push({ path, value: obj });
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
  searchObj(data, 'root');
  console.log(`Found ${paths.length} occurrences:`);
  paths.slice(0, 10).forEach(p => {
    console.log(`  Path: ${p.path} -> ${p.value.substring(0, 100)}`);
  });
}
