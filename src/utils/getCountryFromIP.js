const geoip = require('geoip-lite');

/**
 * Detect the user's 2-letter ISO country code from their IP address.
 *
 * Priority chain:
 *   1. req.userCountry  — injected by middleware (if any)
 *   2. CDN proxy headers — cf-ipcountry, x-vercel-ip-country, cloudfront-viewer-country
 *   3. process.env.TEST_IP override (dev only)
 *   4. geoip-lite local DB lookup (MaxMind GeoLite2, <1 ms)
 *   5. Fallback: "US"
 *
 * @param {object|string} reqOrIp  Express req object, or raw IP string
 * @returns {string} 2-letter ISO country code  e.g. "IN", "US", "GB"
 */
async function getCountryFromIP(reqOrIp) {
  try {
    let ip = '';

    // ── Handle Express request object ──────────────────────────
    if (reqOrIp && typeof reqOrIp === 'object') {
      const req = reqOrIp;

      // 1. Middleware-injected override
      if (req.userCountry) {

        return req.userCountry;
      }

      // 2. CDN / reverse-proxy geo headers
      const headerCountry =
        req.headers['cf-ipcountry'] ||
        req.headers['x-vercel-ip-country'] ||
        req.headers['cloudfront-viewer-country'] ||
        req.headers['x-country-code'] ||
        req.headers['x-real-ip-country'];

      if (headerCountry && headerCountry.trim().toUpperCase() !== 'XX') {
        const code = headerCountry.trim().toUpperCase();

        return code;
      }

      // 3. Extract IP — TEST_IP takes priority for dev testing
      // let testIp = process.env.TEST_IP || '';
      // if (testIp) testIp = testIp.split('#')[0].trim();

      ip =
        // testIp ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        '';
    } else if (typeof reqOrIp === 'string') {
      ip = reqOrIp;
    }

    // Clean up
    if (ip) {
      ip = ip.trim();
      // Strip IPv6-mapped-IPv4 prefix  "::ffff:1.2.3.4" → "1.2.3.4"
      if (ip.startsWith('::ffff:')) {
        ip = ip.slice(7);
      }
    }

    // 4. Skip lookup for localhost / loopback / private IPs
    if (!ip || isLocalIp(ip)) {

      return 'US';
    }

    // 5. MaxMind GeoLite2 local DB lookup (< 1 ms)
    const geo = geoip.lookup(ip);
    if (geo && geo.country) {

      return geo.country.toUpperCase();
    }


    return 'US';
  } catch (err) {

    return 'US';
  }
}

/**
 * Check if an IP address is loopback or private-network.
 */
function isLocalIp(ipAddress) {
  if (!ipAddress) return true;
  const ip = ipAddress.trim();
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip === 'localhost' ||
    ip.startsWith('127.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('fe80:')
  );
}

module.exports = getCountryFromIP;
