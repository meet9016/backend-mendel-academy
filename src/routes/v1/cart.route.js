const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { cartController } = require('../../controllers');

const router = express.Router();

// ✅ Add PreRecord product to cart (existing)
router.post('/create',
    validate(cartController.addToCart.validation),
    catchAsync(cartController.addToCart.handler)
);

// ✅ NEW: Add Exam Plan to cart
router.post('/add-exam-plan',
    validate(cartController.addExamPlanToCart.validation),
    catchAsync(cartController.addExamPlanToCart.handler)
);

router.post('/add-hyperspecialist',
    validate(cartController.addHyperSpecialistToCart.validation),
    catchAsync(cartController.addHyperSpecialistToCart.handler)
);

// ✅ Get all cart items (both PreRecord and Exam Plans)
router.get('/get', catchAsync(cartController.getCart.handler));

// ✅ Get all carts (admin)
router.get('/get-all-cart', catchAsync(cartController.getAllCart.handler));

// ✅ Get checkout page data (both types)
router.get('/get-checkout/:temp_id',
    catchAsync(cartController.getCheckoutPageTempId.handler)
);

// ✅ Get cart count (both types)
router.get("/count/:temp_id", catchAsync(cartController.getCartCount.handler));

// ✅ Update quantity (works for both types)
router.put('/update',
    validate(cartController.updateQuantity.validation),
    catchAsync(cartController.updateQuantity.handler)
);

// ✅ Update selected options (PreRecord only)
router.put('/update-options',
    validate(cartController.updateCartOptions.validation),
    catchAsync(cartController.updateCartOptions.handler)
);

// ✅ Remove entire cart item (works for both types)
router.delete('/remove/:id', catchAsync(cartController.removeCart.handler));

// ✅ Remove option (PreRecord only)
router.post('/remove-option',
    validate(cartController.removeCartOption.validation),
    catchAsync(cartController.removeCartOption.handler)
);

module.exports = router;