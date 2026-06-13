const axios = require("axios");

// Helper to check if an IP is loopback or private network range
const isLocalIp = (ipAddress) => {
  if (!ipAddress) return true;
  const cleaned = ipAddress.trim();
  return (
    cleaned === "::1" ||
    cleaned === "127.0.0.1" ||
    cleaned === "localhost" ||
    cleaned.startsWith("127.") ||
    cleaned.startsWith("192.168.") ||
    cleaned.startsWith("10.") ||
    cleaned.startsWith("172.16.") ||
    cleaned.startsWith("172.17.") ||
    cleaned.startsWith("172.18.") ||
    cleaned.startsWith("172.19.") ||
    cleaned.startsWith("172.20.") ||
    cleaned.startsWith("172.21.") ||
    cleaned.startsWith("172.22.") ||
    cleaned.startsWith("172.23.") ||
    cleaned.startsWith("172.24.") ||
    cleaned.startsWith("172.25.") ||
    cleaned.startsWith("172.26.") ||
    cleaned.startsWith("172.27.") ||
    cleaned.startsWith("172.28.") ||
    cleaned.startsWith("172.29.") ||
    cleaned.startsWith("172.30.") ||
    cleaned.startsWith("172.31.") ||
    cleaned.includes("::ffff:127.0.0.1") ||
    cleaned.startsWith("fe80:")
  );
};

async function getCountryFromIP(reqOrIp) {
  // console.log(`[getCountryFromIP] Called with reqOrIp type: ${typeof reqOrIp}`);
  try {
    let ip = "";
    let countryCode = "";

    if (reqOrIp && typeof reqOrIp === "object") {
      const req = reqOrIp;
      
      // 0. Use injected override from middleware if available
      if (req.userCountry) {
        return req.userCountry;
      }

      // 1. Try proxy geo headers first
      countryCode =
        req.headers["cf-ipcountry"] ||
        req.headers["x-vercel-ip-country"] ||
        req.headers["cloudfront-viewer-country"] ||
        req.headers["x-country-code"] ||
        req.headers["x-real-ip-country"];

      // Commented out to prevent printing massive request objects
      // console.log(req,"req???????")
      if (countryCode && countryCode.trim().toUpperCase() !== "XX") {
        const cleanedCode = countryCode.trim().toUpperCase();
        // console.log(`[getCountryFromIP] Detected country code from proxy headers: "${cleanedCode}"`);
        return cleanedCode;
      }

      // Extract IP for fallback
      ip =
        process.env.TEST_IP ||
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        "";
      // console.log(`[getCountryFromIP] No proxy geo headers. Extracted IP for fallback: "${ip}"`);
    } else if (typeof reqOrIp === "string") {
      ip = reqOrIp;
      // console.log(`[getCountryFromIP] String input received as IP: "${ip}"`);
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
    // If local/loopback IP, query without suffix to get the host's own public IP location
    const isLocal = isLocalIp(ip);
    const url = isLocal ? "http://ip-api.com/json/" : `http://ip-api.com/json/${ip}`;

    // console.log(`[getCountryFromIP] Querying IP API: ${url}`);
    const res = await axios.get(url, { timeout: 3000 });
    if (res.data && res.data.countryCode) {
      const apiCode = res.data.countryCode.toUpperCase();
      // console.log(`[getCountryFromIP] IP API resolved "${ip}" to: "${apiCode}"`);
      return apiCode;
    }

    // If API didn't resolve countryCode, fall back based on server/host timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isHostIndia = tz === "Asia/Kolkata" || tz === "Asia/Calcutta";
    return isHostIndia ? "IN" : "US";
  } catch (err) {
    // Default fallback on error: check server/host timezone so local Indian developer gets INR
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isHostIndia = tz === "Asia/Kolkata" || tz === "Asia/Calcutta";
    return isHostIndia ? "IN" : "US";
  }
}

module.exports = getCountryFromIP;
