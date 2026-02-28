const express = require('express');
const auth = require('../../middlewares/auth');
const { plansController } = require('../../controllers');
const catchAsync = require('../../utils/catchAsync');

const router = express.Router();

// Public routes
router.get('/get-active-plans', catchAsync(plansController.getActivePlans.handler));
router.get('/get-plan-by-id/:id', catchAsync(plansController.getPlanById.handler));
router.get('/get-all-plans', catchAsync(plansController.getAllPlans.handler));

// Protected routes (require authentication)
router.post('/create-plan', catchAsync(plansController.createPlan.handler));
router.put('/bulk-update-plans', catchAsync(plansController.bulkUpdatePlans.handler));
router.put('/update-plan/:id', catchAsync(plansController.updatePlan.handler));
router.delete('/delete-plan/:id', catchAsync(plansController.deletePlan.handler));

module.exports = router;