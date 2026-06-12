const axios = require("axios");

async function getCountryFromIP(reqOrIp) {
  console.log(`[getCountryFromIP] Called with reqOrIp type: ${typeof reqOrIp}`);
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
        const cleanedCode = countryCode.trim().toUpperCase();
        console.log(`[getCountryFromIP] Detected country code from proxy headers: "${cleanedCode}"`);
        return cleanedCode;
      }

      // Extract IP for fallback
      ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        "";
      console.log(`[getCountryFromIP] No proxy geo headers. Extracted IP for fallback: "${ip}"`);
    } else if (typeof reqOrIp === "string") {
      ip = reqOrIp;
      console.log(`[getCountryFromIP] String input received as IP: "${ip}"`);
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
      console.log(`[getCountryFromIP] Local/Dev IP detected: "${ip}". Defaulting to "IN"`);
      return "IN";
    }

    // 3. Fallback to IP API (HTTP request)
    const url = `http://ip-api.com/json/${ip}`;
    console.log(`[getCountryFromIP] Querying IP API: ${url}`);
    const res = await axios.get(url);
    if (res.data && res.data.countryCode) {
      const apiCode = res.data.countryCode.toUpperCase();
      console.log(`[getCountryFromIP] IP API resolved "${ip}" to: "${apiCode}"`);
      return apiCode;
    }
    console.log(`[getCountryFromIP] IP API response did not contain countryCode. Defaulting to "US"`);
    return "US";
  } catch (err) {
    // 4. Default fallback on error is US so international/USA users get USD
    console.log(`[getCountryFromIP] Error in IP detection for "${reqOrIp}": ${err.message}. Defaulting to "US"`);
    return "US";
  }
}

module.exports = getCountryFromIP;
