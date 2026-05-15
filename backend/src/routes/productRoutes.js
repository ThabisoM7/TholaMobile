const express = require('express');
const router = express.Router();
const {
  addProduct,
  getVendorProducts,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, vendorOnly } = require('../middleware/authMiddleware');

router.post('/', protect, vendorOnly, addProduct);
router.get('/vendor/:vendorId', getVendorProducts);
router
  .route('/:id')
  .put(protect, vendorOnly, updateProduct)
  .delete(protect, vendorOnly, deleteProduct);

module.exports = router;
