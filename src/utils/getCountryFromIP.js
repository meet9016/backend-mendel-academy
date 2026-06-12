const axios = require("axios");

async function getCountryFromIP(reqOrIp) {
  try {
    let ip = "";
    let countryCode = "";

    if (reqOrIp && typeof reqOrIp === "object") {
      const req = reqOrIp;
      // 1. Try proxy geo headers first
      countryCode =
        req.headers["cf-ipcountry"] ||
        req.headers["x-vercel-ip-country"] ||
        req.headers["cloudfront-viewer-country"] ||
        req.headers["x-country-code"] ||
        req.headers["x-real-ip-country"];

      if (countryCode) {
        return countryCode.trim().toUpperCase();
      }

      // Extract IP for fallback
      ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        "";
    } else if (typeof reqOrIp === "string") {
      ip = reqOrIp;
    }

    // Clean up IP
    if (ip) {
      ip = ip.trim();
    }

    // 2. Check for local/dev environment
    if (
      !ip ||
      ip === "::1" ||
      ip === "127.0.0.1" ||
      ip === "localhost" ||
      ip.includes("::ffff:127.0.0.1")
    ) {
      return "IN";
    }

    // 3. Fallback to IP API (HTTP request)
    const res = await axios.get(`http://ip-api.com/json/${ip}`);
    if (res.data && res.data.countryCode) {
      return res.data.countryCode.toUpperCase();
    }
    return "US";
  } catch (err) {
    // 4. Default fallback on error is US so international/USA users get USD
    return "US";
  }
}

module.exports = getCountryFromIP;
