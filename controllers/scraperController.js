const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const SCRAPER_REQUEST_OPTIONS = {
  headers: { "User-Agent": USER_AGENT },
  timeout: 15000,
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
  10: ["العاشر", "العاشرة", "10"]
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
  if (urlLower.includes("streamhg") || urlLower.includes("hgcloud") || urlLower.includes("audinifer")) return "StreamHG";
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

/**
 * Scrape EgyDead — tv9.egydead.live (WordPress version)
 * egydead.ca est bloqué par Cloudflare → on utilise tv9.egydead.live
 * Méthode : GET ?s=titre pour chercher, POST View=1 pour débloquer les serveurs
 */
const scrapeEgyDead = async (title, year, isTV = false, season = null, episode = null) => {
  try {
    const BASE = "https://tv9.egydead.live";
    const TV9_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ar,en-US;q=0.7,en;q=0.3",
      "Referer": BASE + "/",
    };

    // 1. Recherche via ?s=
    const searchUrl = `${BASE}/?s=${encodeURIComponent(title)}`;
    console.log(`EgyDead TV9: Searching: ${searchUrl}`);
    const { data: searchHtml } = await axios.get(searchUrl, {
      headers: TV9_HEADERS,
      timeout: 12000,
    });

    const $s = cheerio.load(searchHtml);
    const results = [];
    $s("li.movieItem a").each((i, el) => {
      const href = $s(el).attr("href") || "";
      const titleText = $s(el).attr("title") || $s(el).find(".BottomTitle").text().trim();
      if (href && href.includes("egydead")) {
        results.push({ href, titleText });
      }
    });

    if (results.length === 0) {
      console.log(`EgyDead TV9: No results for "${title}"`);
      return null;
    }

    // 2. Trouver l'URL cible
    let targetUrl = null;

    if (isTV && season !== null && episode !== null) {
      const sPad = String(season).padStart(2, "0");
      const ePad = String(episode).padStart(2, "0");
      const pattern = `s${sPad}e${ePad}`;

      // Priorité : correspondance exacte dans le slug de l'épisode
      const exactMatch = results.find(r => r.href.toLowerCase().includes(pattern));
      if (exactMatch) {
        targetUrl = exactMatch.href;
        console.log(`EgyDead TV9: Episode match: ${targetUrl}`);
      } else {
        // Fallback : chercher dans la page de saison
        const sPattern = `s${sPad}`;
        const seasonMatch = results.find(r =>
          r.href.includes("/season/") && r.href.toLowerCase().includes(sPattern)
        );
        if (seasonMatch) {
          console.log(`EgyDead TV9: Checking season page: ${seasonMatch.href}`);
          try {
            const { data: seasonHtml } = await axios.get(seasonMatch.href, {
              headers: TV9_HEADERS,
              timeout: 10000,
            });
            const $season = cheerio.load(seasonHtml);
            $season("li.movieItem a, a[href*='/episode/']").each((i, el) => {
              const href = $season(el).attr("href") || "";
              if (href.toLowerCase().includes(pattern)) targetUrl = href;
            });
          } catch (e) {
            console.log(`EgyDead TV9: Season page error: ${e.message}`);
          }
        }
        // Dernier fallback : utiliser la page série pour trouver l'épisode
        if (!targetUrl) {
          const seriePage = results.find(r => r.href.includes("/serie/"));
          if (seriePage) {
            try {
              const { data: serieHtml } = await axios.get(seriePage.href, {
                headers: TV9_HEADERS,
                timeout: 10000,
              });
              const $serie = cheerio.load(serieHtml);
              $serie("a[href*='/episode/']").each((i, el) => {
                const href = $serie(el).attr("href") || "";
                if (href.toLowerCase().includes(pattern)) targetUrl = href;
              });
            } catch (e) {
              console.log(`EgyDead TV9: Serie page error: ${e.message}`);
            }
          }
        }
      }
    } else if (!isTV) {
      // Films : éviter les pages d'assemblage/collections/séries
      const movieResults = results.filter(
        r =>
          !r.href.includes("/assembly/") &&
          !r.href.includes("/serie/") &&
          !r.href.includes("/season/") &&
          !r.href.includes("/episode/")
      );
      if (movieResults.length > 0) {
        if (year) {
          const yearMatch = movieResults.find(
            r => r.href.includes(String(year)) || r.titleText.includes(String(year))
          );
          targetUrl = yearMatch ? yearMatch.href : movieResults[0].href;
        } else {
          targetUrl = movieResults[0].href;
        }
      } else if (results.length > 0) {
        targetUrl = results.find(r => !r.href.includes("/assembly/"))?.href || results[0].href;
      }
    }

    if (!targetUrl) {
      console.log(`EgyDead TV9: No target URL found for "${title}" ${isTV ? `S${season}E${episode}` : ""}`);
      return null;
    }

    console.log(`EgyDead TV9: POST View=1 → ${targetUrl}`);

    // 3. POST View=1 pour débloquer la liste des serveurs
    const { data: detailHtml } = await axios.post(targetUrl, "View=1", {
      headers: {
        ...TV9_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": BASE,
        "Referer": targetUrl,
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    // 4. Parser les liens serveurs depuis .serversList li[data-link]
    const $d = cheerio.load(detailHtml);
    const servers = [];
    const seenUrls = new Set();

    $d(".serversList li[data-link]").each((i, el) => {
      const url = $d(el).attr("data-link");
      const name = $d(el).text().trim();
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        const providerName = detectProvider(url, name);
        const type = inferScrapedSourceType(url, providerName);
        if (type !== "unknown") {
          servers.push({
            name: name || providerName,
            provider: providerName,
            url,
            type,
            language: "AR",
            quality: "HD",
          });
        }
      }
    });

    // Download links
    $d('.downloadMaster a[href], .donwload-table a[href], [class*="donwload"] a[href]').each((i, el) => {
      const url = $d(el).attr("href");
      let name = $d(el).text().trim();
      if (name === "حمل الان") name = ""; // Ignore generic arabic "Download now" text
      if (url && url.startsWith("http") && !seenUrls.has(url) && !url.includes("egydead")) {
        seenUrls.add(url);
        const providerName = detectProvider(url, name);
        servers.push({
          name: name || providerName,
          provider: providerName,
          url,
          type: "download",
          language: "AR",
          quality: "1080p", // Often 1080p on these sections
        });
      }
    });

    console.log(`EgyDead TV9: ${servers.length} servers found for "${title}"`);
    return servers.length > 0 ? { provider: "CyberFlix", servers } : null;

  } catch (err) {
    console.error("EgyDead TV9 Scraper Error:", err.message);
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

    const searchUrl = `https://topcinemaa.top/?s=${encodeURIComponent(searchQuery)}`;
    const { data: searchHtml } = await axios.get(searchUrl, SCRAPER_REQUEST_OPTIONS);
    
    const $search = cheerio.load(searchHtml);
    let bestLink = null;
    let bestScore = -999;
    
    $search('a').each((_, el) => {
      const href = $search(el).attr('href');
      if (href && (href.includes('topcinemaa.top/') || href.includes('web.topcinemaa.com/') || href.includes('topcinema'))) {
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
          const rawName = $el.text().replace(/\s+/g, ' ').trim();
          servers.push({
            name: rawName || providerName,
            provider: providerName,
            url,
            type: inferScrapedSourceType(url, providerName),
            language: "AR",
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
        titlesList.forEach(t => {
          buildTitleVariants(t.title, yNum, isTV).forEach(candidate => titlesToSearch.add(candidate));
        });
      }
    } catch (tmdbErr) {
      console.error("Scraper TMDB alternative titles fetch error:", tmdbErr.message);
    }
  }

  const uniqueTitles = Array.from(titlesToSearch).slice(0, 8);
  console.log(`Scraper querying EgyDead & TopCinema for titles: ${JSON.stringify(uniqueTitles)}`);

  const scrapePromises = [];
  uniqueTitles.forEach(t => {
    scrapePromises.push(scrapeEgyDead(t, yNum, isTV, sNum, eNum));
    scrapePromises.push(scrapeTopCinema(t, yNum, isTV, sNum, eNum));
  });

  const allScrapedResults = await Promise.all(scrapePromises);

  const combinedEgyDeadServers = [];
  const combinedTopCinemaServers = [];
  const seenUrls = new Set();

  allScrapedResults.forEach(scrapRes => {
    if (!scrapRes) return;
    if (scrapRes.provider === "CyberFlix") {
      (scrapRes.servers || []).forEach(server => {
        if (server.url && !seenUrls.has(server.url)) {
          seenUrls.add(server.url);
          combinedEgyDeadServers.push(server);
        }
      });
    } else if (scrapRes.provider === "TopCinema") {
      (scrapRes.servers || []).forEach(server => {
        if (server.url && !seenUrls.has(server.url)) {
          seenUrls.add(server.url);
          combinedTopCinemaServers.push(server);
        }
      });
    }
  });

  const results = [];
  if (combinedEgyDeadServers.length > 0) {
    results.push({ provider: "CyberFlix", servers: combinedEgyDeadServers });
  }
  if (combinedTopCinemaServers.length > 0) {
    results.push({ provider: "TopCinema", servers: combinedTopCinemaServers });
  }

  res.json({
    success: true,
    debugCode: "active_v2",
    results
  });
};

