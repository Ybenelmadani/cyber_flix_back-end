const fs = require('fs');

try {
  const html = fs.readFileSync('probing_success.html', 'utf8');
  
  const match = html.match(/window\.bootstrapData\s*=\s*({.*?});\s*<\/script>/s);
  if (!match) {
    console.log("No bootstrap data found.");
    process.exit(1);
  }
  
  const data = JSON.parse(match[1]);
  
  console.log("Keys in bootstrapData:");
  console.log(Object.keys(data));
  
  if (data.title) {
    console.log("\nTitle details:");
    console.log("ID:", data.title.id);
    console.log("Name:", data.title.name);
    console.log("Type:", data.title.type);
    
    // Check for videos/servers
    if (data.title.videos) {
      console.log("\nVideos attached to title:", data.title.videos.length);
      data.title.videos.forEach((v, i) => {
        console.log(`Video ${i+1}:`, v.name, v.category, v.url);
      });
    }
  }

  // Also log props to see if something like 'servers' or 'links' is passed
  if (data.page && data.page.props) {
    console.log("\nPage Props:");
    console.log(Object.keys(data.page.props));
    
    if (data.page.props.servers) {
        console.log("\nServers:");
        console.log(JSON.stringify(data.page.props.servers, null, 2).slice(0, 500) + '...');
    }
    
    if (data.page.props.title) {
        console.log("\nPage Prop Title Videos:");
        const videos = data.page.props.title.videos;
        if (videos) {
            console.log(JSON.stringify(videos, null, 2).slice(0, 500) + '...');
        }
    }
  }

} catch(err) {
  console.error("Error:", err.message);
}
