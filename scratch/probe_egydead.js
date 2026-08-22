const axios = require('axios');
async function test() {
    try {
        const res = await axios.get('https://egydead.ca/api/movies?search=Deadpool', {headers:{'User-Agent':'Mozilla/5.0'}});
        console.log("Status:", res.status);
        console.log("Data:", typeof res.data === 'object' ? Object.keys(res.data) : res.data.length);
    } catch(e) {
        console.log("Error:", e.message);
    }
}
test();
