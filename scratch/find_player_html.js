const fs = require('fs');
const html = fs.readFileSync('./scratch/episode_s01e01.html', 'utf8');

// Print 3000 chars starting from serversList index to find the actual HTML ul element
const idx = html.indexOf('serversList');
// Find the NEXT occurrence after the JS context
let searchFrom = idx + 200;
let nextIdx = html.indexOf('serversList', searchFrom);
while (nextIdx !== -1) {
  const context = html.slice(nextIdx, nextIdx + 1500).replace(/\s+/g, ' ');
  if (context.includes('<ul') || context.includes('<li') || context.includes('data-')) {
    console.log(`Found at ${nextIdx}: ${context}`);
    break;
  }
  nextIdx = html.indexOf('serversList', nextIdx + 1);
}

// Also grep for the watchAreaMaster div
console.log('\n=== watchAreaMaster search ===');
let wIdx = html.indexOf('watchAreaMaster');
while (wIdx !== -1) {
  const context = html.slice(wIdx, wIdx + 800).replace(/\s+/g, ' ');
  console.log(`At ${wIdx}: ${context}`);
  console.log('---');
  wIdx = html.indexOf('watchAreaMaster', wIdx + 1);
}

// Print the section around index 56624 (serversList in JS) + 1000 chars to find the HTML
const jsSL = html.indexOf('$(".serversList li:first-child")');
console.log('\n=== After JS serversList ===');
// Now find the next HTML ul or section
const afterJS = html.indexOf('</script>', jsSL);
console.log('After script close (chars from script end):', html.slice(afterJS, afterJS + 3000).replace(/\s+/g, ' '));
