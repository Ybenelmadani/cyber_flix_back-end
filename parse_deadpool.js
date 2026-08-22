const fs = require('fs');
const cheerio = require('cheerio');

try {
  const html = fs.readFileSync('deadpool_search.html', 'utf8');
  console.log("File length:", html.length);
  
  const $ = cheerio.load(html);
  
  // Let's see how many links exist in general
  const allLinks = $('a');
  console.log("Total general <a> tags:", allLinks.length);
  
  // Let's print some tags in the body
  console.log("Tags under body:");
  $('body').children().each((i, el) => {
    console.log(`  Child #${i}: tag="${el.tagName}" class="${$(el).attr('class') || ''}" id="${$(el).attr('id') || ''}"`);
  });
  
  // Let's check if the word "Deadpool" appears in any text
  const deadpoolMatches = [];
  $('*').each((i, el) => {
    const text = $(el).text().trim();
    if (text.includes("Deadpool") && $(el).children().length === 0) {
      deadpoolMatches.push({
        tag: el.tagName,
        class: $(el).attr('class'),
        id: $(el).attr('id'),
        text: text.substring(0, 100)
      });
    }
  });
  
  console.log("\nMatches for 'Deadpool' in leaf elements:", deadpoolMatches.slice(0, 10));
  
} catch (err) {
  console.error("Error:", err);
}
