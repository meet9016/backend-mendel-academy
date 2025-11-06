const crypto = require("crypto")
const dotenv = require("dotenv")
const Razorpay = require("razorpay")
const Payment = require("../models/payment.model");

dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = {
    handler: async (req, res) => {
        try {
            const options = {
                amount: req.body.amount * 100, // amount in paise
                currency: "INR",
                receipt: `receipt_${Date.now()}`,
            };

            const order = await razorpay.orders.create(options);

            // Just return the order to frontend — don’t save yet
            res.json(order);
        } catch (error) {
            console.error("Create Order Error:", error);
            res.status(500).json({ error: "Failed to create order" });
        }
    }
};

const verifyPayment = {
    handler: async (req, res) => {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, payment_status } = req.body;

            // Generate signature
            const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
            hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
            const generatedSignature = hmac.digest("hex");

            // Verify authenticity
            const isAuthentic = generatedSignature === razorpay_signature;

            // Determine status
            let finalStatus = "failed"; // default

            if (isAuthentic && payment_status === "captured") {
                finalStatus = "paid";
            } else if (isAuthentic && payment_status === "failed") {
                finalStatus = "failed";
            } else if (!isAuthentic) {
                finalStatus = "failed";
            }

            // Always save to DB
            const payment = new Payment({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                amount,
                currency: "INR",
                status: finalStatus,
            });

            console.log('payment', payment)
            await payment.save();

            if (finalStatus === "paid") {
                res.json({ success: true, message: "✅ Payment successful & saved", status: finalStatus });
            } else {
                res.status(400).json({ success: false, message: "❌ Payment failed but saved", status: finalStatus });
            }
        } catch (error) {
            console.error("Verify Payment Error:", error);
            res.status(500).json({ success: false, message: "Server error while verifying payment" });
        }
    }
};

module.exports = {
  createOrder,
  verifyPayment,
};