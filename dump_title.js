const fs = require('fs');

try {
  const html = fs.readFileSync('probing_success.html', 'utf8');
  const match = html.match(/window\.bootstrapData\s*=\s*({.*?});\s*<\/script>/s);
  if (!match) {
    console.log("No bootstrap data found.");
    process.exit(1);
  }
  
  const data = JSON.parse(match[1]);
  if (data.page && data.page.props && data.page.props.title) {
    console.log(JSON.stringify(data.page.props.title, null, 2));
  } else {
    console.log("No title prop in bootstrapData.page.props.");
    // Log what props are there
    if (data.page && data.page.props) {
        console.log("Props available:", Object.keys(data.page.props));
        if (data.page.props.video) {
             console.log("Video prop:", data.page.props.video);
        }
    }
  }
} catch(err) {
  console.error(err);
}
