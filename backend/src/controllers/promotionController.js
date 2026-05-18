const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Create a new promotion/announcement
// @route   POST /promotions
// @access  Private (Vendor only)
const createPromotion = async (req, res, next) => {
  try {
    const { content, image_url } = req.body;

    if (req.user.role !== 'VENDOR') {
      res.status(403);
      throw new Error('Access denied. Only registered vendors can post promotions.');
    }

    if (!content) {
      res.status(400);
      throw new Error('Content is required.');
    }

    // Find the vendor linked to this user
    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id }
    });

    if (!vendor) {
      res.status(404);
      throw new Error('Vendor profile not found.');
    }

    const promotion = await prisma.vendorPromotion.create({
      data: {
        vendor_id: vendor.id,
        content,
        image_url: image_url || null
      }
    });

    res.status(201).json({
      message: 'Promotion posted successfully!',
      promotion
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all promotions for a vendor
// @route   GET /promotions/vendor/:vendorId
// @access  Public
const getVendorPromotions = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    const promotions = await prisma.vendorPromotion.findMany({
      where: { vendor_id: vendorId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(promotions);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a promotion
// @route   DELETE /promotions/:id
// @access  Private (Vendor owner only)
const deletePromotion = async (req, res, next) => {
  try {
    const { id } = req.params;

    const promotion = await prisma.vendorPromotion.findUnique({
      where: { id },
      include: {
        vendor: true
      }
    });

    if (!promotion) {
      res.status(404);
      throw new Error('Promotion not found.');
    }

    if (promotion.vendor.user_id !== req.user.id) {
      res.status(401);
      throw new Error('Unauthorized to delete this promotion.');
    }

    await prisma.vendorPromotion.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Promotion deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPromotion,
  getVendorPromotions,
  deletePromotion
};
