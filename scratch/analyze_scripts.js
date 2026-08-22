const fs = require('fs');
const html = fs.readFileSync('./scratch/episode_s01e01.html', 'utf8');

// Find all inline scripts
const scripts = [];
const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let m;
while ((m = scriptRe.exec(html)) !== null) {
  scripts.push(m[1]);
}

console.log('Total scripts found:', scripts.length);

scripts.forEach((content, i) => {
  if (content.length > 3000) {
    console.log(`\n=== Script ${i} (length=${content.length}) ===`);
    // Extract URLs
    const urlRe = /https?:\/\/[^\s"'<>\)]+/g;
    const urls = [];
    let u;
    while ((u = urlRe.exec(content)) !== null) {
      urls.push(u[0]);
    }
    console.log('URLs found:', urls.slice(0, 20));
    console.log('First 500 chars:', content.slice(0, 500).replace(/\s+/g, ' '));
  }
});

// Also look for data-link="..." in HTML
console.log('\n=== HTML data-link search ===');
const dlRe = /data-link=["']([^"']+)["']/g;
let dl;
while ((dl = dlRe.exec(html)) !== null) {
  console.log('data-link:', dl[1].slice(0, 120));
}

// Look for ul.serversList in HTML
console.log('\n=== HTML serversList search ===');
const slIdx = html.indexOf('<ul class="serversList"');
if (slIdx !== -1) {
  console.log('Found serversList at:', slIdx);
  console.log(html.slice(slIdx, slIdx + 1000).replace(/\s+/g, ' '));
} else {
  // Try other patterns
  console.log('No exact match, searching...');
  const alt = html.indexOf('serversList');
  console.log('serversList found at index:', alt);
  if (alt !== -1) {
    console.log(html.slice(Math.max(0, alt - 200), alt + 1000).replace(/\s+/g, ' '));
  }
}
