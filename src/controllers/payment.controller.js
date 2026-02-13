const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const Joi = require("joi");
const {
  Payment,
  LiveCourses,
  HyperSpecialist,
  PreRecord,
  User,
  ExamCategory,
} = require("../models");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const Stripe = require("stripe");
const { handlePagination } = require("../utils/helper");
const { getLiveRates } = require("../utils/exchangeRates");
const { getCurrencyFromCountry } = require("../utils/currency");
const getCountryFromIP = require("../utils/getCountryFromIP");
const Cart = require("../models/cart.model");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const ExcelJS = require("exceljs");
const {
  sendEnrollmentConfirmationEmail,
  sendEnrollmentConfirmationEmailforCreateLink,
  sendEnrollmentConfirmationEmailForPreRecord,
  sendWelcomeAccountEmail,
  sendPurchaseConfirmationEmail,
  sendCombinedPurchaseEmail,
} = require("../services/email.service");
const { createZoomMeeting } = require("../services/zoom.service");

// =====================
// 📦 Create Razorpay Payment
// =====================

function generatePassword(
  length = 12,
  options = {
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
  },
) {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  const syms = "!@#$%^&*()_+[]{}<>?,.";

  let chars = "";

  if (options.lowercase) chars += lower;
  if (options.uppercase) chars += upper;
  if (options.numbers) chars += nums;
  if (options.symbols) chars += syms;

  if (!chars) return "";

  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  return password;
}
const createPayment = {
  validation: {
    body: Joi.object().keys({
      full_name: Joi.string().allow("").optional(),
      email: Joi.string().allow("").optional(),
      phone: Joi.string().allow("").optional(),
      plan_id: Joi.string().allow(null, "").optional(),
      user_id: Joi.string().allow(null, "").optional(),
      guest_id: Joi.string().allow(null, "").optional(),
      amount: Joi.number().required(),
      currency: Joi.string().allow(""),
      payment_method: Joi.string()
        .valid("Razorpay", "Stripe", "Paypal")
        .default("Razorpay"),
      payment_status: Joi.string()
        .valid("Pending", "Processing", "Paid", "Failed")
        .default("Pending"),
    }),
  },

  handler: async (req, res) => {
    try {
      const {
        full_name = "",
        email = "",
        phone = "",
        plan_id,
        user_id,
        guest_id,
        amount,
        payment_method,
        payment_status,
        currency,
      } = req.body;

      // 1️⃣ Detect country if currency not sent
      let finalCurrency = currency;

      if (!finalCurrency) {
        const ip =
          req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          req.socket.remoteAddress;
        const userCountry = await getCountryFromIP(ip);
        finalCurrency = (
          await getCurrencyFromCountry(userCountry)
        ).toUpperCase();
      }

      // ⚠ Razorpay supports a limited set of currencies
      const supportedCurrencies = [
        "INR",
        "USD",
        "EUR",
        "GBP",
        "AED",
        "SAR",
        "AUD",
        "SGD",
        "CAD",
        "MYR",
        "QAR",
        "BHD",
        "OMR",
        "NZD",
      ];

      if (!supportedCurrencies.includes(finalCurrency)) {
        finalCurrency = "USD"; // fallback
      }

      // Razorpay needs amount in smallest currency unit
      const options = {
        amount: Math.round(amount * 100),
        currency: finalCurrency, // ✅ Use finalCurrency here
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
        user_id: user_id || null,
        guest_id: !user_id ? guest_id : null,
        amount,
        currency: finalCurrency, // ✅ Use finalCurrency here
        transaction_id: order.id,
        payment_method,
        payment_status,
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
        user_id, // guest_id OR real user id
        guest_id,
        status, // "captured"
      } = req.body;
      // 1️⃣ Validate Razorpay Signature
      const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generatedSignature = hmac.digest("hex");

      const isAuthentic = generatedSignature === razorpay_signature;
      const finalStatus =
        isAuthentic && status === "captured" ? "paid" : "failed";

      // 2️⃣ Save / Update payment record
      const payment = await Payment.findOneAndUpdate(
        { transaction_id: razorpay_order_id },
        {
          razorpay_payment_id,
          razorpay_signature,
          amount,
          plan_id,
          user_id,
          guest_id: !user_id ? guest_id : null,
          payment_status: finalStatus,
        },
        { new: true },
      );

      // If Not Authentic
      if (finalStatus !== "paid") {
        return res.status(400).json({
          success: false,
          message: "Payment failed or invalid signature",
          payment,
        });
      }

      // 3️⃣ CART UPDATE — Guest OR Logged in User
      let matchQuery = {};

      // Guest User → guest_xxxxx
      if (typeof user_id === "string" && user_id.startsWith("guest_")) {
        matchQuery = { temp_id: user_id, bucket_type: true };
      }
      // Logged In User
      else {
        matchQuery = { user_id, bucket_type: true };
      }
            
      // ✅ Get cart items BEFORE updating (only active cart items)
      const cartItems = await Cart.find(matchQuery);
      
      // ✅ Update cart items to mark as purchased
      await Cart.updateMany(matchQuery, {
        $set: { bucket_type: false, updatedAt: new Date() },
      });
      console.log(`\n🛒 [RAZORPAY] Found ${cartItems.length} cart items for order ${razorpay_order_id}`);
      
      // ✅ Create user account if doesn't exist (do this first)
      let usersDetails = await User.findOne({ email: payment.email });
      if (!usersDetails) {
        let password = generatePassword(8, { lowercase: true, uppercase: true, numbers: true, symbols: false });
        console.log(`👤 [RAZORPAY] Creating new user account for ${payment.email}`);
        usersDetails = await User.create({
          email: payment.email,
          password: password,
          phone: payment.phone,
          first_name: payment.full_name,
          last_name: payment.full_name,
        });
        await sendWelcomeAccountEmail(
          usersDetails.email,
          usersDetails.first_name,
          usersDetails.email,
          password,
        );
        console.log(`✅ [RAZORPAY] Welcome email sent to ${payment.email}`);

        // ✅ Update payment and cart records with the new user_id
        await Payment.updateOne({ _id: payment._id }, { user_id: usersDetails._id, guest_id: null });
        
        // Use a broader query to link ALL items from this guest/user to the new ID
        const linkQuery = typeof user_id === "string" && user_id.startsWith("guest_") 
          ? { temp_id: user_id } 
          : { user_id: user_id };
          
        await Cart.updateMany(linkQuery, { user_id: usersDetails._id, temp_id: null });
        console.log(`🔗 [RAZORPAY] Linked payment and cart items to new user ID: ${usersDetails._id}`);
      } else if (!payment.user_id) {
        // If user already exists but payment wasn't linked (e.g., guest purchase by existing user)
        await Payment.updateOne({ _id: payment._id }, { user_id: usersDetails._id, guest_id: null });
        
        const linkQuery = typeof user_id === "string" && user_id.startsWith("guest_") 
          ? { temp_id: user_id } 
          : { user_id: user_id };

        await Cart.updateMany(linkQuery, { user_id: usersDetails._id, temp_id: null });
        console.log(`🔗 [RAZORPAY] Linked guest payment and cart items to existing user ID: ${usersDetails._id}`);
      }
      
      // ✅ Send enrollment emails for ALL cart items
      const purchasedItems = [];
      for (let i = 0; i < cartItems.length; i++) {
        const cartItem = cartItems[i];
        console.log(`\n📧 [RAZORPAY] Processing cart item ${i + 1}/${cartItems.length}:`, {
          cart_type: cartItem.cart_type,
          livecourse_id: cartItem.livecourse_id,
          hyperspecialist_id: cartItem.hyperspecialist_id,
          product_id: cartItem.product_id,
          exam_category_id: cartItem.exam_category_id,
        });
        
        if (cartItem.cart_type === 'livecourses' && cartItem.livecourse_id) {
          const course = await LiveCourses.findById(cartItem.livecourse_id).catch(() => null);
          if (course) {
            purchasedItems.push({
              productName: course.course_title,
              productType: "Live Course",
              details: cartItem.livecourse_details?.title || 'Module',
              link: course.zoom_link
            });
            console.log(`📝 [RAZORPAY] Added LiveCourse to combined email: ${course.course_title}`);
          }
        } else if (cartItem.cart_type === 'hyperspecialist' && cartItem.hyperspecialist_id) {
          const hyperSpecialist = await HyperSpecialist.findById(cartItem.hyperspecialist_id).catch(() => null);
          if (hyperSpecialist) {
            const zoomMeeting = await createZoomMeeting(`Welcome ${payment.full_name}`);
            purchasedItems.push({
              productName: hyperSpecialist.title,
              productType: "Hyper Specialist",
              details: "Zoom Meeting Created",
              link: zoomMeeting
            });
            console.log(`📝 [RAZORPAY] Added HyperSpecialist to combined email: ${hyperSpecialist.title}`);
          }
        } else if (cartItem.cart_type === 'prerecord' && cartItem.product_id) {
          const preRecord = await PreRecord.findById(cartItem.product_id).catch(() => null);
          if (preRecord) {
            purchasedItems.push({
              productName: preRecord.title,
              productType: "Pre-Recorded Course",
              details: "Video Access",
              link: `https://vimeo.com/${preRecord.vimeo_video_id}`
            });
            console.log(`📝 [RAZORPAY] Added PreRecord to combined email: ${preRecord.title}`);
          }
        } else if (cartItem.cart_type === 'exam_plan' && cartItem.exam_category_id) {
          const examCategory = await ExamCategory.findById(cartItem.exam_category_id).catch(() => null);
          if (examCategory) {
            purchasedItems.push({
              productName: examCategory.category_name,
              productType: "Exam Plan",
              details: `${cartItem.plan_details?.plan_type} Plan`
            });
            console.log(`📝 [RAZORPAY] Added ExamPlan to combined email: ${examCategory.category_name}`);
          }
        } else if (cartItem.cart_type === 'rapid_tool' && cartItem.exam_category_id) {
          const examCategory = await ExamCategory.findById(cartItem.exam_category_id).catch(() => null);
          if (examCategory) {
            const toolName = cartItem.tool_details?.tool_type || 'Rapid Learning Tool';
            purchasedItems.push({
              productName: examCategory.category_name,
              productType: "Rapid Learning Tool",
              details: toolName
            });
            console.log(`📝 [RAZORPAY] Added RapidTool to combined email: ${examCategory.category_name} - ${toolName}`);
          }
        }
      }

      if (purchasedItems.length > 0) {
        await sendCombinedPurchaseEmail(
          payment.email,
          payment.full_name,
          razorpay_order_id,
          purchasedItems
        );
        console.log(`✅ [RAZORPAY] Combined purchase email sent to ${payment.email} for ${purchasedItems.length} items`);
      }
      
      console.log(`\n✅ [RAZORPAY] All processing completed for order ${razorpay_order_id}\n`);
      return res.json({
        success: true,
        message: "Payment verified & cart updated",
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
      let { amount, country, email, user_id } = req.body;

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
          // user_id: user_id || null,
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
        temp_id, // 🔥 receive temp_id
        user_id,
      } = req.body;
      console.log("req.body*********", req.body);

      if (!paymentIntentId) {
        return res
          .status(400)
          .json({ message: "PaymentIntent ID is required" });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId,
        { expand: ["charges"] },
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
        user_id: user_id || null,
      });

      // ✅ Get cart items BEFORE updating (only active cart items with bucket_type: true)
      const cartQuery = user_id
        ? { user_id, bucket_type: true }
        : { temp_id, bucket_type: true };
      
      const cartItems = await Cart.find(cartQuery);
      console.log(`\n🛒 [STRIPE] Found ${cartItems.length} active cart items for payment ${paymentIntentId}`);

      // ✅ UPDATE CART - mark as purchased
      const cartUpdate = await Cart.updateMany(cartQuery, {
        $set: { bucket_type: false, updatedAt: new Date() },
      });

      console.log(`🛒 [STRIPE] Cart updated: ${cartUpdate.modifiedCount} items marked as purchased`);
      
      // ✅ Create user account if doesn't exist (do this first)
      let usersDetails = await User.findOne({ email: email });
      if (!usersDetails) {
        let password = generatePassword(8, { lowercase: true, uppercase: true, numbers: true, symbols: false });
        console.log(`👤 [STRIPE] Creating new user account for ${email}`);
        usersDetails = await User.create({
          email: email,
          password: password,
          phone: phone,
          first_name: full_name,
          last_name: full_name,
        });
        await sendWelcomeAccountEmail(
          usersDetails.email,
          usersDetails.first_name,
          usersDetails.email,
          password,
        );
        console.log(`✅ [STRIPE] Welcome email sent to ${email}`);

        // ✅ Update payment and cart records with the new user_id
        await Payment.updateOne({ _id: payment._id }, { user_id: usersDetails._id });
        
        // Use a broader query to link ALL items from this guest/user to the new ID
        const linkQuery = user_id ? { user_id } : { temp_id };
        
        await Cart.updateMany(linkQuery, { user_id: usersDetails._id, temp_id: null });
        console.log(`🔗 [STRIPE] Linked payment and cart items to new user ID: ${usersDetails._id}`);
      } else if (!payment.user_id) {
        // If user already exists but payment wasn't linked (e.g., guest purchase by existing user)
        await Payment.updateOne({ _id: payment._id }, { user_id: usersDetails._id });
        
        const linkQuery = user_id ? { user_id } : { temp_id };

        await Cart.updateMany(linkQuery, { user_id: usersDetails._id, temp_id: null });
        console.log(`🔗 [STRIPE] Linked guest payment and cart items to existing user ID: ${usersDetails._id}`);
      }
      
      // ✅ Send enrollment emails for ALL cart items
      const purchasedItems = [];
      for (let i = 0; i < cartItems.length; i++) {
        const cartItem = cartItems[i];
        console.log(`\n📧 [STRIPE] Processing cart item ${i + 1}/${cartItems.length}:`, {
          cart_type: cartItem.cart_type,
          livecourse_id: cartItem.livecourse_id,
          hyperspecialist_id: cartItem.hyperspecialist_id,
          product_id: cartItem.product_id,
          exam_category_id: cartItem.exam_category_id,
        });
        
        if (cartItem.cart_type === 'livecourses' && cartItem.livecourse_id) {
          const course = await LiveCourses.findById(cartItem.livecourse_id).catch(() => null);
          if (course) {
            purchasedItems.push({
              productName: course.course_title,
              productType: "Live Course",
              details: cartItem.livecourse_details?.title || 'Module',
              link: course.zoom_link
            });
            console.log(`📝 [STRIPE] Added LiveCourse to combined email: ${course.course_title}`);
          }
        } else if (cartItem.cart_type === 'hyperspecialist' && cartItem.hyperspecialist_id) {
          const hyperSpecialist = await HyperSpecialist.findById(cartItem.hyperspecialist_id).catch(() => null);
          if (hyperSpecialist) {
            const zoomMeeting = await createZoomMeeting(`Welcome ${full_name}`);
            purchasedItems.push({
              productName: hyperSpecialist.title,
              productType: "Hyper Specialist",
              details: "Zoom Meeting Created",
              link: zoomMeeting
            });
            console.log(`📝 [STRIPE] Added HyperSpecialist to combined email: ${hyperSpecialist.title}`);
          }
        } else if (cartItem.cart_type === 'prerecord' && cartItem.product_id) {
          const preRecord = await PreRecord.findById(cartItem.product_id).catch(() => null);
          if (preRecord) {
            purchasedItems.push({
              productName: preRecord.title,
              productType: "Pre-Recorded Course",
              details: "Video Access",
              link: `https://vimeo.com/${preRecord.vimeo_video_id}`
            });
            console.log(`📝 [STRIPE] Added PreRecord to combined email: ${preRecord.title}`);
          }
        } else if (cartItem.cart_type === 'exam_plan' && cartItem.exam_category_id) {
          const examCategory = await ExamCategory.findById(cartItem.exam_category_id).catch(() => null);
          if (examCategory) {
            purchasedItems.push({
              productName: examCategory.category_name,
              productType: "Exam Plan",
              details: `${cartItem.plan_details?.plan_type} Plan`
            });
            console.log(`📝 [STRIPE] Added ExamPlan to combined email: ${examCategory.category_name}`);
          }
        } else if (cartItem.cart_type === 'rapid_tool' && cartItem.exam_category_id) {
          const examCategory = await ExamCategory.findById(cartItem.exam_category_id).catch(() => null);
          if (examCategory) {
            const toolName = cartItem.tool_details?.tool_type || 'Rapid Learning Tool';
            purchasedItems.push({
              productName: examCategory.category_name,
              productType: "Rapid Learning Tool",
              details: toolName
            });
            console.log(`📝 [STRIPE] Added RapidTool to combined email: ${examCategory.category_name} - ${toolName}`);
          }
        }
      }

      if (purchasedItems.length > 0) {
        await sendCombinedPurchaseEmail(
          email,
          full_name,
          paymentIntentId,
          purchasedItems
        );
        console.log(`✅ [STRIPE] Combined purchase email sent to ${email} for ${purchasedItems.length} items`);
      }
      
      console.log(`\n✅ [STRIPE] All processing completed for payment ${paymentIntentId}\n`);
      
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
  },
};

const downloadPaymentExcel = {
  handler: async (req, res) => {
    try {
      const { start_date, end_date, payment_status } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: "start_date and end_date are required",
        });
      }

      /* ---------------- DATE FILTER ---------------- */
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);

      const query = {
        createdAt: {
          $gte: start,
          $lte: end,
        },
      };

      if (payment_status) {
        query.payment_status = payment_status;
      }

      const payments = await Payment.find(query)
        .sort({ createdAt: -1 })
        .populate("user_id", "full_name email phone");

      if (!payments.length) {
        return res.status(404).json({
          success: false,
          message: "No payment records found",
        });
      }

      /* ---------------- EXCEL SETUP ---------------- */
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Payments");

      sheet.columns = [
        { header: "Full Name", key: "full_name", width: 20 },
        { header: "Email", key: "email", width: 25 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "Currency", key: "currency", width: 10 },
        { header: "Payment Method", key: "payment_method", width: 15 },
        { header: "Payment Status", key: "payment_status", width: 15 },
        { header: "Transaction ID", key: "transaction_id", width: 25 },
        {
          header: "Razorpay Payment ID",
          key: "razorpay_payment_id",
          width: 30,
        },
        {
          header: "Stripe PaymentIntent ID",
          key: "paymentIntentId",
          width: 30,
        },
        { header: "Payment Date", key: "date", width: 15 },
      ];

      /* ---------------- ROW DATA ---------------- */
      payments.forEach((pay) => {
        sheet.addRow({
          date: pay.createdAt.toISOString().split("T")[0],
          full_name: pay.full_name || pay.user_id?.full_name || "Guest User",
          email: pay.email || pay.user_id?.email || pay.customerEmail || "-",
          phone: pay.phone || "-",
          amount: pay.amount,
          currency: pay.currency,
          payment_method: pay.payment_method,
          payment_status: pay.payment_status,
          transaction_id: pay.transaction_id || "-",
          razorpay_payment_id: pay.razorpay_payment_id || "-",
          paymentIntentId: pay.paymentIntentId || "-",
          remarks: pay.remarks || "-",
        });
      });

      /* ---------------- HEADER STYLE ---------------- */
      sheet.getRow(1).font = { bold: true };

      /* ---------------- RESPONSE ---------------- */
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=payments_${start_date}_to_${end_date}.xlsx`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

const downloadUserWisePaymentsExcel = {
  handler: async (req, res) => {
    try {
      const { user_id, start_date, end_date } = req.query;

      // Validate user_id
      // if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Valid user_id is required",
      //   });
      // }

      const query = {
        user_id: user_id,
        payment_status: { $in: ["paid", "succeeded"] },
      };

      // Optional date filter
      if (start_date && end_date) {
        query.createdAt = {
          $gte: new Date(start_date),
          $lte: new Date(end_date),
        };
      }

      const payments = await Payment.find(query).sort({ createdAt: -1 });

      if (!payments.length) {
        return res.status(404).json({
          success: false,
          message: "No payment data found for this user",
        });
      }

      // Excel generation
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("User Payments");

      worksheet.columns = [
        { header: "Full Name", key: "full_name", width: 20 },
        { header: "Email", key: "email", width: 25 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "Currency", key: "currency", width: 10 },
        { header: "Payment Method", key: "payment_method", width: 15 },
        { header: "Transaction ID", key: "transaction_id", width: 25 },
        { header: "Date", key: "date", width: 15 },
        { header: "Status", key: "payment_status", width: 15 },
      ];

      payments.forEach((p) => {
        worksheet.addRow({
          full_name: p.full_name || "-",
          email: p.email || "-",
          amount: p.amount,
          currency: p.currency,
          payment_method: p.payment_method,
          transaction_id: p.transaction_id || "-",
          date: p.createdAt.toISOString().split("T")[0],
          payment_status: p.payment_status,
        });
      });

      /* ---------------- HEADER STYLE ---------------- */
      worksheet.getRow(1).font = { bold: true };

      // Response headers
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=user-payments.xlsx",
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};

module.exports = {
  createPayment,
  verifyPayment,
  createStripePaymentIntent,
  verifyPaymentStripe,
  getAllPayment,
  downloadPaymentExcel,
  downloadUserWisePaymentsExcel,
};
