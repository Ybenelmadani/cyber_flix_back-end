/**
 * Free Streaming Providers Controller
 * Generates embed URLs automatically from TMDB ID
 * No upload required — works like EgyDead multi-server system
 */

/**
 * List of free providers with their URL templates.
 * :id      → TMDB ID
 * :season  → season number (TV only)
 * :episode → episode number (TV only)
 */
const FREE_PROVIDERS = [
  {
    name: "VidLink",
    provider: "vidlink",
    quality: "Auto",
    isLegal: false,
    movie: "https://vidlink.pro/movie/:id",
    tv: "https://vidlink.pro/tv/:id/:season/:episode",
  },
  {
    name: "VidSrc",
    provider: "vidsrc",
    quality: "HD",
    isLegal: false,
    movie: "https://vidsrc.xyz/embed/movie?tmdb=:id",
    tv: "https://vidsrc.xyz/embed/tv?tmdb=:id&season=:season&episode=:episode",
  },
  {
    name: "2Embed",
    provider: "2embed",
    quality: "HD",
    isLegal: false,
    movie: "https://www.2embed.cc/embed/:id",
    tv: "https://www.2embed.cc/embedtv/:id&s=:season&e=:episode",
  },
  {
    name: "Embed.su",
    provider: "embedsu",
    quality: "Auto",
    isLegal: false,
    movie: "https://embed.su/embed/movie/:id",
    tv: "https://embed.su/embed/tv/:id/:season/:episode",
  },
  {
    name: "AutoEmbed",
    provider: "autoembed",
    quality: "Auto",
    isLegal: false,
    movie: "https://autoembed.cc/movie/tmdb-:id",
    tv: "https://autoembed.cc/tv/tmdb-:id-:season-:episode",
  },
  {
    name: "MultiEmbed",
    provider: "multiembed",
    quality: "HD",
    isLegal: false,
    movie: "https://multiembed.mov/?video_id=:id&tmdb=1",
    tv: "https://multiembed.mov/?video_id=:id&tmdb=1&s=:season&e=:episode",
  },
  {
    name: "NontonGo",
    provider: "nontongo",
    quality: "HD",
    isLegal: false,
    movie: "https://www.NontonGo.net/embed/movie/:id",
    tv: "https://www.NontonGo.net/embed/tv/:id/:season/:episode",
  },
];

const buildUrl = (template, { id, season, episode }) =>
  template
    .replace(/:id/g, encodeURIComponent(id))
    .replace(/:season/g, encodeURIComponent(season || ""))
    .replace(/:episode/g, encodeURIComponent(episode || ""));

/**
 * GET /api/free-providers/:mediaType/:tmdbId
 * Query params for TV: ?season=1&episode=1
 */
exports.getFreeProviders = (req, res) => {
  const { mediaType, tmdbId } = req.params;
  const { season, episode } = req.query;

  if (!["movie", "tv"].includes(mediaType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid mediaType. Must be "movie" or "tv".',
    });
  }

  if (!tmdbId) {
    return res.status(400).json({
      success: false,
      message: "tmdbId is required.",
    });
  }

  if (mediaType === "tv" && (!season || !episode)) {
    return res.status(400).json({
      success: false,
      message: "season and episode query params are required for TV.",
    });
  }

  const sources = FREE_PROVIDERS.map((p, index) => {
    const template = mediaType === "movie" ? p.movie : p.tv;
    const url = buildUrl(template, {
      id: tmdbId,
      season,
      episode,
    });

    return {
      id: `free-${p.provider}-${index}`,
      name: p.name,
      provider: p.provider,
      quality: p.quality,
      url,
      type: "embed",
      isLegal: p.isLegal,
      isPremium: false,
      isFreeProvider: true,
    };
  });

  return res.json({
    success: true,
    mediaType,
    tmdbId,
    season: season || null,
    episode: episode || null,
    count: sources.length,
    sources,
  });
};
