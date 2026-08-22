const fs = require('fs');

try {
  const html = fs.readFileSync('full_movie_page.html', 'utf8');
  
  const match = html.match(/window\.bootstrapData\s*=\s*({.*?});\s*<\/script>/s);
  if (!match) {
    console.log("No bootstrap data found.");
    process.exit(1);
  }
  
  const data = JSON.parse(match[1]);
  
  console.log("Keys in bootstrapData:");
  console.log(Object.keys(data));
  
  if (data.page && data.page.props) {
    if (data.page.props.title) {
        console.log("\nTitle data found:");
        const title = data.page.props.title;
        console.log("ID:", title.id);
        console.log("Name:", title.name);
        
        if (title.videos && title.videos.length > 0) {
            console.log(`Found ${title.videos.length} videos`);
            title.videos.forEach((v, i) => {
                console.log(`Video ${i+1}: ${v.name} | ${v.category} | ${v.url}`);
            });
        } else {
            console.log("No videos array on title.");
        }
    } else {
        console.log("No title prop found in page.props");
        // Print all props
        console.log("Props keys:", Object.keys(data.page.props));
        
        // Sometimes data might be in title object somewhere else
        // Let's dump everything that has 'video'
        const propsStr = JSON.stringify(data.page.props);
        const vidMatches = propsStr.match(/"[^"]*vid[^"]*":"[^"]*"/g);
        if (vidMatches) {
            console.log("Matches with 'vid':", vidMatches.slice(0, 10));
        }
    }
  }

} catch(err) {
  console.error("Error:", err.message);
}
