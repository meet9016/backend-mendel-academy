/**
 * Centralized currency helpers for the binary INR/USD pricing model.
 *
 * Business Rule: India (country code "IN") → INR, rest of world → USD.
 * The database stores only price_usd and price_inr fields.
 *
 * Usage:
 *   const { getDisplayCurrency, getPriceForCurrency, getUserCurrencyFromReq, getUserCountryInfo } = require('../utils/currencyHelper');
 *
 *   // Simple — returns { countryCode, currency }
 *   const { countryCode, currency } = await getUserCurrencyFromReq(req);
 *
 *   // Detailed — returns { country, countryCode, currency }
 *   const info = await getUserCountryInfo(req);
 */

const getCountryFromIP = require('./getCountryFromIP');

/**
 * Returns the display currency code based on ISO country code.
 * @param {string} countryCode - 2-letter ISO country code (e.g., "IN", "US", "GB")
 * @returns {string} "INR" for India, "USD" for all others
 */
const getDisplayCurrency = (countryCode) => {
    return countryCode === 'IN' ? 'INR' : 'USD';
};

/**
 * Returns the correct price based on the user's currency.
 * @param {number} priceUsd - Price in USD
 * @param {number} priceInr - Price in INR
 * @param {string} currency - "INR" or "USD"
 * @returns {number} The appropriate price value
 */
const getPriceForCurrency = (priceUsd, priceInr, currency) => {
    return currency === 'INR' ? priceInr : priceUsd;
};

/**
 * Detects the user's country from the request IP and returns currency info.
 * Use this in controllers that only need { countryCode, currency }.
 *
 * @param {object} req - Express request object
 * @returns {Promise<{countryCode: string, currency: string}>}
 */
const getUserCurrencyFromReq = async (req) => {
    try {
        const countryCode = await getCountryFromIP(req);
        const currency = getDisplayCurrency(countryCode);

        return { countryCode, currency };
    } catch (err) {

        return { countryCode: 'US', currency: 'USD' };
    }
};

/**
 * Detects the user's country from the request IP and returns full info.
 * Use this in controllers that need { country, countryCode, currency } (e.g., examCategory, prerecorded, livecourses).
 *
 * @param {object} req - Express request object
 * @returns {Promise<{country: string, countryCode: string, currency: string}>}
 */
const getUserCountryInfo = async (req) => {
    try {
        const countryCode = await getCountryFromIP(req);
        const currency = getDisplayCurrency(countryCode);
        const country = countryCode === 'IN' ? 'India' : 'United States';
        const result = { country, countryCode, currency };

        return result;
    } catch (err) {

        return { country: 'United States', countryCode: 'US', currency: 'USD' };
    }
};

module.exports = {
    getDisplayCurrency,
    getPriceForCurrency,
    getUserCurrencyFromReq,
    getUserCountryInfo
};
