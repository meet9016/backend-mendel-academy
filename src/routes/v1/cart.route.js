const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const catchAsync = require('../../utils/catchAsync');
const { cartController } = require('../../controllers');
const upload = require('../../middlewares/upload');

const router = express.Router();

router.post('/create', validate(cartController.addToCart.validation), catchAsync(cartController.addToCart.handler));
router.get('/get', catchAsync(cartController.getCart.handler));
router.get("/count/:temp_id", catchAsync(cartController.getCartCount.handler));
router.put('/update', catchAsync(cartController.updateQuantity.handler));
router.delete('/delete/:_id', catchAsync(cartController.deleteCartItem.handler));
router.delete('/clear', catchAsync(cartController.clearCart.handler));

module.exports = router;