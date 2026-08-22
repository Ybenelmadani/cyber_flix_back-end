const fs = require('fs');

try {
  const html = fs.readFileSync('full_movie_page.html', 'utf8');
  
  // Find where "videos" or "titles" are located
  const videosIndex = html.indexOf('"videos"');
  if (videosIndex !== -1) {
    const start = Math.max(0, videosIndex - 200);
    const end = Math.min(html.length, videosIndex + 1000);
    console.log("Context around 'videos':");
    console.log(html.substring(start, end));
  } else {
    console.log("No 'videos' found");
  }

} catch(err) {
  console.error(err);
}
