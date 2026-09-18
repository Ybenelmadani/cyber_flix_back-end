const axios = require('axios');

const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL || 'http://localhost:8191/v1';

/**
 * Make an HTTP GET request through FlareSolverr to bypass Cloudflare.
 * FlareSolverr must be running on localhost:8191 (via Docker).
 */
async function flareGet(url, options = {}) {
  const payload = {
    cmd: 'request.get',
    url,
    maxTimeout: 60000,
    ...(options.cookies ? { cookies: options.cookies } : {}),
  };

  const res = await axios.post(FLARESOLVERR_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 70000,
  });

  const solution = res.data?.solution;
  if (!solution || solution.status !== 200) {
    throw new Error(`FlareSolverr failed: status=${solution?.status || 'unknown'} url=${url}`);
  }

  return {
    status: solution.status,
    data: solution.response,
    cookies: solution.cookies,
    headers: solution.headers,
  };
}

async function flarePost(url, postData, options = {}) {
  const payload = {
    cmd: 'request.post',
    url,
    postData,
    maxTimeout: 60000,
    ...(options.cookies ? { cookies: options.cookies } : {}),
  };

  const res = await axios.post(FLARESOLVERR_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 70000,
  });

  const solution = res.data?.solution;
  if (!solution || solution.status !== 200) {
    throw new Error(`FlareSolverr POST failed: status=${solution?.status || 'unknown'} url=${url}`);
  }

  return {
    status: solution.status,
    data: solution.response,
    cookies: solution.cookies,
    headers: solution.headers,
  };
}

/**
 * Test FlareSolverr connectivity
 */
async function testFlareSolverr() {
  try {
    const res = await axios.get('http://localhost:8191/', { timeout: 5000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

module.exports = { flareGet, flarePost, testFlareSolverr };
