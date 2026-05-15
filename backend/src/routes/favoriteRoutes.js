const express = require('express');
const router = express.Router();
const { addFavorite, removeFavorite, getFavorites } = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, addFavorite)
  .get(protect, getFavorites);

router.delete('/:vendorId', protect, removeFavorite);

module.exports = router;
