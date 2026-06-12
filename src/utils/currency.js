// const currencyRates = {
//   INR_USD: 0.012,
//   INR_AUD: 0.018,
//   INR_EUR: 0.011,
// };

// const convertPrice = (inr, country) => {
//   switch (country) {
//     case "USA":
//       return { price: (inr * currencyRates.INR_USD).toFixed(2), currency: "USD" };

//     case "Australia":
//       return { price: (inr * currencyRates.INR_AUD).toFixed(2), currency: "AUD" };

//     case "Europe":
//       return { price: (inr * currencyRates.INR_EUR).toFixed(2), currency: "EUR" };

//     default:
//       return { price: inr, currency: "INR" };   // India
//   }
// };

// module.exports = { convertPrice };
const axios = require("axios");

async function getCurrencyFromCountry(countryName) {
  console.log(`[getCurrencyFromCountry] Called with countryName: "${countryName}"`);
  try {
    if (!countryName) {
      console.log(`[getCurrencyFromCountry] Empty countryName. Fallback: "USD"`);
      return "USD";
    }

    const trimmedCountry = countryName.trim();
    // Common mappings to standard ISO codes
    const countryMap = {
      USA: "US",
      UK: "GB",
      UAE: "AE",
      Europe: "DE", // pick major EUR country
      EU: "DE",
      Russia: "RU",
    };

    let searchKey = trimmedCountry;
    if (countryMap[trimmedCountry]) {
      searchKey = countryMap[trimmedCountry];
      console.log(`[getCurrencyFromCountry] Mapped abbreviation "${trimmedCountry}" to ISO code "${searchKey}"`);
    }

    let response = null;
    let url = "";

    // If it looks like a 2 or 3 letter ISO code
    if (searchKey.length === 2 || searchKey.length === 3) {
      url = `https://restcountries.com/v3.1/alpha/${searchKey}`;
      console.log(`[getCurrencyFromCountry] Fetching from alpha endpoint: ${url}`);
      try {
        response = await axios.get(url);
      } catch (err) {
        console.log(`[getCurrencyFromCountry] Alpha endpoint failed for "${searchKey}": ${err.message}. Trying name search...`);
      }
    }

    if (!response) {
      // Try full match by name
      url = `https://restcountries.com/v3.1/name/${searchKey}?fullText=true`;
      console.log(`[getCurrencyFromCountry] Fetching from name endpoint (fullText): ${url}`);
      try {
        response = await axios.get(url);
      } catch (err) {
        console.log(`[getCurrencyFromCountry] Full text name match failed for "${searchKey}": ${err.message}. Trying partial match...`);
        // If fullText fails -> try partial match
        url = `https://restcountries.com/v3.1/name/${searchKey}`;
        console.log(`[getCurrencyFromCountry] Fetching from name endpoint (partial): ${url}`);
        response = await axios.get(url);
      }
    }

    if (response && response.data && response.data[0] && response.data[0].currencies) {
      const currencies = response.data[0].currencies;
      const currencyCode = Object.keys(currencies)[0];
      console.log(`[getCurrencyFromCountry] Successfully resolved "${trimmedCountry}" to currency: "${currencyCode}"`);
      return currencyCode;
    } else {
      console.log(`[getCurrencyFromCountry] No currencies found in response. Fallback: "USD"`);
      return "USD";
    }
  } catch (err) {
    console.log(`❌ [getCurrencyFromCountry] Currency lookup failed for "${countryName}":`, err.message);
    return "USD"; // fallback
  }
}

module.exports = { getCurrencyFromCountry };

