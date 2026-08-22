const fs = require('fs');

try {
  const html = fs.readFileSync('deadpool_search.html', 'utf8');
  
  // Find all matches of "/titles/" or "href" that contains Deadpool
  const match = html.match(/href="([^"]*?596[^"]*?)"/);
  if (match) {
     console.log("Found link:", match[1]);
  } else {
     console.log("No link with 596 found in hrefs. Searching for '/title':");
     const titleMatch = html.match(/href="([^"]*?title[^"]*?)"/);
     if (titleMatch) {
         console.log("Found title link:", titleMatch[1]);
     } else {
         console.log("No title link found. Searching for 'egydead.ca/title':");
         const anyLink = html.match(/https:\/\/egydead\.ca\/title[^\s"']+/);
         if (anyLink) console.log("Any link:", anyLink[0]);
     }
  }

  // Also let's check window.bootstrapData for URLs
  const bootstrapMatch = html.match(/window\.bootstrapData\s*=\s*({.*?});\s*<\/script>/s);
  if (bootstrapMatch) {
      const data = JSON.parse(bootstrapMatch[1]);
      if (data.page && data.page.props && data.page.props.titles) {
         const firstTitle = data.page.props.titles.data[0];
         console.log("Title data from bootstrapData in search page:");
         console.log("ID:", firstTitle.id);
         console.log("Name:", firstTitle.name);
         // Any link to the title?
         // Check if there is a slug or url
         console.log("Keys:", Object.keys(firstTitle));
      }
  }

} catch(err) {
  console.error(err);
}
