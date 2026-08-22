const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
  console.log('🚀 Lancement du navigateur pour résoudre Cloudflare...');
  console.log('ATTENTION: Une fenêtre va s\'ouvrir. Si tu vois la vérification Cloudflare, CLIQUE DESSUS !');
  
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './puppeteer_data', // C'est ici que la magie opère : ça sauvegarde la session !
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
    ],
  });

  const page = await browser.newPage();
  
  // Fake headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  });

  const url = 'https://tv10.egydead.live';
  console.log(`Navigation vers ${url}...`);
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  
  console.log('--------------------------------------------------');
  console.log('⏳ Tu as 60 secondes pour cocher la case Cloudflare si elle apparaît.');
  console.log('--------------------------------------------------');
  
  // Attendre 60 secondes pour laisser le temps à l'utilisateur de cliquer et à la page de charger
  await new Promise(r => setTimeout(r, 60000));
  
  const title = await page.title();
  console.log('Titre de la page actuelle :', title);
  
  if (title.includes('لحظة') || title.includes('Just a moment') || title.includes('Cloudflare')) {
    console.log('❌ Échec : Tu es toujours bloqué par Cloudflare.');
  } else {
    console.log('✅ SUCCÈS ! Cloudflare est passé. Le cookie est sauvegardé de façon permanente !');
  }

  console.log('Fermeture du navigateur...');
  await browser.close();
  console.log('Terminé. Tu peux maintenant relancer ton robot PM2 !');
})();
