const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { cartController } = require('../../controllers');

const router = express.Router();

// ✅ Add/Update cart with selected options
router.post('/create',
    validate(cartController.addToCart.validation),
    catchAsync(cartController.addToCart.handler)
);

// ✅ Get cart items
router.get('/get', catchAsync(cartController.getCart.handler));

// ✅ Get all carts (admin)
router.get('/get-all-cart', catchAsync(cartController.getAllCart.handler));

// ✅ Get checkout page data
router.get('/get-checkout/:temp_id',
    catchAsync(cartController.getCheckoutPageTempId.handler)
);

// ✅ Get cart count
router.get("/count/:temp_id", catchAsync(cartController.getCartCount.handler));

// ✅ Update quantity
router.put('/update',
    validate(cartController.updateQuantity.validation),
    catchAsync(cartController.updateQuantity.handler)
);

// ✅ Update selected options for a cart item
router.put('/update-options',
    validate(cartController.updateCartOptions.validation),
    catchAsync(cartController.updateCartOptions.handler)
);

// ✅ Remove entire cart item (product)
router.delete('/remove/:id', catchAsync(cartController.removeCart.handler));

// ✅ FIXED: Changed from DELETE to POST for remove-option
router.post('/remove-option',
    validate(cartController.removeCartOption.validation),
    catchAsync(cartController.removeCartOption.handler)
);

module.exports = router;