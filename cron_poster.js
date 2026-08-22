require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'f30db81270f4acbc6afa82d019c7406b'; // Clé TMDB par défaut du .env
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID; // À rajouter dans le .env
const SITE_URL = process.env.FRONTEND_URL || 'https://cyber-flix-mu.vercel.app';

// Mémoire des IDs déjà publiés pour éviter les doublons (pour un vrai site, on utiliserait la base de données MongoDB)
const publishedMovieIds = new Set();

/**
 * Récupère les films "Trending" du jour en Arabe
 */
async function getTrendingMovies() {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/day`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'ar-AR' // On récupère titre et description en arabe
      }
    });
    return response.data.results || [];
  } catch (error) {
    console.error('Erreur lors de la récupération TMDB:', error.message);
    return [];
  }
}

/**
 * Publie le film sur la page Facebook
 */
async function postToFacebook(movie) {
  if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
    console.error("Erreur: PAGE_ACCESS_TOKEN ou FACEBOOK_PAGE_ID manquant dans le fichier .env");
    return false;
  }

  const title = movie.title || movie.original_title;
  const description = movie.overview ? movie.overview : 'شاهد الآن بأعلى جودة!';
  const posterUrl = `https://image.tmdb.org/t/p/w780${movie.poster_path}`;
  const movieLink = `${SITE_URL}/movie/${movie.id}`;

  const message = `🎬 فيلم جديد مقترح: ${title}\n\n📝 القصة: ${description}\n\n👉 شاهد الآن مجاناً: ${movieLink}`;

  console.log(`Préparation de la publication pour le film: ${title}`);

  try {
    const response = await axios.post(`https://graph.facebook.com/v19.0/${PAGE_ID}/photos`, {
      url: posterUrl,
      message: message,
      access_token: PAGE_ACCESS_TOKEN
    });
    
    console.log(`✅ Publication réussie sur Facebook! ID du post: ${response.data.id}`);
    publishedMovieIds.add(movie.id);
    return true;
  } catch (error) {
    console.error("❌ Erreur Graph API lors de la publication:", error.response ? error.response.data : error.message);
    return false;
  }
}

/**
 * Récupère la bande-annonce officielle (YouTube) d'un film
 */
async function getMovieTrailer(movieId) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}/videos`, {
      params: { api_key: TMDB_API_KEY }
    });
    // Chercher un trailer officiel sur YouTube
    const trailer = response.data.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    return trailer ? trailer.key : null;
  } catch (error) {
    console.error('Erreur récupération trailer:', error.message);
    return null;
  }
}

/**
 * Télécharge et coupe la vidéo (30s max, format 9:16 vertical)
 */
function downloadAndTrimVideo(youtubeKey, outputPath) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${youtubeKey}`;
    const rawVideoPath = outputPath.replace('.mp4', '_raw.mp4');
    const ytdlpPath = path.join(__dirname, 'yt-dlp.exe');

    console.log('Téléchargement de la vidéo brute avec yt-dlp...');
    
    execFile(ytdlpPath, [
      url, 
      '--output', rawVideoPath, 
      '--format', 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best'
    ], (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erreur yt-dlp:', stderr || error.message);
        return reject(error);
      }

      console.log('Montage et rognage vertical en cours...');
      ffmpeg(rawVideoPath)
        .setStartTime('00:00:00')
        .setDuration(30)
        .videoFilters([
          'crop=ih*(9/16):ih',
          'scale=1080:1920'
        ])
        .outputOptions('-c:v libx264')
        .outputOptions('-preset fast')
        .outputOptions('-crf 23')
        .outputOptions('-c:a aac')
        .save(outputPath)
        .on('end', () => {
          console.log('✅ Montage vidéo terminé!');
          if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath); // nettoyage
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ Erreur FFmpeg:', err);
          if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath); // nettoyage
          reject(err);
        });
    });
  });
}

/**
 * Publie le Reel sur Facebook via l'API video_reels
 */
async function postReelToFacebook(movie, videoPath) {
  if (!PAGE_ACCESS_TOKEN || !PAGE_ID) return false;

  const title = movie.title || movie.original_title;
  const description = `🎬 ${title}\n\n👉 شاهد الآن مجاناً: ${SITE_URL}/movie/${movie.id}`;
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;

  try {
    console.log("1. Initialisation de l'upload du Reel...");
    const initRes = await axios.post(`https://graph.facebook.com/v19.0/${PAGE_ID}/video_reels`, {
      upload_phase: 'start',
      access_token: PAGE_ACCESS_TOKEN
    });
    
    const videoId = initRes.data.video_id;
    const uploadUrl = initRes.data.upload_url;

    console.log("2. Envoi des données vidéo...");
    const fileStream = fs.readFileSync(videoPath);
    await axios.post(uploadUrl, fileStream, {
      headers: {
        'Authorization': `OAuth ${PAGE_ACCESS_TOKEN}`,
        'offset': '0',
        'file_size': fileSize.toString(),
        'Content-Type': 'application/octet-stream'
      }
    });

    console.log("3. Publication du Reel...");
    const publishRes = await axios.post(`https://graph.facebook.com/v19.0/${PAGE_ID}/video_reels`, {
      upload_phase: 'finish',
      video_id: videoId,
      video_state: 'PUBLISHED',
      description: description,
      access_token: PAGE_ACCESS_TOKEN
    });

    console.log(`✅ Reel publié avec succès ! ID: ${publishRes.data.id || videoId}`);
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de l'upload du Reel:", error.response ? error.response.data : error.message);
    return false;
  }
}

/**
 * Logique principale pour poster UN seul film non encore publié
 */
async function publishNextMovie() {
  console.log('Recherche d\'un film à publier...');
  const movies = await getTrendingMovies();
  
  if (movies.length === 0) {
    console.log("Aucun film trouvé.");
    return;
  }

  // Trouve le premier film qui n'a pas encore été publié
  const movieToPublish = movies.find(m => !publishedMovieIds.has(m.id) && m.poster_path);

  if (movieToPublish) {
    // 1. Publier la photo
    const photoSuccess = await postToFacebook(movieToPublish);
    
    // 2. Publier le Reel si la photo a réussi
    if (photoSuccess) {
      console.log('Recherche du trailer pour le Reel...');
      const trailerKey = await getMovieTrailer(movieToPublish.id);
      
      if (trailerKey) {
        const tempDir = path.join(__dirname, 'temp_videos');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const videoPath = path.join(tempDir, `${movieToPublish.id}.mp4`);
        
        try {
          console.log(`Création du Reel pour le film ${movieToPublish.title}...`);
          await downloadAndTrimVideo(trailerKey, videoPath);
          await postReelToFacebook(movieToPublish, videoPath);
        } catch (e) {
          console.error("Erreur lors de la création/publication du Reel:", e.message);
        } finally {
          // Nettoyage
          if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        }
      } else {
        console.log("Aucun trailer YouTube trouvé pour ce film, pas de Reel.");
      }
    }
  } else {
    console.log("Tous les films tendance du jour ont déjà été publiés.");
    // Optionnel: Vider le set pour le lendemain
    publishedMovieIds.clear();
  }
}

// ---------------------------------------------------------
// PROGRAMMATION CRON (3 fois par jour : 12h, 18h, 21h)
// ---------------------------------------------------------

console.log("🤖 Démarrage du Bot Facebook Auto-Poster...");
console.log("Le bot publiera un film automatiquement à 19:00, 21:00 et 22:00 chaque jour.");

// À 19h00
cron.schedule('0 19 * * *', () => {
  console.log('⏰ Exécution de la tâche de 19:00');
  publishNextMovie();
});

// À 21h00
cron.schedule('0 21 * * *', () => {
  console.log('⏰ Exécution de la tâche de 21:00');
  publishNextMovie();
});

// À 22h00
cron.schedule('0 22 * * *', () => {
  console.log('⏰ Exécution de la tâche de 22:00');
  publishNextMovie();
});

module.exports = { publishNextMovie, getTrendingMovies };
