# Local Streaming Guide

This project can now serve protected local HLS files with:

- API server on `3001`
- Protected stream server on `8080`
- React player using `Hls.js`

## 1. Start the servers

In `cyberflix-backend`:

```bash
npm run dev
npm run stream:dev
```

## 2. Encode a movie to HLS

If `ffmpeg` is installed and available in your PATH:

```bash
node scripts/encodeHls.js --input "C:\\path\\to\\Fight Club.mp4" --slug fight-club --title "Fight Club" --tmdbId 550
```

This creates files under:

```text
storage/videos/fight-club/
```

Expected output:

```text
storage/videos/fight-club/master.m3u8
storage/videos/fight-club/stream_0.m3u8
storage/videos/fight-club/stream_1.m3u8
storage/videos/fight-club/stream_0_seg_000.ts
...
```

## 3. Add the source in admin

Use this source object in the admin stream panel:

```json
{
  "name": "Fight Club Main",
  "provider": "custom",
  "playbackId": "fight-club",
  "path": "/videos/fight-club/master.m3u8",
  "type": "hls",
  "quality": "auto",
  "language": "fr",
  "isPremium": false
}
```

## 4. Important notes

- `STREAM_BASE_URL` should stay `http://localhost:8080` for local testing.
- `STREAM_SIGNING_SECRET` must match between the API and the stream server.
- The protected stream server rewrites child playlists and segment URLs so token validation continues to work for the full HLS chain.
- If `ffmpeg` is missing, install it first. The encoding script will stop and tell you.
