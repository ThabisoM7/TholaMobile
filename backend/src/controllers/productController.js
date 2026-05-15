const prisma = require('../config/db');

// @desc    Add a product
// @route   POST /products
// @access  Private (Vendor only)
const addProduct = async (req, res, next) => {
  try {
    const { name, description, price, image_url, category, in_stock } = req.body;

    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id },
    });

    if (!vendor) {
      res.status(404);
      throw new Error('Vendor profile not found. Register business first.');
    }

    const product = await prisma.product.create({
      data: {
        vendor_id: vendor.id,
        name,
        description,
        price: parseFloat(price),
        image_url,
        category,
        in_stock: in_stock !== undefined ? in_stock : true,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// @desc    Get products by vendor ID
// @route   GET /products/vendor/:vendorId
// @access  Public
const getVendorProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { vendor_id: req.params.vendorId },
    });

    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /products/:id
// @access  Private (Vendor only)
const updateProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { vendor: true },
    });

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (product.vendor.user_id !== req.user.id) {
      res.status(401);
      throw new Error('Not authorized to update this product');
    }

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /products/:id
// @access  Private (Vendor only)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { vendor: true },
    });

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (product.vendor.user_id !== req.user.id) {
      res.status(401);
      throw new Error('Not authorized to delete this product');
    }

    await prisma.product.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ message: 'Product removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addProduct,
  getVendorProducts,
  updateProduct,
  deleteProduct,
};
