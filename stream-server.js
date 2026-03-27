const fs = require("fs/promises");
const path = require("path");

const express = require("express");
require("dotenv").config();

const {
  buildSignedQuery,
  normalizeStreamPath,
  verifySignedStreamPath,
} = require("./utils/streamSigning");

const app = express();

const STREAM_PORT = Number(process.env.STREAM_PORT || 8080);
const VIDEO_ROOT = path.resolve(
  process.env.STREAM_VIDEO_ROOT || path.join(__dirname, "storage", "videos")
);

const PLAYLIST_EXTENSIONS = new Set([".m3u8"]);
const CONTENT_TYPES = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".m4s": "video/iso.segment",
  ".mp4": "video/mp4",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".key": "application/octet-stream",
};

const isAbsoluteUri = (value) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(String(value || "").trim());

const setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Cache-Control", "no-store");
};

const getFileContentType = (requestPath) =>
  CONTENT_TYPES[path.extname(requestPath).toLowerCase()] ||
  "application/octet-stream";

const ensureInsideVideoRoot = (absolutePath) => {
  const normalizedRoot = path.resolve(VIDEO_ROOT) + path.sep;
  const normalizedAbsolute = path.resolve(absolutePath);
  return (
    normalizedAbsolute === path.resolve(VIDEO_ROOT) ||
    normalizedAbsolute.startsWith(normalizedRoot)
  );
};

const resolveVideoFilePath = (requestPath) => {
  const normalizedPath = normalizeStreamPath(requestPath);
  if (!normalizedPath.startsWith("/videos/")) {
    throw new Error("Only /videos paths are supported");
  }

  const relativePath = decodeURIComponent(normalizedPath.slice("/videos/".length))
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const absolutePath = path.resolve(VIDEO_ROOT, relativePath);

  if (!ensureInsideVideoRoot(absolutePath)) {
    throw new Error("Invalid stream path");
  }

  return absolutePath;
};

const buildSignedAbsolutePath = (baseRequestPath, targetUri, expires) => {
  const trimmedTarget = String(targetUri || "").trim();
  if (!trimmedTarget || isAbsoluteUri(trimmedTarget)) {
    return trimmedTarget;
  }

  const baseDir = path.posix.dirname(baseRequestPath);
  const targetUrl = new URL(trimmedTarget, `http://local${baseDir}/`);
  const signedQuery = buildSignedQuery(targetUrl.pathname, expires);

  targetUrl.searchParams.set("expires", signedQuery.expires);
  targetUrl.searchParams.set("token", signedQuery.token);

  return `${targetUrl.pathname}${targetUrl.search}`;
};

const rewritePlaylist = (playlistContent, requestPath, expires) => {
  return String(playlistContent || "")
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return line;
      }

      if (!trimmed.startsWith("#")) {
        return buildSignedAbsolutePath(requestPath, trimmed, expires);
      }

      if (!trimmed.includes('URI="')) {
        return line;
      }

      return line.replace(/URI="([^"]+)"/g, (_, uriValue) => {
        const signedUri = buildSignedAbsolutePath(requestPath, uriValue, expires);
        return `URI="${signedUri}"`;
      });
    })
    .join("\n");
};

const handleProtectedVideoRequest = async (req, res) => {
  try {
    const requestPath = normalizeStreamPath(req.path);
    const { expires, token } = req.query;

    if (!verifySignedStreamPath(requestPath, expires, token)) {
      return res.status(403).send("Forbidden");
    }

    const absolutePath = resolveVideoFilePath(requestPath);
    const fileExtension = path.extname(absolutePath).toLowerCase();

    await fs.access(absolutePath);
    setCorsHeaders(res);
    res.type(getFileContentType(requestPath));

    if (PLAYLIST_EXTENSIONS.has(fileExtension)) {
      const rawPlaylist = await fs.readFile(absolutePath, "utf8");
      const rewrittenPlaylist = rewritePlaylist(
        rawPlaylist,
        requestPath,
        Number(expires)
      );

      return res.send(rewrittenPlaylist);
    }

    return res.sendFile(absolutePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).send("Not found");
    }

    return res.status(400).send(error.message || "Invalid request");
  }
};

app.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "cyberflix-stream-server",
    videoRoot: VIDEO_ROOT,
  });
});

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "cyberflix-stream-server",
  });
});

app.options(/^\/videos\/.+/, (req, res) => {
  setCorsHeaders(res);
  res.status(204).end();
});

app.get(/^\/videos\/.+/, handleProtectedVideoRequest);
app.head(/^\/videos\/.+/, handleProtectedVideoRequest);

app.listen(STREAM_PORT, () => {
  console.log(`Stream server running on http://localhost:${STREAM_PORT}`);
  console.log(`Serving protected files from: ${VIDEO_ROOT}`);
});
