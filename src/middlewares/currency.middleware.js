const { getUserCurrencyFromReq } = require('../utils/currencyHelper');

const currencyMiddleware = async (req, res, next) => {
  try {
    // Fetch context instantly using geoip-lite or headers
    const { countryCode, currency } = await getUserCurrencyFromReq(req);
    
    req.userCountry = countryCode;
    req.userCurrency = currency;

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
