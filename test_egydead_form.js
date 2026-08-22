const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function testForm() {
  try {
    const url = 'https://egydead.ca/';
    console.log(`Fetching: ${url}`);
    
    const { data } = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT }
    });

    const $ = cheerio.load(data);
    
    // Find all forms
    $('form').each((i, el) => {
      console.log(`\nForm #${i}:`);
      console.log(`Action: ${$(el).attr('action')}`);
      console.log(`Method: ${$(el).attr('method')}`);
      
      $(el).find('input, button, select').each((j, input) => {
        console.log(`  Input #${j}: name="${$(input).attr('name')}" type="${$(input).attr('type')}" value="${$(input).attr('value')}"`);
      });
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testForm();
