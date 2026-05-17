const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const arabicNumbers = {
  1: ["الاول", "الاولى", "1"],
  2: ["الثاني", "الثانية", "2"],
  3: ["الثالث", "الثالثة", "3"],
  4: ["الرابع", "الرابعة", "4"],
  5: ["الخامس", "الخامسة", "5"],
  6: ["السادس", "السادسة", "6"],
  7: ["السابع", "السابعة", "7"],
  8: ["الثامن", "الثامنة", "8"],
  9: ["التاسع", "التاسعة", "9"],
  10: ["العاشر", "العاشرة", "10"]
};

// Robust link scoring system for Movies
function scoreMovieLink(url, title, year) {
  let score = 0;
  const decoded = decodeURIComponent(url).toLowerCase().replace(/[-_]/g, ' ');
  const cleanTitle = title.toLowerCase();
  
  if (decoded.includes(cleanTitle)) score += 20;
  if (year && decoded.includes(year.toString())) score += 30;
  
  // We want to avoid assemblies/collections or TV shows
  if (decoded.includes('assembly') || decoded.includes('سلسلة') || decoded.includes('series') || decoded.includes('episode') || decoded.includes('الحلقة') || decoded.includes('الموسم')) {
    score -= 60;
  }
  
  // Prefer watch/download pages of the movie
  if (decoded.includes('فيلم') || decoded.includes('movie') || decoded.includes('مشاهدة') || decoded.includes('تحميل')) {
    score += 15;
  }
  
  return score;
}

// Robust link scoring system for TV Shows
function scoreTVLink(url, title, season, episode) {
  let score = 0;
  const decoded = decodeURIComponent(url).toLowerCase().replace(/[-_]/g, ' ');
  const cleanTitle = title.toLowerCase();
  
  if (decoded.includes(cleanTitle)) score += 20;
  
  // Avoid movies
  if (decoded.includes('فيلم') || decoded.includes('movie')) score -= 50;
  
  // Basic TV markers
  if (decoded.includes('episode') || decoded.includes('الحلقة') || decoded.includes('حلقة')) score += 10;
  if (decoded.includes('season') || decoded.includes('الموسم') || decoded.includes('موسم')) score += 10;

  const sStr = season.toString();
  const sTerms = arabicNumbers[season] || [sStr];
  
  const hasSeasonMatch = sTerms.some(term => {
    if (term === sStr) {
      return decoded.includes(`الموسم ${term}`) || decoded.includes(`موسم ${term}`) || decoded.includes(`s${sStr}`) || decoded.includes(`season ${sStr}`);
    }
    return decoded.includes(`الموسم ${term}`) || decoded.includes(`موسم ${term}`) || decoded.includes(term);
  });
  if (hasSeasonMatch) score += 30;

  const eStr = episode.toString();
  const eTerms = arabicNumbers[episode] || [eStr];
  
  const hasEpisodeMatch = eTerms.some(term => {
    if (term === eStr) {
      return decoded.includes(`الحلقة ${term}`) || decoded.includes(`حلقة ${term}`) || decoded.includes(`e${eStr}`) || decoded.includes(`episode ${eStr}`);
    }
    return decoded.includes(`الحلقة ${term}`) || decoded.includes(`حلقة ${term}`) || decoded.includes(term);
  });
  if (hasEpisodeMatch) score += 40;
  
  return score;
}

/**
 * Scrape EgyDead
 */
const scrapeEgyDead = async (title, year, isTV = false, season = null, episode = null) => {
  try {
    let searchQuery = title;
    if (isTV && season && episode) {
      const sPad = season.toString().padStart(2, '0');
      const ePad = episode.toString().padStart(2, '0');
      searchQuery = `${title} s${sPad}e${ePad}`;
    }

    const searchUrl = `https://tv8.egydead.live/search/${encodeURIComponent(searchQuery)}/`;
    const { data: searchHtml } = await axios.get(searchUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const $search = cheerio.load(searchHtml);
    let bestLink = null;
    let bestScore = -999;
    
    $search('a').each((_, el) => {
      const href = $search(el).attr('href');
      if (href && href.startsWith('https://tv8.egydead.live/')) {
        const score = isTV 
          ? scoreTVLink(href, title, season, episode)
          : scoreMovieLink(href, title, year);
        if (score > bestScore) {
          bestScore = score;
          bestLink = href;
        }
      }
    });

    if (!bestLink || bestScore < 10) {
      console.log(`EgyDead: No good match found for ${searchQuery} (Best score: ${bestScore})`);
      return null;
    }

    console.log(`EgyDead: Found best match: ${bestLink} (Score: ${bestScore})`);

    // EgyDead requires POST request with View=1 to get the playback & download links
    const { data: movieHtml } = await axios.post(bestLink, qs.stringify({ View: "1" }), {
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    
    const $movie = cheerio.load(movieHtml);
    const servers = [];
    const seenUrls = new Set();
    
    // 1. Scrape Download Links
    $movie("a").each((_, el) => {
      const url = $movie(el).attr("href");
      const text = $movie(el).text().trim();
      
      const hosts = ["1fichier", "mixdrop", "dood", "uptobox", "ok.ru", "drive.google", "mega.nz", "uploadev", "userscloud", "forafile", "dsvplay", "minochinos", "hgcloud"];
      if (url && url.startsWith("http") && !seenUrls.has(url)) {
        if (hosts.some(h => url.includes(h)) || text.includes("تحميل") || text.includes("حمل الان")) {
          seenUrls.add(url);
          servers.push({
            name: text || "Download Link",
            provider: "EgyDead",
            url,
            quality: "HD"
          });
        }
      }
    });

    // 2. Scrape Watch Servers (data-link)
    $movie("li").each((_, el) => {
      const link = $movie(el).attr("data-link");
      const name = $movie(el).text().trim();
      if (link && link.startsWith("http") && !seenUrls.has(link)) {
        seenUrls.add(link);
        servers.push({
          name: name ? `Watch: ${name}` : "Watch Server",
          provider: "EgyDead",
          url: link,
          quality: "HD"
        });
      }
    });

    return servers.length > 0 ? { provider: "EgyDead", servers } : null;
  } catch (err) {
    console.error("EgyDead Scraper Error:", err.message);
    return null;
  }
};

/**
 * Scrape TopCinema
 */
const scrapeTopCinema = async (title, year, isTV = false, season = null, episode = null) => {
  try {
    let searchQuery = title;
    if (isTV && season && episode) {
      const sPad = season.toString().padStart(2, '0');
      const ePad = episode.toString().padStart(2, '0');
      searchQuery = `${title} s${sPad}e${ePad}`;
    } else if (year) {
      searchQuery = `${title}`; // year in query often breaks TopCinema strict search
    }

    const searchUrl = `https://topcinemaa.com/?s=${encodeURIComponent(searchQuery)}`;
    const { data: searchHtml } = await axios.get(searchUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const $search = cheerio.load(searchHtml);
    let bestLink = null;
    let bestScore = -999;
    
    $search('a').each((_, el) => {
      const href = $search(el).attr('href');
      if (href && href.startsWith('https://topcinemaa.com/')) {
        const score = isTV 
          ? scoreTVLink(href, title, season, episode)
          : scoreMovieLink(href, title, year);
        if (score > bestScore) {
          bestScore = score;
          bestLink = href;
        }
      }
    });

    if (!bestLink || bestScore < 10) {
      console.log(`TopCinema: No good match found for ${searchQuery} (Best score: ${bestScore})`);
      return null;
    }

    console.log(`TopCinema: Found best match: ${bestLink} (Score: ${bestScore})`);

    // TopCinema often has a /download/ subpage
    const downloadPageUrl = bestLink.endsWith("/") ? `${bestLink}download/` : `${bestLink}/download/`;
    
    const { data: downloadHtml } = await axios.get(downloadPageUrl, {
      headers: { "User-Agent": USER_AGENT }
    }).catch(() => axios.get(bestLink, { headers: { "User-Agent": USER_AGENT } }));
    
    const $dl = cheerio.load(downloadHtml.data || downloadHtml);
    const servers = [];
    const seenUrls = new Set();
    
    $dl("a").each((_, el) => {
      const $el = $dl(el);
      const url = $el.attr("href");
      const text = $el.text().toLowerCase();
      
      const hosts = ["1fichier", "mixdrop", "dood", "uptobox", "nitroflare", "ddownload", "mdiaload", "updown", "vidtube", "giga", "drive.google", "mega.nz"];
      if (url && url.startsWith("http") && !seenUrls.has(url)) {
        if (hosts.some(h => url.includes(h) || text.includes(h))) {
          seenUrls.add(url);
          servers.push({
            name: $el.text().trim() || "Download Server",
            provider: "TopCinema",
            url,
            quality: text.includes("1080") ? "1080p" : text.includes("720") ? "720p" : "HD"
          });
        }
      }
    });

    return servers.length > 0 ? { provider: "TopCinema", servers } : null;
  } catch (err) {
    console.error("TopCinema Scraper Error:", err.message);
    return null;
  }
};

exports.getLinks = async (req, res) => {
  const { title, year, mediaType, season, episode } = req.query;

  if (!title) {
    return res.status(400).json({ success: false, message: "Title is required" });
  }

  const isTV = mediaType === "tv" || !!season || !!episode;
  const sNum = season ? parseInt(season, 10) : null;
  const eNum = episode ? parseInt(episode, 10) : null;
  const yNum = year ? parseInt(year, 10) : null;

  const results = [];
  
  const [egydead, topcinema] = await Promise.all([
    scrapeEgyDead(title, yNum, isTV, sNum, eNum),
    scrapeTopCinema(title, yNum, isTV, sNum, eNum)
  ]);

  if (egydead) results.push(egydead);
  if (topcinema) results.push(topcinema);

  res.json({
    success: true,
    results
  });
};
