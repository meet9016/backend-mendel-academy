const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { cartController } = require('../../controllers');

const router = express.Router();
router.post('/create',
    validate(cartController.addToCart.validation),
    catchAsync(cartController.addToCart.handler)
);

// ✅ Add Exam Plan to cart
router.post('/add-exam-plan',
    validate(cartController.addExamPlanToCart.validation),
    catchAsync(cartController.addExamPlanToCart.handler)
);

// ✅ Add HyperSpecialist to cart
router.post('/add-hyperspecialist',
    validate(cartController.addHyperSpecialistToCart.validation),
    catchAsync(cartController.addHyperSpecialistToCart.handler)
);

// ✅ FIXED: Add LiveCourse to cart (removed duplicate /cart/)
router.post('/add-livecourse',
    validate(cartController.addLiveCoursesToCart.validation),
    catchAsync(cartController.addLiveCoursesToCart.handler)
);

// ✅ NEW: Add Rapid Tool to cart
router.post('/add-rapid-tool',
    validate(cartController.addRapidToolToCart.validation),
    catchAsync(cartController.addRapidToolToCart.handler)
);

// ✅ NEW: Add QBank Plan to cart
router.post('/add-qbank-plan',
    validate(cartController.addQbankPlanToCart.validation),
    catchAsync(cartController.addQbankPlanToCart.handler)
);

// ✅ Get all cart items (all types)
router.get('/get', catchAsync(cartController.getCart.handler));

// ✅ Get all carts (admin)
router.get('/get-all-cart', catchAsync(cartController.getAllCart.handler));

// ✅ Get checkout page data (all types)
router.get('/get-checkout/:temp_id',
    catchAsync(cartController.getCheckoutPageTempId.handler)
);

// ✅ Get cart count (all types)
router.get("/count/:temp_id", catchAsync(cartController.getCartCount.handler));

// ✅ Update quantity (works for all types)
router.put('/update',
    validate(cartController.updateQuantity.validation),
    catchAsync(cartController.updateQuantity.handler)
);

// ✅ Update selected options (PreRecord only)
router.put('/update-options',
    validate(cartController.updateCartOptions.validation),
    catchAsync(cartController.updateCartOptions.handler)
);

// ✅ Remove entire cart item (works for all types)
router.delete('/remove/:id', catchAsync(cartController.removeCart.handler));

// ✅ Remove option (PreRecord only)
router.post('/remove-option',
    validate(cartController.removeCartOption.validation),
    catchAsync(cartController.removeCartOption.handler)
);

module.exports = router;