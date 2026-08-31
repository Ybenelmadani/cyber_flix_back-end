const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");
const { generateFreeServers } = require("./freeProvidersController");
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const SCRAPER_REQUEST_OPTIONS = {
  headers: { "User-Agent": USER_AGENT },
  timeout: 11000,
  proxy: false,
};

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
  10: ["العاشر", "العاشرة", "10"],
  11: ["الحادي عشر", "11"],
  12: ["الثاني عشر", "12"],
  13: ["الثالث عشر", "13"],
  14: ["الرابع عشر", "14"],
  15: ["الخامس عشر", "15"],
  16: ["السادس عشر", "16"],
  17: ["السابع عشر", "17"],
  18: ["الثامن عشر", "18"],
  19: ["التاسع عشر", "19"],
  20: ["العشرون", "20"]
};

const normalizeTitleForMatch = (value = "") =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildTitleVariants = (title, year = null, isTV = false) => {
  const raw = String(title || "").trim();
  if (!raw) return [];

  const variants = new Set([raw]);
  const noYear = raw.replace(/\b(?:19|20)\d{2}\b/g, " ").replace(/\s+/g, " ").trim();
  if (noYear && noYear !== raw) variants.add(noYear);

  const punctuationLight = raw
    .replace(/[\:|]/g, " ")
    .replace(/[?']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (punctuationLight && punctuationLight !== raw) variants.add(punctuationLight);

  const colonHead = raw.split(":")[0]?.trim();
  if (colonHead && colonHead !== raw) variants.add(colonHead);

  const dashHead = raw.split("-")[0]?.trim();
  if (dashHead && dashHead !== raw) variants.add(dashHead);

  if (year && !isTV) {
    variants.add(`${raw} ${year}`);
    if (colonHead) variants.add(`${colonHead} ${year}`);
  }

  return Array.from(variants)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, list) =>
      list.findIndex(
        (candidate) => normalizeTitleForMatch(candidate) === normalizeTitleForMatch(entry)
      ) === index
    );
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
  
  if (decoded.includes(cleanTitle)) score += 30;
  
  // Avoid movies
  if (decoded.includes('فيلم') || decoded.includes('movie')) return -999;
  
  // Basic TV markers
  if (decoded.includes('episode') || decoded.includes('الحلقة') || decoded.includes('حلقة')) score += 10;
  if (decoded.includes('season') || decoded.includes('الموسم') || decoded.includes('موسم')) score += 10;

  if (season !== null && season !== undefined) {
    const sNum = Number(season);
    // Disqualify any link that explicitly mentions another season
    for (let otherS = 1; otherS <= 20; otherS++) {
      if (otherS !== sNum) {
        const otherRegexes = [
          new RegExp(`(?:الموسم|موسم)\\s*0*${otherS}(?!\\d)`, 'i'),
          new RegExp(`\\bs0*${otherS}(?!\\d)`, 'i'),
        ];
        if (arabicNumbers[otherS]) {
          arabicNumbers[otherS].forEach(term => {
            if (isNaN(term)) otherRegexes.push(new RegExp(`(?:الموسم|موسم)\\s*${term}`, 'i'));
          });
        }
        if (otherRegexes.some(rx => rx.test(decoded))) {
          return -999; // Disqualify wrong season!
        }
      }
    }

    const seasonRegexes = [
      new RegExp(`(?:الموسم|موسم)\\s*0*${sNum}(?!\\d)`, 'i'),
      new RegExp(`\\bs0*${sNum}(?!\\d)`, 'i'),
      new RegExp(`\\bseason\\s*0*${sNum}(?!\\d)`, 'i'),
    ];
    if (arabicNumbers[sNum]) {
      arabicNumbers[sNum].forEach(term => {
        if (isNaN(term)) seasonRegexes.push(new RegExp(`(?:الموسم|موسم)\\s*${term}`, 'i'));
      });
    }
    const hasSeasonMatch = seasonRegexes.some(rx => rx.test(decoded));
    if (!hasSeasonMatch) return -999; // Must match requested season
    score += 40;
  }

  if (episode !== null && episode !== undefined) {
    const eNum = Number(episode);
    const episodeRegexes = [
      new RegExp(`(?:الحلقة|حلقة)\\s*0*${eNum}(?!\\d)`, 'i'),
      new RegExp(`\\be0*${eNum}(?!\\d)`, 'i'),
      new RegExp(`\\bepisode\\s*0*${eNum}(?!\\d)`, 'i'),
    ];
    if (arabicNumbers[eNum]) {
      arabicNumbers[eNum].forEach(term => {
        if (isNaN(term)) episodeRegexes.push(new RegExp(`(?:الحلقة|حلقة)\\s*${term}`, 'i'));
      });
    }
    const hasEpisodeMatch = episodeRegexes.some(rx => rx.test(decoded));
    if (hasEpisodeMatch) {
      score += 50;
    } else {
      // If another episode number is explicitly found, penalize heavily
      for (let otherE = 1; otherE <= 30; otherE++) {
        if (otherE !== eNum) {
          const otherRx = new RegExp(`(?:الحلقة|حلقة)\\s*0*${otherE}(?!\\d)`, 'i');
          if (otherRx.test(decoded)) return -999;
        }
      }
    }
  }

  return score;
}

// Score results to find the best match
function scoreEgyDeadResult(item, title, year, isTV = false) {
  let score = 0;
  const name = normalizeTitleForMatch(item.name || "");
  const orig = normalizeTitleForMatch(item.original_title || item.original_name || "");
  const query = normalizeTitleForMatch(title);

  if (item.model_type === 'person') return -999;
  if (!name && !orig) return -999;

  if (name === query || orig === query) score += 80;
  else if (name.includes(query) || orig.includes(query)) score += 50;

  const queryWords = query.split(" ").filter(Boolean);
  if (queryWords.length > 1) {
    const wordMatches = queryWords.filter(
      (word) => name.includes(word) || orig.includes(word)
    ).length;
    score += wordMatches * 12;
  }

  if (year && String(item.year) === String(year)) {
    score += 40;
  }

  const itemIsTV = Boolean(item.is_series || item.type === 'series');
  if (isTV === itemIsTV) {
    score += 30;
  } else {
    score -= 20;
  }

  return score;
}
const parseBootstrapData = (html) => {
  const match = html.match(/window\.bootstrapData\s*=\s*(.*?);\s*\n/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error("Failed to parse bootstrap JSON:", e.message);
    }
  }
  return null;
};

function detectProvider(url, name) {
  const urlLower = String(url || "").toLowerCase();
  const nameLower = String(name || "").toLowerCase();
  
  if (urlLower.includes("voe")) return "Voe";
  if (urlLower.includes("dood") || urlLower.includes("ds2play") || urlLower.includes("playmogo")) return "DoodStream";
  if (urlLower.includes("mixdrop")) return "Mixdrop";
  if (urlLower.includes("earnvids") || urlLower.includes("minochinos") || urlLower.includes("morencius")) return "EarnVids";
  if (urlLower.includes("streamix") || urlLower.includes("vidaraa")) return "Streamix";
  if (urlLower.includes("byse") || urlLower.includes("byso") || urlLower.includes("bysekoze")) return "Byse";
  if (urlLower.includes("streamhg") || urlLower.includes("hgcloud") || urlLower.includes("audinifer") || urlLower.includes("hanerix")) return "StreamHG";
  if (urlLower.includes("streamruby") || urlLower.includes("rubystream") || urlLower.includes("stmruby")) return "StreamRuby";
  if (urlLower.includes("egybestvid")) return "EgyBestVid";
  if (urlLower.includes("1fichier")) return "1Fichier";
  if (urlLower.includes("uptobox")) return "Uptobox";
  if (urlLower.includes("nitroflare")) return "Nitroflare";
  if (urlLower.includes("ddownload")) return "DDownload";
  if (urlLower.includes("mdiaload")) return "Mdiaload";
  if (urlLower.includes("updown")) return "UpDown";
  if (urlLower.includes("vidtube")) return "VidTube";
  if (urlLower.includes("giga")) return "Giga";
  if (urlLower.includes("drive.google")) return "Google Drive";
  if (urlLower.includes("mega.nz") || urlLower.includes("mega.co")) return "Mega";
  if (urlLower.includes("megaup")) return "MegaUp";
  if (urlLower.includes("forafile")) return "Forafile";
  if (urlLower.includes("krakenfiles")) return "KrakenFiles";
  if (urlLower.includes("vikingfile")) return "VikingFile";
  if (urlLower.includes("koramaup")) return "KoramaUp";
  if (urlLower.includes("1cloudfile")) return "1Cloudfile";
  if (urlLower.includes("bowfile")) return "BowFile";
  if (urlLower.includes("send.now") || urlLower.includes("send.cm")) return "Send";
  
  // Fallbacks based on name
  if (nameLower.includes("voe")) return "Voe";
  if (nameLower.includes("dood")) return "DoodStream";
  if (nameLower.includes("mixdrop")) return "Mixdrop";
  if (nameLower.includes("earnvids") || nameLower.includes("minochinos")) return "EarnVids";
  if (nameLower.includes("streamix")) return "Streamix";
  if (nameLower.includes("1fichier")) return "1Fichier";
  if (nameLower.includes("uptobox")) return "Uptobox";
  if (nameLower.includes("nitroflare")) return "Nitroflare";
  if (nameLower.includes("ddownload")) return "DDownload";
  if (nameLower.includes("mdiaload")) return "Mdiaload";
  if (nameLower.includes("updown")) return "UpDown";
  if (nameLower.includes("vidtube")) return "VidTube";
  if (nameLower.includes("giga")) return "Giga";
  if (nameLower.includes("google")) return "Google Drive";
  if (nameLower.includes("mega")) return "Mega";
  
  return name || "CyberFlix";
}

const PLAYABLE_EMBED_PROVIDERS = new Set([
  "voe",
  "doodstream",
  "mixdrop",
  "earnvids",
  "streamix",
  "byse",
  "streamhg",
  "streamruby",
  "egybestvid",
  "vidtube",
]);

const PLAYABLE_DIRECT_PROVIDERS = new Set([
  "google drive",
]);

const isDirectMediaUrl = (url) =>
  /\.(m3u8|mp4|webm|mkv)(\?|#|$)/i.test(String(url || "").trim());

const inferScrapedSourceType = (url, providerName = "") => {
  if (isDirectMediaUrl(url)) {
    return String(url || "").toLowerCase().includes(".m3u8") ? "hls" : "mp4";
  }

  const normalizedProvider = String(providerName || "").trim().toLowerCase();
  if (
    PLAYABLE_EMBED_PROVIDERS.has(normalizedProvider) ||
    PLAYABLE_DIRECT_PROVIDERS.has(normalizedProvider)
  ) {
    return "embed";
  }

  return "download";
};

const isPlayableScrapedSource = (url, providerName = "") =>
  inferScrapedSourceType(url, providerName) !== "unknown";

const searchTitle = async (query) => {
  const searchUrl = `https://egydead.ca/search/${encodeURIComponent(query)}/`;
  try {
    console.log(`Searching for '${query}' on EgyDead.ca...`);
    const { data } = await axios.get(searchUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000,
    });
    
    const bootData = parseBootstrapData(data);
    if (!bootData) return [];
    
    return bootData.loaders?.searchPage?.results || [];
  } catch (err) {
    console.error("EgyDead Search error:", err.message);
    return [];
  }
};

const scrapeEgyDead = async (title, year, isTV = false, season = null, episode = null) => {
  try {
    const results = await searchTitle(title);
    if (results.length === 0) return null;
    
    let bestItem = null;
    let bestScore = -999;
    
    results.forEach(item => {
      const score = scoreEgyDeadResult(item, title, year, isTV);
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    });
    
    if (!bestItem || bestScore < 10) {
      console.log(`EgyDead: No good match found. Best score: ${bestScore}`);
      return null;
    }
    
    console.log(`EgyDead: Best match ID=${bestItem.id} | Score=${bestScore}`);
    
    const servers = [];
    const watchUrl = isTV 
      ? `https://egydead.ca/titles/${bestItem.id}/watch/season/${season}/episode/${episode}`
      : `https://egydead.ca/titles/${bestItem.id}/watch`;
      
    const { data } = await axios.get(watchUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000,
    });
    
    const bootData = parseBootstrapData(data);
    const mediaObj = isTV ? bootData?.loaders?.episodePage?.episode : bootData?.loaders?.titlePage?.title;
    const videos = mediaObj?.videos || [];
    
    videos.forEach(v => {
      const providerName = detectProvider(v.src, v.name || "EgyDead");
      servers.push({
        name: v.name || `${providerName} HD`,
        provider: providerName,
        url: v.src,
        type: inferScrapedSourceType(v.src, providerName),
        language: "AR",
        quality: String(v.quality || "HD").toUpperCase()
      });
      // Also provide as a download server so it populates the Download servers grid
      servers.push({
        name: `${providerName} سيرفر المشاهدة والتحميل`,
        provider: providerName,
        url: v.src,
        type: "download",
        language: "AR",
        quality: String(v.quality || "HD").toUpperCase()
      });
    });
    
    // Check if by any chance downloads exist on the new platform
    const downloads = mediaObj?.downloads || [];
    downloads.forEach(d => {
      const providerName = detectProvider(d.src, d.name || "EgyDead Download");
      servers.push({
        name: d.name || `${providerName} 1080p`,
        provider: providerName,
        url: d.src,
        type: "download",
        language: "AR",
        quality: "1080p"
      });
    });
    
    console.log(`EgyDead: ${servers.length} servers found for "${title}"`);
    return servers.length > 0 ? { provider: "CyberFlix", servers } : null;
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
    const searchUrl = `https://topcinemaa.live/?s=${encodeURIComponent(searchQuery)}`;
    const { data: searchHtml } = await axios
      .get(searchUrl, SCRAPER_REQUEST_OPTIONS)
      .catch(() => axios.get(`https://topcinma.com/?s=${encodeURIComponent(searchQuery)}`, SCRAPER_REQUEST_OPTIONS));
    
    const $search = cheerio.load(searchHtml);
    let bestLink = null;
    let bestScore = -999;
    
    $search('a').each((_, el) => {
      const href = $search(el).attr('href');
      if (href && (href.includes('topcinemaa.top/') || href.includes('web.topcinemaa.com/') || href.includes('topcinma') || href.includes('topcinema') || href.includes('topcinemaa.live/'))) {
        const score = isTV 
          ? scoreTVLink(href, title, season, episode)
          : scoreMovieLink(href, title, year);
        if (score > bestScore) {
          bestScore = score;
          bestLink = href;
        }
      }
    });

    // If TV show episode is not on page 1, check page 2 of search results
    if (isTV && (!bestLink || bestScore < 10)) {
      try {
        const searchPage2Url = `https://topcinemaa.live/page/2/?s=${encodeURIComponent(searchQuery)}`;
        const { data: page2Html } = await axios
          .get(searchPage2Url, SCRAPER_REQUEST_OPTIONS)
          .catch(() => axios.get(`https://topcinma.com/page/2/?s=${encodeURIComponent(searchQuery)}`, SCRAPER_REQUEST_OPTIONS));
        const $page2 = cheerio.load(page2Html);
        $page2('a').each((_, el) => {
          const href = $page2(el).attr('href');
          if (href && (href.includes('topcinemaa.top/') || href.includes('web.topcinemaa.com/') || href.includes('topcinma') || href.includes('topcinema') || href.includes('topcinemaa.live/'))) {
            const score = scoreTVLink(href, title, season, episode);
            if (score > bestScore) {
              bestScore = score;
              bestLink = href;
            }
          }
        });
      } catch {
        // Page 2 may not exist, silently proceed
      }
    }

    if (!bestLink || bestScore < 10) {
      console.log(`TopCinema: No good match found for ${searchQuery} (Best score: ${bestScore})`);
      return null;
    }

    console.log(`TopCinema: Found best match: ${bestLink} (Score: ${bestScore})`);

    // TopCinema often has a /download/ subpage
    const downloadPageUrl = bestLink.endsWith("/") ? `${bestLink}download/` : `${bestLink}/download/`;
    
    const { data: downloadHtml } = await axios
      .get(downloadPageUrl, SCRAPER_REQUEST_OPTIONS)
      .catch(() => axios.get(bestLink, SCRAPER_REQUEST_OPTIONS));
    
    const $dl = cheerio.load(downloadHtml.data || downloadHtml);
    const servers = [];
    const seenUrls = new Set();
    
    $dl("a").each((_, el) => {
      const $el = $dl(el);
      const url = $el.attr("href");
      const text = $el.text().toLowerCase();
      
      const hosts = ["1fichier", "mixdrop", "dood", "uptobox", "nitroflare", "ddownload", "mdiaload", "updown", "vidtube", "giga", "drive.google", "mega.nz", "audinifer", "minochinos", "streamhg", "earnvids"];
      if (url && url.startsWith("http") && !seenUrls.has(url)) {
        const matchedHost = hosts.find(h => url.includes(h) || text.includes(h));
        if (matchedHost) {
          seenUrls.add(url);
          const providerName = detectProvider(url, matchedHost);
          let rawName = $el.text().replace(/\s+/g, ' ').trim();
          if (rawName.toLowerCase().includes("videotube") || rawName.toLowerCase().includes("vidtube")) {
            rawName = "VidTube متعدد الجودات";
          }
          
          const quality = text.includes("1080") ? "1080p" : text.includes("720") ? "720p" : text.includes("480") ? "480p" : "HD";
          
          // All links from TopCinema's download page are download servers
          servers.push({
            name: rawName || `${providerName} ${quality}`,
            provider: providerName,
            url,
            type: "download",
            language: "AR",
            quality
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
  const { title, year, mediaType, season, episode, tmdbId } = req.query;

  if (!title) {
    return res.status(400).json({ success: false, message: "Title is required" });
  }

  const isTV = mediaType === "tv" || !!season || !!episode;
  const sNum = season ? parseInt(season, 10) : null;
  const eNum = episode ? parseInt(episode, 10) : null;
  const yNum = year ? parseInt(year, 10) : null;

  const titlesToSearch = new Set(buildTitleVariants(title, yNum, isTV));

  if (tmdbId && process.env.TMDB_API_KEY) {
    try {
      const type = mediaType === "tv" ? "tv" : "movie";
      const tmdbKey = process.env.TMDB_API_KEY;
      const baseUrl = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
      
      const transUrl = `${baseUrl}/${type}/${tmdbId}/translations?api_key=${tmdbKey}`;
      const altUrl = `${baseUrl}/${type}/${tmdbId}/alternative_titles?api_key=${tmdbKey}`;
      
      const [transRes, altRes] = await Promise.all([
        axios.get(transUrl, { timeout: 3000 }).catch(() => null),
        axios.get(altUrl, { timeout: 3000 }).catch(() => null)
      ]);
      
      if (transRes && transRes.data && transRes.data.translations) {
        const arTrans = transRes.data.translations.find(t => t.iso_639_1 === "ar");
        if (arTrans && arTrans.data) {
          buildTitleVariants(arTrans.data.name, yNum, isTV).forEach(candidate => titlesToSearch.add(candidate));
          buildTitleVariants(arTrans.data.title, yNum, isTV).forEach(candidate => titlesToSearch.add(candidate));
        }
      }
      
      if (altRes && altRes.data) {
        const titlesList = altRes.data.results || altRes.data.titles || [];
        titlesList.slice(0, 3).forEach(t => {
          buildTitleVariants(t.title, yNum, isTV).forEach(candidate => titlesToSearch.add(candidate));
        });
      }
    } catch (tmdbErr) {
      console.error("Scraper TMDB alternative titles fetch error:", tmdbErr.message);
    }
  }

  // Prioritize primary title first and limit to max 3 unique titles to stay within Vercel timeout
  const uniqueTitles = Array.from(titlesToSearch).slice(0, 3);
  console.log(`Scraper querying EgyDead & TopCinema for titles: ${JSON.stringify(uniqueTitles)}`);

  const scrapePromises = [];
  uniqueTitles.forEach(t => {
    scrapePromises.push(scrapeEgyDead(t, yNum, isTV, sNum, eNum));
    scrapePromises.push(scrapeTopCinema(t, yNum, isTV, sNum, eNum));
  });

  const allScrapedResults = await Promise.all(scrapePromises);

  const combinedEgyDeadServers = [];
  const combinedTopCinemaServers = [];
  const seenServerKeys = new Set();

  allScrapedResults.forEach(scrapRes => {
    if (!scrapRes) return;
    if (scrapRes.provider === "CyberFlix") {
      (scrapRes.servers || []).forEach(server => {
        const key = `${server.url}-${server.type}`;
        if (server.url && !seenServerKeys.has(key)) {
          seenServerKeys.add(key);
          combinedEgyDeadServers.push(server);
        }
      });
    } else if (scrapRes.provider === "TopCinema") {
      (scrapRes.servers || []).forEach(server => {
        const key = `${server.url}-${server.type}`;
        if (server.url && !seenServerKeys.has(key)) {
          seenServerKeys.add(key);
          combinedTopCinemaServers.push(server);
        }
      });
    }
  });

  const results = [];
  if (combinedTopCinemaServers.length > 0) {
    results.push({ provider: "TopCinema", servers: combinedTopCinemaServers });
  }
  if (combinedEgyDeadServers.length > 0) {
    results.push({ provider: "CyberFlix", servers: combinedEgyDeadServers });
  }

  // Inject 100% reliable free providers (VidLink, VidSrc, etc.) as the ultimate fallback
  const fallbackServers = generateFreeServers(tmdbId, mediaType, season, episode);
  if (fallbackServers && fallbackServers.length > 0) {
    results.push({ provider: "CyberFlix Premium", servers: fallbackServers });
  }

  res.json({
    success: true,
    debugCode: "active_v3",
    results
  });
};

