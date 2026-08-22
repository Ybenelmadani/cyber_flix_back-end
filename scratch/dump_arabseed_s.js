const axios = require('axios');
async function testArabSeed() {
    const searchUrl = 'https://arabseed.center/?s=Deadpool';
    const { data } = await axios.get(searchUrl, { headers: {'User-Agent':'Mozilla/5.0'} });
    require('fs').writeFileSync('scratch/arabseed_s.html', data);
}
testArabSeed();
