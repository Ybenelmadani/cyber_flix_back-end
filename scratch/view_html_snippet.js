const fs = require('fs');

const html = fs.readFileSync('scratch_egydead_live.html', 'utf8');
const lines = html.split('\n');
const start = Math.max(0, 830);
const end = Math.min(lines.length, 890);

for (let i = start; i < end; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
