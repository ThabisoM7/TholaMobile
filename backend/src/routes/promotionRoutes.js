const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createPromotion,
  getVendorPromotions,
  deletePromotion
} = require('../controllers/promotionController');

// Public route to retrieve promotions list for a vendor
router.get('/vendor/:vendorId', getVendorPromotions);

// Protected routes (requires login validation)
router.post('/', protect, createPromotion);
router.delete('/:id', protect, deletePromotion);

module.exports = router;
