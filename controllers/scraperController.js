const axios = require("axios");
const cheerio = require("cheerio");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
};

/**
 * Scrape EgyDead
 */
const scrapeEgyDead = async (title, year) => {
  try {
    const searchTitle = `${title} ${year}`;
    const searchUrl = `https://tv8.egydead.live/search/${encodeURIComponent(searchTitle)}/`;
    
    const { data: searchHtml } = await axios.get(searchUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const $search = cheerio.load(searchHtml);
    const firstResult = $search(".movie-item a").first().attr("href");
    
    if (!firstResult) return null;

    const { data: movieHtml } = await axios.get(firstResult, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const $movie = cheerio.load(movieHtml);
    const servers = [];
    
    // EgyDead usually has download links in buttons or a list
    $movie(".ser-link a").each((_, el) => {
      const $el = $(el);
      const name = $el.text().trim();
      const url = $el.attr("href");
      if (url && url.startsWith("http")) {
        servers.push({
          name: name || "Server",
          provider: "EgyDead",
          url,
          quality: "HD" // EgyDead usually labels quality in the URL or title
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
const scrapeTopCinema = async (title, year) => {
  try {
    const searchUrl = `https://topcinemaa.com/?s=${encodeURIComponent(title)}+${year}`;
    
    const { data: searchHtml } = await axios.get(searchUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    
    const $search = cheerio.load(searchHtml);
    const firstResult = $search(".result-item a").first().attr("href") || $search(".movie-item a").first().attr("href");
    
    if (!firstResult) return null;

    // TopCinema often has a /download/ page
    const downloadPageUrl = firstResult.endsWith("/") ? `${firstResult}download/` : `${firstResult}/download/`;
    
    const { data: downloadHtml } = await axios.get(downloadPageUrl, {
      headers: { "User-Agent": USER_AGENT }
    }).catch(() => axios.get(firstResult, { headers: { "User-Agent": USER_AGENT } }));
    
    const $dl = cheerio.load(downloadHtml.data || downloadHtml);
    const servers = [];
    
    // Look for download server buttons
    $dl("a").each((_, el) => {
      const $el = $dl(el);
      const url = $el.attr("href");
      const text = $el.text().toLowerCase();
      
      // Filter common file hosts
      const hosts = ["1fichier", "mixdrop", "dood", "uptobox", "nitroflare", "ddownload", "mdiaload", "updown", "vidtube"];
      if (url && hosts.some(h => url.includes(h) || text.includes(h))) {
        servers.push({
          name: $el.text().trim() || "Download",
          provider: "TopCinema",
          url,
          quality: text.includes("1080") ? "1080p" : text.includes("720") ? "720p" : "HD"
        });
      }
    });

    return servers.length > 0 ? { provider: "TopCinema", servers } : null;
  } catch (err) {
    console.error("TopCinema Scraper Error:", err.message);
    return null;
  }
};

exports.getLinks = async (req, res) => {
  const { title, year } = req.query;

  if (!title) {
    return res.status(400).json({ success: false, message: "Title is required" });
  }

  const results = [];
  
  const [egydead, topcinema] = await Promise.all([
    scrapeEgyDead(title, year),
    scrapeTopCinema(title, year)
  ]);

  if (egydead) results.push(egydead);
  if (topcinema) results.push(topcinema);

  res.json({
    success: true,
    results
  });
};
