const express = require('express');
const router = express.Router();
const { protect, vendorOnly } = require('../middleware/authMiddleware');
const {
  setupProgram,
  getProgramMe,
  getProgram,
  getVendorQR,
  getUserCards,
  claimStamp,
  redeemCard
} = require('../controllers/loyaltyController');

// Program setup & details (Vendor only)
router.post('/setup', protect, vendorOnly, setupProgram);
router.get('/program/me', protect, vendorOnly, getProgramMe);
router.get('/qr', protect, vendorOnly, getVendorQR);

// Active Cards & Scans (Customer)
router.get('/cards/me', protect, getUserCards);
router.post('/stamp/scan', protect, claimStamp);
router.post('/card/redeem/:cardId', protect, redeemCard);

// Public lookup
router.get('/program/vendor/:vendorId', getProgram);

module.exports = router;
