const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createOrUpdateReview,
  getProductReviews,
  deleteReview
} = require('../controllers/reviewController');

// Public route to retrieve product reviews list
router.get('/product/:productId', getProductReviews);

// Protected routes (requires login validation)
router.post('/', protect, createOrUpdateReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
