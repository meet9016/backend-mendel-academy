const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { Payment } = require('../models');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const Stripe = require('stripe');
const { handlePagination } = require('../utils/helper');
const { getLiveRates } = require('../utils/exchangeRates');
const { getCurrencyFromCountry } = require('../utils/currency');
const getCountryFromIP = require('../utils/getCountryFromIP');
const Cart = require('../models/cart.model');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =====================
// 📦 Create Razorpay Payment
// =====================
const createPayment = {
  validation: {
    body: Joi.object().keys({
      full_name: Joi.string().allow("").optional(),
      email: Joi.string().allow("").optional(),
      phone: Joi.string().allow("").optional(),
      plan_id: Joi.string(),
      user_id: Joi.string(),
      amount: Joi.number().required(),
      currency: Joi.string().allow(""),
      payment_method: Joi.string().valid('Razorpay', 'Stripe', 'Paypal').default('Razorpay'),
      payment_status: Joi.string().valid('Pending', 'Processing', 'Paid', 'Failed').default('Pending'),
    }),
  },

  handler: async (req, res) => {
    try {
      const { full_name = "", email = "", phone = "", plan_id, user_id, amount, payment_method, payment_status, currency } = req.body;

      // 1️⃣ Detect country if not sent
      let userCountry = currency;
      if (!userCountry) {
        const ip =
          req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          req.socket.remoteAddress;
        userCountry = await getCountryFromIP(ip);
      }

      // 2️⃣ Convert Country → Currency Code
      let currencys = (await getCurrencyFromCountry(userCountry)).toUpperCase();

      // ⚠ Razorpay supports a limited set of currencies
      const supportedCurrencies = [
        "INR", "USD", "EUR", "GBP", "AED", "SAR", "AUD", "SGD",
        "CAD", "MYR", "QAR", "BHD", "OMR", "NZD"
      ];

      if (!supportedCurrencies.includes(currencys)) {
        currencys = "USD"; // fallback
      }

      // Razorpay needs amount in smallest currency unit
      const options = {
        amount: Math.round(amount * 100),
        currency,
        receipt: `receipt_${Date.now()}`,
      };

      // 3️⃣ Create Razorpay Order
      const order = await razorpay.orders.create(options);

      // 4️⃣ Store payment entry
      const payment = await Payment.create({
        full_name,
        email,
        phone,
        plan_id,
        user_id,
        amount,
        currency,
        transaction_id: order.id,
        payment_method,
        payment_status,
      });

      return res.status(httpStatus.OK).json({
        success: true,
        message: 'Razorpay order created successfully',
        key: process.env.RAZORPAY_KEY_ID,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        data: payment,
      });

    } catch (error) {
      console.error('Create Order Error:', error);
      res.status(500).json({ success: false, error: 'Failed to create order' });
    }
  },
};

// =====================
// 💳 Verify Razorpay Payment
// =====================
const verifyPayment = {
  handler: async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount,
        plan_id,
        user_id,      // can be real user ID or guest ID
        status,       // "captured"
      } = req.body;

      // 1️⃣ SIGNATURE VALIDATION
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generatedSignature = hmac.digest("hex");

      const isAuthentic = generatedSignature === razorpay_signature;

      let finalStatus = "failed";
      if (isAuthentic && status === "captured") {
        finalStatus = "paid";
      }

      // 2️⃣ SAVE / UPDATE PAYMENT ENTRY
      const payment = await Payment.findOneAndUpdate(
        { transaction_id: razorpay_order_id },
        {
          razorpay_payment_id,
          razorpay_signature,
          amount,
          plan_id,
          user_id,
          payment_status: finalStatus,
        },
        { upsert: true, new: true }
      );

      console.log("Payment status:", finalStatus);

      // 3️⃣ UPDATE CART AFTER SUCCESSFUL PAYMENT
      if (finalStatus === "paid") {
        let matchQuery;

        // ------------------------
        // Guest User (temp_id case)
        // ------------------------
        if (typeof user_id === "string" && user_id.startsWith("guest_")) {
          matchQuery = { temp_id: user_id }; // guest cart
        }
        // ------------------------
        // Logged In User
        // ------------------------
        else {
          matchQuery = { user_id: user_id }; // real user cart
        }

        // Update cart bucket_type → false
        const cartUpdate = await Cart.updateMany(
          matchQuery,
          { $set: { bucket_type: false } }
        );
        return res.json({
          success: true,
          message: "✅ Payment verified & cart updated",
          payment,
        });
      }

      // 4️⃣ PAYMENT FAILED
      return res.status(400).json({
        success: false,
        message: "❌ Payment failed or invalid signature",
        payment,
      });

    } catch (error) {
      console.error("Verify Payment Error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while verifying payment",
      });
    }
  },
};

const createStripePaymentIntent = {
  handler: async (req, res) => {
    try {
      let { amount, country, email, plan_id } = req.body;

      if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
      }

      // Auto detect country
      if (!country) {
        const ip =
          req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          req.socket.remoteAddress;
        country = await getCountryFromIP(ip);
      }

      // Convert country → currency
      let currency = (await getCurrencyFromCountry(country)).toLowerCase();

      let stripeAmount = Math.round(amount * 100);

      try {
        const intent = await stripe.paymentIntents.create({
          amount: stripeAmount,
          currency,
          receipt_email: email,
          automatic_payment_methods: { enabled: true },
        });

        return res.json({
          clientSecret: intent.client_secret,
          amount: stripeAmount / 100,
          currency: currency.toUpperCase(),
          message: "Payment Intent created",
        });

      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};

/* ------------------------------------------------
   4️⃣ VERIFY & SAVE STRIPE PAYMENT
-------------------------------------------------- */
const verifyPaymentStripe = {
  handler: async (req, res) => {
    try {
      const {
        paymentIntentId,
        full_name,
        email,
        phone,
        plan_id,
        amount,
      } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ message: "PaymentIntent ID is required" });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId,
        { expand: ["charges"] }
      );

      // Determine final status
      const payment_status =
        paymentIntent.status === "succeeded" ? "paid" : "failed";

      const currency = paymentIntent.currency.toUpperCase();

      // Save payment
      const payment = await Payment.create({
        full_name,
        email,
        phone,
        plan_id,
        amount,
        currency,
        transaction_id: paymentIntent.id,
        payment_method: "Stripe",
        payment_status,
      });
      await Cart.updateMany(
        { temp_id: plan_id },
        { $set: { bucket_type: false } }
      );
      return res.json({
        success: true,
        message: "Stripe payment saved",
        payment,
      });

    } catch (error) {
      console.error("Verify payment error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },
};

const getAllPayment = {
  handler: async (req, res) => {
    const { status, search } = req.query;

    const query = {};

    if (status) query.status = status;
    if (search) query.title = { $regex: search, $options: "i" };

    await handlePagination(Payment, req, res, query);
  }
}
module.exports = {
  createPayment,
  verifyPayment,
  createStripePaymentIntent,
  verifyPaymentStripe,
  getAllPayment
};