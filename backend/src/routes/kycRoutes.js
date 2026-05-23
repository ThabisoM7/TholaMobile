const express = require('express');
const router = express.Router();
const { submitKyc, getKycStatus, createIdnormSession, handleIdnormCallback } = require('../controllers/kycController');
const { protect, vendorOnly } = require('../middleware/authMiddleware');

router.post('/', protect, vendorOnly, submitKyc);
router.get('/status', protect, vendorOnly, getKycStatus);
router.get('/idnorm-session', protect, vendorOnly, createIdnormSession);
router.post('/idnorm-callback', handleIdnormCallback);

module.exports = router;
