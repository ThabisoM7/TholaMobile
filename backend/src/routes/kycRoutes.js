const express = require('express');
const router = express.Router();
const { submitKyc, getKycStatus } = require('../controllers/kycController');
const { protect, vendorOnly } = require('../middleware/authMiddleware');

router.post('/', protect, vendorOnly, submitKyc);
router.get('/status', protect, vendorOnly, getKycStatus);

module.exports = router;
