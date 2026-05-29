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

// Score results to find the best match
function scoreEgyDeadResult(item, title, year, isTV = false) {
  let score = 0;
  const name = String(item.name || "").toLowerCase();
  const orig = String(item.original_title || "").toLowerCase();
  const query = title.toLowerCase();
  
  if (item.model_type === 'person') return -999;
  
  if (name.includes(query) || orig.includes(query)) score += 50;
  if (orig === query) score += 30;
  
  // Year matching
  if (year && String(item.year) === String(year)) {
    score += 40;
  }
  
  // TV/Movie matching
  const itemIsTV = Boolean(item.is_series || item.type === 'series' || name.includes('مسلسل'));
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
  if (urlLower.includes("dood") || urlLower.includes("ds2play")) return "DoodStream";
  if (urlLower.includes("mixdrop")) return "Mixdrop";
  if (urlLower.includes("earnvids")) return "EarnVids";
  if (urlLower.includes("streamix")) return "Streamix";
  if (urlLower.includes("byse") || urlLower.includes("byso")) return "Byse";
  if (urlLower.includes("streamhg") || urlLower.includes("hgcloud")) return "StreamHG";
  if (urlLower.includes("streamruby") || urlLower.includes("rubystream")) return "StreamRuby";
  if (urlLower.includes("egybestvid")) return "EgyBestVid";
  
  // Fallbacks based on name
  if (nameLower.includes("voe")) return "Voe";
  if (nameLower.includes("dood")) return "DoodStream";
  if (nameLower.includes("mixdrop")) return "Mixdrop";
  if (nameLower.includes("earnvids")) return "EarnVids";
  if (nameLower.includes("streamix")) return "Streamix";
  
  return name || "EgyDead";
}

/**
 * Scrape EgyDead
 */
const scrapeEgyDead = async (title, year, isTV = false, season = null, episode = null) => {
  try {
    const searchUrl = `https://egydead.ca/search/${encodeURIComponent(title)}/`;
    const { data: searchHtml } = await axios.get(searchUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const bootData = parseBootstrapData(searchHtml);
    if (!bootData) {
      console.log("EgyDead: No bootstrapData found in search results.");
      return null;
    }
    
    const results = bootData.loaders?.searchPage?.results || [];
    if (results.length === 0) {
      console.log(`EgyDead: No search results found for query: ${title}`);
      return null;
    }
    
    // Score results
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
    
    console.log(`EgyDead: Best matching title: ID=${bestItem.id} | Name="${bestItem.name}" | Score=${bestScore}`);
    
    const servers = [];
    
    if (!isTV) {
      // Movie watch URL (using '/watch' as slug which Laravel resolves correctly)
      const watchUrl = `https://egydead.ca/titles/${bestItem.id}/watch`;
      console.log(`EgyDead: Fetching movie details: ${watchUrl}`);
      const { data: detailsHtml } = await axios.get(watchUrl, {
        headers: { "User-Agent": USER_AGENT }
      });
      
      const detailsBootData = parseBootstrapData(detailsHtml);
      const titleObj = detailsBootData?.loaders?.titlePage?.title;
      const videos = titleObj?.videos || [];
      
      console.log(`EgyDead: Found ${videos.length} movie videos/servers.`);
      videos.forEach(v => {
        if (v.src) {
          const providerName = detectProvider(v.src, v.name);
          servers.push({
            name: v.name || providerName,
            provider: providerName,
            url: v.src,
            quality: String(v.quality || "HD").toUpperCase()
          });
        }
      });
    } else {
      // Episode watch URL (using '/watch' as slug which Laravel resolves correctly)
      const watchUrl = `https://egydead.ca/titles/${bestItem.id}/watch/season/${season}/episode/${episode}`;
      console.log(`EgyDead: Fetching episode details: ${watchUrl}`);
      const { data: detailsHtml } = await axios.get(watchUrl, {
        headers: { "User-Agent": USER_AGENT }
      });
      
      const detailsBootData = parseBootstrapData(detailsHtml);
      // Episode details is in loaders.episodePage
      const epObj = detailsBootData?.loaders?.episodePage?.episode;
      const videos = epObj?.videos || [];
      
      console.log(`EgyDead: Found ${videos.length} episode videos/servers.`);
      videos.forEach(v => {
        if (v.src) {
          const providerName = detectProvider(v.src, v.name);
          servers.push({
            name: v.name || providerName,
            provider: providerName,
            url: v.src,
            quality: String(v.quality || "HD").toUpperCase()
          });
        }
      });
    }
    
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
