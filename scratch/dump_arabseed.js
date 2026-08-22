const axios = require('axios');
async function dumpArabseed() {
    const { data } = await axios.get('https://arabseed.center/find/?find=Deadpool', { headers: {'User-Agent':'Mozilla/5.0'} });
    require('fs').writeFileSync('scratch/arabseed.html', data);
    console.log("Saved arabseed.html");
}
dumpArabseed();
