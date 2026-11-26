/*
  How many proxies are in front of the app (Express "trust proxy").
  Express uses it to find the real client IP (req.ip) in X-Forwarded-For.
  The rate limits and the request log use req.ip.

  On Render there are 2: Cloudflare → Render's load balancer → the app.
  - Too low: req.ip is a proxy IP (users share or split rate-limit counters).
  - Too high: a client can fake its IP with its own X-Forwarded-For header.

  TRUST_PROXY in .env: a whole number from 0 to 10. Missing or wrong → 1.
*/
const DEFAULT_TRUST_PROXY = 1;

function parseTrustProxy(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return DEFAULT_TRUST_PROXY;
  }
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return DEFAULT_TRUST_PROXY;

  const hops = Number(text);
  return hops <= 10 ? hops : DEFAULT_TRUST_PROXY;
}

module.exports = { parseTrustProxy, DEFAULT_TRUST_PROXY };
