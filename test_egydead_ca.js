const axios = require('axios');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function testSearch() {
  try {
    const searchUrl = `https://egydead.ca/search/Deadpool/`;
    console.log(`Searching: ${searchUrl}`);
    
    const { data: searchHtml } = await axios.get(searchUrl, {
      headers: { 
        "User-Agent": USER_AGENT,
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    console.log("Body length:", searchHtml.length);
    
    // Find all occurrences of 'deadpool'
    let index = searchHtml.toLowerCase().indexOf('deadpool');
    let occurrences = 0;
    while (index !== -1) {
      occurrences++;
      console.log(`\nOccurrence #${occurrences} at index ${index}:`);
      console.log(searchHtml.substring(index - 50, index + 300));
      index = searchHtml.toLowerCase().indexOf('deadpool', index + 1);
      if (occurrences > 5) break;
    }
    console.log(`Total occurrences: ${occurrences}`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testSearch();
