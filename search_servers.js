const fs = require('fs');

try {
  const html = fs.readFileSync('probing_success.html', 'utf8');
  
  // Find "servers"
  const serverIndex = html.indexOf('"servers"');
  if (serverIndex !== -1) {
    console.log("Found 'servers':");
    console.log(html.substring(serverIndex, serverIndex + 500));
  } else {
    console.log("No 'servers' found");
  }
  
  // Find "videos"
  const videosIndex = html.indexOf('"videos"');
  if (videosIndex !== -1) {
    console.log("\nFound 'videos':");
    console.log(html.substring(videosIndex, videosIndex + 500));
  } else {
    console.log("No 'videos' found");
  }
  
  // Search for an iframe
  const iframeIndex = html.indexOf('<iframe');
  if (iframeIndex !== -1) {
    console.log("\nFound '<iframe':");
    console.log(html.substring(iframeIndex, iframeIndex + 500));
  } else {
    console.log("No '<iframe' found");
  }

} catch(err) {
  console.error(err);
}
