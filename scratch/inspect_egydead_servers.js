const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('scratch_egydead_live.html', 'utf8');
const $ = cheerio.load(html);

console.log("=== Servers List (.serversList li) ===");
$('.serversList li').each((i, el) => {
  const $el = $(el);
  const text = $el.text().trim();
  const link = $el.attr('data-link') || $el.attr('data-src') || $el.attr('href');
  console.log(`Server #${i+1}: Text="${text}" | data-link="${$el.attr('data-link')}" | attributes=${JSON.stringify($el.attr())}`);
});

console.log("\n=== Other potential server/download links ===");
$('[class*="server"], [class*="download"], [id*="server"], [id*="download"]').each((i, el) => {
  const $el = $(el);
  const tagName = el.tagName;
  const classes = $el.attr('class') || '';
  const id = $el.attr('id') || '';
  const text = $el.text().trim().replace(/\s+/g, ' ').substring(0, 50);
  console.log(`Tag: <${tagName}> | Class="${classes}" | Id="${id}" | Text="${text}"`);
  if (tagName === 'a') {
    console.log(`  href: ${$el.attr('href')}`);
  }
});
