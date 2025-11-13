
// const httpStatus = require('http-status');
// const ApiError = require('../utils/ApiError');
// const Joi = require('joi');
// const { Payment } = require('../models');
// const razorpay = require('../config/razorpay');
// const crypto = require("crypto");


// // =====================
// // 📦 Create Payment
// // =====================
// const createPayment = {
//   validation: {
//     body: Joi.object().keys({
//       full_name: Joi.string(),
//       email: Joi.string(),
//       phone: Joi.number(),
//       plan_id: Joi.string().required(),
//       amount: Joi.number().required(),
//       payment_method: Joi.string().valid("Razorpay", "Stripe", "Paypal").default("Razorpay"),
//     }),
//   },

//   handler: async (req, res) => {
//     try {
//       const { full_name, email, phone, plan_id, amount, payment_method } = req.body;

//       // Razorpay needs amount in paise
//       const options = {
//         amount: amount * 100,
//         currency: "INR",
//         receipt: `receipt_${Date.now()}`,
//       };

//       const order = await razorpay.orders.create(options);

//       // 💾 Save the order immediately as Pending
//       const payment = await Payment.create({
//         full_name,
//         email,
//         phone,
//         plan_id,
//         amount,
//         currency: "INR",
//         transaction_id: order.id,
//         payment_method,
//         payment_status: "Pending",
//       });

//       return res.status(httpStatus.OK).json({
//         success: true,
//         message: "Razorpay order created successfully",
//         key: process.env.RAZORPAY_KEY_ID,
//         order_id: order.id,
//         amount: order.amount,
//         currency: order.currency,
//         data: payment,
//       });
//     } catch (error) {
//       console.error("Create Order Error:", error);
//       res.status(500).json({ success: false, error: "Failed to create order" });
//     }
//   },
// };


// // =====================
// // 💳 Verify Payment
// // =====================
// const verifyPayment = {
//   handler: async (req, res) => {
//     try {
//       const {
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature,
//         amount,
//         plan_id,
//         status,
//       } = req.body;

//       // 🔏 Generate signature for verification
//       const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
//       hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
//       const generatedSignature = hmac.digest("hex");

//       const isAuthentic = generatedSignature === razorpay_signature;

//       // 🟢 Determine final payment status
//       let finalStatus = "failed";
//       if (isAuthentic && status === "captured") {
//         finalStatus = "paid";
//       }

//       // 💾 Save or update payment in DB
//       const payment = await Payment.findOneAndUpdate(
//         { transaction_id: razorpay_order_id },
//         {
//           razorpay_payment_id,
//           razorpay_signature,
//           amount,
//           plan_id,
//           currency: "INR",
//           status: finalStatus,
//         },
//         { upsert: true, new: true }
//       );

//       // ✅ Respond
//       if (finalStatus === "paid") {
//         res.json({
//           success: true,
//           message: "✅ Payment verified & saved successfully",
//           payment,
//         });
//       } else {
//         res.status(400).json({
//           success: false,
//           message: "❌ Payment failed or invalid signature",
//           payment,
//         });
//       }
//     } catch (error) {
//       console.error("Verify Payment Error:", error);
//       res.status(500).json({ success: false, message: "Server error while verifying payment" });
//     }
//   },
// };

// const verifyPaymentStripe = {
//   // handler: async (req, res) => {
//   //   try {
//   //   const { paymentIntentId, status } = req.body;

//   //   if (!paymentIntentId) {
//   //     return res.status(400).json({ message: "PaymentIntent ID is required" });
//   //   }

//   //   // ✅ Retrieve full payment intent and charges
//   //   const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
//   //     expand: ["charges"],
//   //   });

//   //   const charge = paymentIntent.charges?.data?.[0];
//   //   let cardDetails = null;

//   //   // ✅ Extract card info if exists
//   //   if (charge?.payment_method_details?.card) {
//   //     cardDetails = {
//   //       brand: charge.payment_method_details.card.brand,
//   //       last4: charge.payment_method_details.card.last4,
//   //       exp_month: charge.payment_method_details.card.exp_month,
//   //       exp_year: charge.payment_method_details.card.exp_year,
//   //     };
//   //   }

//   //   // ✅ Convert Stripe amount (paise → ₹)
//   //   const finalAmount = paymentIntent.amount / 100;

//   //   // ✅ Safely extract email
//   //   const customerEmail =
//   //     charge?.billing_details?.email ||
//   //     paymentIntent.receipt_email ||
//   //     paymentIntent.customer_email ||
//   //     "N/A";

//   //   // ✅ Final status (fallback if frontend sent manually)
//   //   const finalStatus = status || paymentIntent.status || "unknown";

//   //   console.log("💰 Amount:", finalAmount);
//   //   console.log("📧 Email:", customerEmail);
//   //   console.log("💳 Card:", cardDetails);
//   //   console.log("⚙️ Status:", finalStatus);

//   //   // ✅ Save payment record
//   //   const payment = new Payment({
//   //     paymentIntentId: paymentIntent.id,
//   //     amount: finalAmount,
//   //     currency: paymentIntent.currency,
//   //     status: finalStatus, // ✅ can be succeeded or failed
//   //     customerEmail,
//   //     card: cardDetails,
//   //   });

//   //   await payment.save();

//   //   res.json({
//   //     message: `✅ Payment saved with status: ${finalStatus}`,
//   //     payment,
//   //   });
//   // } catch (error) {
//   //   console.error("❌ Save payment error:", error);
//   //   res.status(500).json({ message: "Server error", error: error.message });
//   // }
//   // },
// };

// module.exports = {
//   createPayment,
//   verifyPayment,
//   verifyPaymentStripe
// };


// // const verifyPayment = {
// //   validation: {
// //     body: Joi.object().keys({
// //       order_id: Joi.string().required(),
// //       payment_id: Joi.string().required(),
// //     //   signature: Joi.string().required(),
// //     }),
// //   },

// //   handler: async (req, res) => {
// //     try {
// //       const { order_id, payment_id, signature } = req.body;

// //       const generatedSignature = crypto
// //         .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
// //         .update(order_id + "|" + payment_id)
// //         .digest("hex");

// //       if (generatedSignature === signature) {
// //         await Payment.findOneAndUpdate(
// //           { transaction_id: order_id },
// //           { payment_status: "Success", transaction_id: payment_id },
// //           { new: true }
// //         );

// //         return res.status(httpStatus.OK).json({
// //           message: "Payment verified successfully",
// //           status: "Success",
// //           payment_id,
// //         });
// //       } else {
// //         await Payment.findOneAndUpdate(
// //           { transaction_id: order_id },
// //           { payment_status: "Failed" }
// //         );

// //         return res.status(httpStatus.BAD_REQUEST).json({
// //           message: "Invalid signature, payment verification failed",
// //           status: "Failed",
// //         });
// //       }
// //     } catch (error) {
// //       console.error("Error verifying payment:", error);
// //       res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
// //     }
// //   },
// // };

// // const createPayment = {
// //     validation: {
// //         body: Joi.object().keys({
// //             user_id: Joi.string(),
// //             category_id: Joi.string(),
// //             plan_id: Joi.string().required(),
// //             amount: Joi.number().required(),
// //             card_number: Joi.number().required(),
// //             card_holder_name: Joi.string().required(),
// //             expiry_date: Joi.string().required(),
// //             cvv: Joi.number().required(),
// //             payment_method: Joi.string().valid("Razorpay", "Stripe", "Paypal").default("Razorpay"),
// //             transaction_id: Joi.string().required(),
// //             payment_status: Joi.string().valid("Pending", "Success", "Failed").default("Pending"),
// //             currency: Joi.string().default("INR"),
// //             remarks: Joi.string().allow("", null),
// //         }),
// //     },

// //     handler: async (req, res) => {
// //         try {
// //             const { user_id, category_id, plan_id, amount, payment_method } = req.body;

// //             // Razorpay requires amount in paise
// //             const options = {
// //                 amount: amount * 100,
// //                 currency: "INR",
// //                 receipt: `receipt_${Date.now()}`,
// //             };

// //             const order = await razorpay.orders.create(options);

// //             // Save order in DB
// //             const payment = await Payment.create({
// //                 user_id,
// //                 category_id,
// //                 plan_id,
// //                 amount,
// //                 transaction_id: order.id,
// //                 payment_method,
// //                 payment_status: "Pending",
// //             });

// //             return res.status(httpStatus.OK).json({
// //                 message: "Razorpay order created successfully",
// //                 key: process.env.RAZORPAY_KEY_ID,
// //                 order_id: order.id,
// //                 amount: order.amount,
// //                 currency: order.currency,
// //                 data: payment,
// //             });
// //         } catch (error) {
// //             console.error("Error creating Razorpay order:", error);
// //             res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
// //         }
// //     },
// // };


// // const createPayment = {
// //   validation: {
// //     body: Joi.object().keys({
// //       user_id: Joi.string().required(),
// //       category_id: Joi.string().required(),
// //       plan_id: Joi.string().required(),
// //       amount: Joi.number().required(),
// //       payment_method: Joi.string().valid("Razorpay", "Stripe", "Paypal").default("Razorpay"),
// //     }),
// //   },

// //   handler: async (req, res) => {
// //     try {
// //       const { user_id, category_id, plan_id, amount, payment_method } = req.body;

// //       // Razorpay requires amount in paise
// //       const options = {
// //         amount: amount * 100,
// //         currency: "INR",
// //         receipt: `receipt_${Date.now()}`,
// //       };

// //       const order = await razorpay.orders.create(options);
// // console.log("order",order);

// //       // Save order in DB
// //       const payment = await Payment.create({
// //         user_id,
// //         category_id,
// //         plan_id,
// //         amount,
// //         transaction_id: order.id,
// //         payment_method,
// //         payment_status: "Pending",
// //       });
// // console.log("payment-----------",payment);

// //       return res.status(httpStatus.OK).json({
// //         message: "Razorpay order created successfully",
// //         key: process.env.RAZORPAY_KEY_ID,
// //         order_id: order.id,
// //         amount: order.amount,
// //         currency: order.currency,
// //         data: payment,
// //       });
// //     } catch (error) {
// //       console.error("Error creating Razorpay order:", error);
// //       res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
// //     }
// //   },
// // };


// module.exports = {
//   createPayment,
//   verifyPayment,
//   verifyPaymentStripe
// };

const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { Payment } = require('../models');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const Stripe = require('stripe');
const { handlePagination } = require('../utils/helper');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =====================
// 📦 Create Razorpay Payment
// =====================
const createPayment = {
  validation: {
    body: Joi.object().keys({
      full_name: Joi.string(),
      email: Joi.string(),
      phone: Joi.number(),
      plan_id: Joi.string().required(),
      amount: Joi.number().required(),
      payment_method: Joi.string().valid('Razorpay', 'Stripe', 'Paypal').default('Razorpay'),
    }),
  },

  handler: async (req, res) => {
    try {
      const { full_name, email, phone, plan_id, amount, payment_method } = req.body;

      // Razorpay needs amount in paise
      const options = {
        amount: amount * 100,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);

      const payment = await Payment.create({
        full_name,
        email,
        phone,
        plan_id,
        amount,
        currency: 'INR',
        transaction_id: order.id,
        payment_method,
        payment_status: 'Pending',
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
        status,
      } = req.body;

      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
      const generatedSignature = hmac.digest('hex');

      const isAuthentic = generatedSignature === razorpay_signature;

      let finalStatus = 'failed';
      if (isAuthentic && status === 'captured') {
        finalStatus = 'paid';
      }

      const payment = await Payment.findOneAndUpdate(
        { transaction_id: razorpay_order_id },
        {
          razorpay_payment_id,
          razorpay_signature,
          amount,
          plan_id,
          currency: 'INR',
          status: finalStatus,
        },
        { upsert: true, new: true }
      );

      if (finalStatus === 'paid') {
        res.json({
          success: true,
          message: '✅ Payment verified & saved successfully',
          payment,
        });
      } else {
        res.status(400).json({
          success: false,
          message: '❌ Payment failed or invalid signature',
          payment,
        });
      }
    } catch (error) {
      console.error('Verify Payment Error:', error);
      res.status(500).json({ success: false, message: 'Server error while verifying payment' });
    }
  },
};

// =====================
// 💰 Create Stripe Payment Intent
// =====================
const createStripePaymentIntent = {
  handler: async (req, res) => {
    try {
      let { amount, currency = 'inr', email } = req.body;

      if (amount < 1000) {
        amount = Math.round(amount * 100);
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        receipt_email: email,
        automatic_payment_methods: { enabled: true },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        message: 'Payment intent created successfully!',
      });
    } catch (error) {
      console.error('❌ Payment intent creation error:', error);
      res.status(400).json({ error: error.message });
    }
  },
};

// =====================
// 💾 Verify / Save Stripe Payment
// =====================
const verifyPaymentStripe = {
  handler: async (req, res) => {
    try {
      const { paymentIntentId, status, payment_method } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ message: 'PaymentIntent ID is required' });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['charges'],
      });

      const charge = paymentIntent.charges?.data?.[0];
      let cardDetails = null;

      if (charge?.payment_method_details?.card) {
        cardDetails = {
          brand: charge.payment_method_details.card.brand,
          last4: charge.payment_method_details.card.last4,
          exp_month: charge.payment_method_details.card.exp_month,
          exp_year: charge.payment_method_details.card.exp_year,
        };
      }

      const finalAmount = paymentIntent.amount / 100;

      const customerEmail =
        charge?.billing_details?.email ||
        paymentIntent.receipt_email ||
        paymentIntent.customer_email ||
        'N/A';

      const finalStatus = status || paymentIntent.status || 'unknown';

      const payment = new Payment({
        paymentIntentId: paymentIntent.id,
        amount: finalAmount,
        currency: paymentIntent.currency,
        status: finalStatus,
        customerEmail,
        card: cardDetails,
        payment_method
      });

      await payment.save();

      res.json({
        message: `✅ Payment saved with status: ${finalStatus}`,
        payment,
      });
    } catch (error) {
      console.error('❌ Save payment error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
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