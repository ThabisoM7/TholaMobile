const express = require('express');
const router = express.Router();
const {
  registerBusiness,
  getVendors,
  getVendorById,
  updateVendor,
  getMyVendorProfile,
  getVendorAnalytics,
} = require('../controllers/vendorController');
const { protect, vendorOnly } = require('../middleware/authMiddleware');

router.route('/').get(getVendors);
router.post('/register-business', protect, vendorOnly, registerBusiness);
router.get('/me', protect, vendorOnly, getMyVendorProfile);
router.get('/analytics', protect, vendorOnly, getVendorAnalytics);
router.route('/:id').get(getVendorById).put(protect, vendorOnly, updateVendor);

module.exports = router;
