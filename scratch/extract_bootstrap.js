const fs = require('fs');
const html = fs.readFileSync('scratch/ca_search.html', 'utf-8');
const match = html.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
if (match) {
    try {
        const data = JSON.parse(match[1]);
        fs.writeFileSync('scratch/ca_search_data.json', JSON.stringify(data, null, 2));
        console.log('Saved data');
    } catch(e) {
        console.log('JSON parse error', e.message);
    }
} else {
    console.log('No bootstrapData found');
}
