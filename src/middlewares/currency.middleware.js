const getCountryFromIP = require('../utils/getCountryFromIP');
const { getCurrencyFromCountry } = require('../utils/currency');

// Simple in-memory cache for IP context to prevent hitting ip-api.com repeatedly
const ipContextCache = new Map();

const currencyMiddleware = async (req, res, next) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || req.ip || "unknown";

    // 1. Check cache first
    if (ipContextCache.has(ip)) {
      const cached = ipContextCache.get(ip);
      req.userCountry = cached.country;
      req.userCurrency = cached.currency;
    } else {
      // ==========================================
      // 🛠️ TESTING OVERRIDE
      // Change this to "US", "IN", "GB", etc. to test frontend changes.
      // Set to null to use actual IP detection.
      const TEST_COUNTRY_CODE = "IN"; // <-- CHANGE THIS FOR TESTING
      // ==========================================

      // 2. Fetch context
      const countryCode =  await getCountryFromIP(req);
      let currency = "USD";

      if (countryCode === "IN" || countryCode === "INDIA") {
        currency = "INR";
      } else {
        currency = (await getCurrencyFromCountry(countryCode)).toUpperCase();
      }

      req.userCountry = countryCode;
      req.userCurrency = currency;

      // Store in cache (limit size to prevent memory leaks)
      if (ipContextCache.size > 1000) {
        const firstKey = ipContextCache.keys().next().value;
        ipContextCache.delete(firstKey);
      }
      ipContextCache.set(ip, { country: countryCode, currency });
    }

    // 3. Intercept res.json
    const originalJson = res.json;
    res.json = function (body) {
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        // Check if the body already has it so we don't overwrite custom values
        if (body.user_country === undefined) {
          body.user_country = req.userCountry;
        }
        if (body.user_currency === undefined) {
          body.user_currency = req.userCurrency;
        }
      }
      return originalJson.call(this, body);
    };

    next();
  } catch (err) {
    console.error("❌ [currency.middleware] Error setting IP context:", err);
    // Even if it fails, let the request proceed
    next();
  }
};

module.exports = currencyMiddleware;
