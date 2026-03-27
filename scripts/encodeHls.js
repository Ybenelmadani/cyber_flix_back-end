#!/usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");

const usage = `
Usage:
  node scripts/encodeHls.js --input <video-file> [options]

Options:
  --input <path>        Source video file path (required)
  --slug <value>        Output folder slug, default derived from filename
  --title <value>       Human-readable title used in the suggested admin payload
  --tmdbId <value>      Optional TMDB id printed in the suggested admin payload
  --language <value>    Default: fr
  --quality <value>     Default: auto
  --videoRoot <path>    Override STREAM_VIDEO_ROOT
  --hlsTime <seconds>   Default: 6
  --help                Show this message

Example:
  node scripts/encodeHls.js --input "D:\\videos\\Fight Club.mp4" --slug fight-club --title "Fight Club" --tmdbId 550
`.trim();

const args = process.argv.slice(2);

const readArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return "";
  return args[index + 1] || "";
};

const hasFlag = (flag) => args.includes(flag);

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "video";

const resolveVideoRoot = (customRoot) => {
  const configuredRoot =
    String(customRoot || "").trim() ||
    String(process.env.STREAM_VIDEO_ROOT || "").trim() ||
    "./storage/videos";

  return path.isAbsolute(configuredRoot)
    ? configuredRoot
    : path.resolve(projectRoot, configuredRoot);
};

if (hasFlag("--help")) {
  console.log(usage);
  process.exit(0);
}

const inputValue = readArg("--input");
if (!inputValue) {
  console.error("Missing required argument: --input");
  console.error("");
  console.error(usage);
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputValue);
if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

const derivedSlug = slugify(path.parse(inputPath).name);
const slug = slugify(readArg("--slug") || derivedSlug);
const title = String(readArg("--title") || path.parse(inputPath).name).trim();
const tmdbId = String(readArg("--tmdbId") || "").trim();
const language = String(readArg("--language") || "fr").trim();
const quality = String(readArg("--quality") || "auto").trim();
const hlsTime = Number(readArg("--hlsTime") || 6);
const videoRoot = resolveVideoRoot(readArg("--videoRoot"));
const outputDir = path.join(videoRoot, slug);

fs.mkdirSync(outputDir, { recursive: true });

const ffmpegCheck = spawnSync("ffmpeg", ["-version"], {
  stdio: "ignore",
  shell: false,
});

if (ffmpegCheck.error) {
  console.error("FFmpeg is not installed or not available in PATH.");
  console.error("Install FFmpeg first, then run this command again.");
  console.error("");
  console.error("Suggested admin source after encoding:");
  console.error(
    JSON.stringify(
      {
        name: `${title} Main`,
        provider: "custom",
        playbackId: slug,
        path: `/videos/${slug}/master.m3u8`,
        type: "hls",
        quality,
        language,
        isPremium: false,
        ...(tmdbId ? { tmdbId } : {}),
      },
      null,
      2
    )
  );
  process.exit(1);
}

const outputPattern = path.join(outputDir, "stream_%v.m3u8");
const segmentPattern = path.join(outputDir, "stream_%v_seg_%03d.ts");

const ffmpegArgs = [
  "-y",
  "-i",
  inputPath,
  "-preset",
  "veryfast",
  "-g",
  "48",
  "-sc_threshold",
  "0",
  "-map",
  "0:v:0",
  "-map",
  "0:a:0?",
  "-map",
  "0:v:0",
  "-map",
  "0:a:0?",
  "-s:v:0",
  "1280x720",
  "-b:v:0",
  "2800k",
  "-maxrate:v:0",
  "2996k",
  "-bufsize:v:0",
  "4200k",
  "-s:v:1",
  "854x480",
  "-b:v:1",
  "1400k",
  "-maxrate:v:1",
  "1498k",
  "-bufsize:v:1",
  "2100k",
  "-c:v",
  "libx264",
  "-c:a",
  "aac",
  "-ar",
  "48000",
  "-b:a",
  "128k",
  "-f",
  "hls",
  "-hls_time",
  String(Number.isFinite(hlsTime) && hlsTime > 0 ? hlsTime : 6),
  "-hls_playlist_type",
  "vod",
  "-hls_flags",
  "independent_segments",
  "-hls_segment_filename",
  segmentPattern,
  "-master_pl_name",
  "master.m3u8",
  "-var_stream_map",
  "v:0,a:0 v:1,a:1",
  outputPattern,
];

console.log(`Input: ${inputPath}`);
console.log(`Output directory: ${outputDir}`);
console.log("Starting FFmpeg HLS encoding...");

const ffmpegRun = spawnSync("ffmpeg", ffmpegArgs, {
  stdio: "inherit",
  shell: false,
});

if (ffmpegRun.error || ffmpegRun.status !== 0) {
  console.error("");
  console.error("HLS encoding failed.");
  process.exit(ffmpegRun.status || 1);
}

const payload = {
  name: `${title} Main`,
  provider: "custom",
  playbackId: slug,
  path: `/videos/${slug}/master.m3u8`,
  type: "hls",
  quality,
  language,
  isPremium: false,
};

console.log("");
console.log("HLS encoding completed successfully.");
console.log(`Master playlist: ${path.join(outputDir, "master.m3u8")}`);
console.log("");
console.log("Suggested admin source:");
console.log(JSON.stringify(payload, null, 2));

if (tmdbId) {
  console.log("");
  console.log("Suggested stream record summary:");
  console.log(
    JSON.stringify(
      {
        tmdbId,
        mediaType: "movie",
        title,
        sources: [payload],
      },
      null,
      2
    )
  );
}
