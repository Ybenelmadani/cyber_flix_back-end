const crypto = require("crypto");
require("dotenv").config();

const DEFAULT_STREAM_PORT = Number(process.env.STREAM_PORT || 8080);
const DEFAULT_TTL_MINUTES = Number(process.env.STREAM_URL_TTL_MINUTES || 30);

const getStreamBaseUrl = () =>
  process.env.STREAM_BASE_URL || `http://localhost:${DEFAULT_STREAM_PORT}`;

const getStreamSigningSecret = () => process.env.STREAM_SIGNING_SECRET || "";

const normalizeStreamPath = (streamPath) => {
  const value = String(streamPath || "").trim();
  if (!value) {
    throw new Error("Stream path is required");
  }

  return value.startsWith("/") ? value : `/${value}`;
};

const buildSignedToken = (streamPath, expires) => {
  const secret = getStreamSigningSecret();
  if (!secret) {
    throw new Error("STREAM_SIGNING_SECRET missing");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`${streamPath}:${expires}`)
    .digest("hex");
};

const signStreamPath = (streamPath, options = {}) => {
  const normalizedPath = normalizeStreamPath(streamPath);
  const baseUrl = getStreamBaseUrl();

  if (!baseUrl) {
    throw new Error("STREAM_BASE_URL missing");
  }

  const expires =
    options.expires ??
    Math.floor(Date.now() / 1000) + DEFAULT_TTL_MINUTES * 60;

  const token = buildSignedToken(normalizedPath, expires);
  const signedUrl = new URL(`${baseUrl}${normalizedPath}`);
  signedUrl.searchParams.set("expires", String(expires));
  signedUrl.searchParams.set("token", token);

  return signedUrl.toString();
};

const buildSignedQuery = (streamPath, expires) => {
  const normalizedPath = normalizeStreamPath(streamPath);
  const resolvedExpiry =
    expires ?? Math.floor(Date.now() / 1000) + DEFAULT_TTL_MINUTES * 60;

  return {
    expires: String(resolvedExpiry),
    token: buildSignedToken(normalizedPath, resolvedExpiry),
  };
};

const verifySignedStreamPath = (streamPath, expires, token) => {
  const normalizedPath = normalizeStreamPath(streamPath);
  const expiresNumber = Number(expires);
  const incomingToken = String(token || "").trim();

  if (!Number.isFinite(expiresNumber) || expiresNumber <= 0 || !incomingToken) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (expiresNumber < now) {
    return false;
  }

  const expected = buildSignedToken(normalizedPath, expiresNumber);
  if (expected.length !== incomingToken.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(incomingToken)
  );
};

module.exports = {
  buildSignedQuery,
  getStreamBaseUrl,
  normalizeStreamPath,
  signStreamPath,
  verifySignedStreamPath,
};
