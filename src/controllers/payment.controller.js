
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { Payment } = require('../models');
const razorpay = require('../config/razorpay');
const crypto = require("crypto");


// =====================
// 📦 Create Payment
// =====================
const createPayment = {
  validation: {
    body: Joi.object().keys({
      plan_id: Joi.string().required(),
      amount: Joi.number().required(),
      payment_method: Joi.string().valid("Razorpay", "Stripe", "Paypal").default("Razorpay"),
    }),
  },

  handler: async (req, res) => {
    try {
      const { plan_id, amount, payment_method } = req.body;

      // Razorpay needs amount in paise
      const options = {
        amount: amount * 100,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);

      // 💾 Save the order immediately as Pending
      const payment = await Payment.create({
        plan_id,
        amount,
        currency: "INR",
        transaction_id: order.id,
        payment_method,
        payment_status: "Pending",
      });

      return res.status(httpStatus.OK).json({
        success: true,
        message: "Razorpay order created successfully",
        key: process.env.RAZORPAY_KEY_ID,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        data: payment,
      });
    } catch (error) {
      console.error("Create Order Error:", error);
      res.status(500).json({ success: false, error: "Failed to create order" });
    }
  },
};


// =====================
// 💳 Verify Payment
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
        status,
      } = req.body;

      // 🔏 Generate signature for verification
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generatedSignature = hmac.digest("hex");

      const isAuthentic = generatedSignature === razorpay_signature;

      // 🟢 Determine final payment status
      let finalStatus = "failed";
      if (isAuthentic && status === "captured") {
        finalStatus = "paid";
      }

      // 💾 Save or update payment in DB
      const payment = await Payment.findOneAndUpdate(
        { transaction_id: razorpay_order_id },
        {
          razorpay_payment_id,
          razorpay_signature,
          amount,
          plan_id,
          currency: "INR",
          status: finalStatus,
        },
        { upsert: true, new: true }
      );

      // ✅ Respond
      if (finalStatus === "paid") {
        res.json({
          success: true,
          message: "✅ Payment verified & saved successfully",
          payment,
        });
      } else {
        res.status(400).json({
          success: false,
          message: "❌ Payment failed or invalid signature",
          payment,
        });
      }
    } catch (error) {
      console.error("Verify Payment Error:", error);
      res.status(500).json({ success: false, message: "Server error while verifying payment" });
    }
  },
};


module.exports = {
  createPayment,
  verifyPayment,
};


// const verifyPayment = {
//   validation: {
//     body: Joi.object().keys({
//       order_id: Joi.string().required(),
//       payment_id: Joi.string().required(),
//     //   signature: Joi.string().required(),
//     }),
//   },

//   handler: async (req, res) => {
//     try {
//       const { order_id, payment_id, signature } = req.body;

//       const generatedSignature = crypto
//         .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//         .update(order_id + "|" + payment_id)
//         .digest("hex");

//       if (generatedSignature === signature) {
//         await Payment.findOneAndUpdate(
//           { transaction_id: order_id },
//           { payment_status: "Success", transaction_id: payment_id },
//           { new: true }
//         );

//         return res.status(httpStatus.OK).json({
//           message: "Payment verified successfully",
//           status: "Success",
//           payment_id,
//         });
//       } else {
//         await Payment.findOneAndUpdate(
//           { transaction_id: order_id },
//           { payment_status: "Failed" }
//         );

//         return res.status(httpStatus.BAD_REQUEST).json({
//           message: "Invalid signature, payment verification failed",
//           status: "Failed",
//         });
//       }
//     } catch (error) {
//       console.error("Error verifying payment:", error);
//       res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
//     }
//   },
// };

// const createPayment = {
//     validation: {
//         body: Joi.object().keys({
//             user_id: Joi.string(),
//             category_id: Joi.string(),
//             plan_id: Joi.string().required(),
//             amount: Joi.number().required(),
//             card_number: Joi.number().required(),
//             card_holder_name: Joi.string().required(),
//             expiry_date: Joi.string().required(),
//             cvv: Joi.number().required(),
//             payment_method: Joi.string().valid("Razorpay", "Stripe", "Paypal").default("Razorpay"),
//             transaction_id: Joi.string().required(),
//             payment_status: Joi.string().valid("Pending", "Success", "Failed").default("Pending"),
//             currency: Joi.string().default("INR"),
//             remarks: Joi.string().allow("", null),
//         }),
//     },

//     handler: async (req, res) => {
//         try {
//             const { user_id, category_id, plan_id, amount, payment_method } = req.body;

//             // Razorpay requires amount in paise
//             const options = {
//                 amount: amount * 100,
//                 currency: "INR",
//                 receipt: `receipt_${Date.now()}`,
//             };

//             const order = await razorpay.orders.create(options);

//             // Save order in DB
//             const payment = await Payment.create({
//                 user_id,
//                 category_id,
//                 plan_id,
//                 amount,
//                 transaction_id: order.id,
//                 payment_method,
//                 payment_status: "Pending",
//             });

//             return res.status(httpStatus.OK).json({
//                 message: "Razorpay order created successfully",
//                 key: process.env.RAZORPAY_KEY_ID,
//                 order_id: order.id,
//                 amount: order.amount,
//                 currency: order.currency,
//                 data: payment,
//             });
//         } catch (error) {
//             console.error("Error creating Razorpay order:", error);
//             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
//         }
//     },
// };


// const createPayment = {
//   validation: {
//     body: Joi.object().keys({
//       user_id: Joi.string().required(),
//       category_id: Joi.string().required(),
//       plan_id: Joi.string().required(),
//       amount: Joi.number().required(),
//       payment_method: Joi.string().valid("Razorpay", "Stripe", "Paypal").default("Razorpay"),
//     }),
//   },

//   handler: async (req, res) => {
//     try {
//       const { user_id, category_id, plan_id, amount, payment_method } = req.body;

//       // Razorpay requires amount in paise
//       const options = {
//         amount: amount * 100,
//         currency: "INR",
//         receipt: `receipt_${Date.now()}`,
//       };

//       const order = await razorpay.orders.create(options);
// console.log("order",order);

//       // Save order in DB
//       const payment = await Payment.create({
//         user_id,
//         category_id,
//         plan_id,
//         amount,
//         transaction_id: order.id,
//         payment_method,
//         payment_status: "Pending",
//       });
// console.log("payment-----------",payment);

//       return res.status(httpStatus.OK).json({
//         message: "Razorpay order created successfully",
//         key: process.env.RAZORPAY_KEY_ID,
//         order_id: order.id,
//         amount: order.amount,
//         currency: order.currency,
//         data: payment,
//       });
//     } catch (error) {
//       console.error("Error creating Razorpay order:", error);
//       res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
//     }
//   },
// };


module.exports = {
    createPayment,
    verifyPayment,
};