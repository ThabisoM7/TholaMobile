const prisma = require('../config/db');

// @desc    Add vendor to favorites
// @route   POST /favorites
// @access  Private
const addFavorite = async (req, res, next) => {
  try {
    const { vendor_id } = req.body;

    const vendorExists = await prisma.vendor.findUnique({
      where: { id: vendor_id },
    });

    if (!vendorExists) {
      res.status(404);
      throw new Error('Vendor not found');
    }

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        user_id_vendor_id: {
          user_id: req.user.id,
          vendor_id,
        },
      },
    });

    if (existingFavorite) {
      res.status(400);
      throw new Error('Vendor already in favorites');
    }

    const favorite = await prisma.favorite.create({
      data: {
        user_id: req.user.id,
        vendor_id,
      },
      include: {
        vendor: true
      }
    });

    res.status(201).json(favorite);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove vendor from favorites
// @route   DELETE /favorites/:vendorId
// @access  Private
const removeFavorite = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    const favorite = await prisma.favorite.findUnique({
      where: {
        user_id_vendor_id: {
          user_id: req.user.id,
          vendor_id: vendorId,
        },
      },
    });

    if (!favorite) {
      res.status(404);
      throw new Error('Favorite not found');
    }

    await prisma.favorite.delete({
      where: {
        id: favorite.id,
      },
    });

    res.status(200).json({ message: 'Removed from favorites' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's favorite vendors
// @route   GET /favorites
// @access  Private
const getFavorites = async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { user_id: req.user.id },
      include: {
        vendor: {
          select: {
            id: true,
            business_name: true,
            business_description: true,
            category: true,
            logo_url: true,
            township: true,
            address: true,
            phone_number: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(favorites);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addFavorite,
  removeFavorite,
  getFavorites,
};
