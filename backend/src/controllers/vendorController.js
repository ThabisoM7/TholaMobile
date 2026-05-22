const prisma = require('../config/db');

// @desc    Register a new vendor business
// @route   POST /vendors/register-business
// @access  Private (Vendor only)
const registerBusiness = async (req, res, next) => {
  try {
    const {
      business_name,
      business_description,
      category,
      phone_number,
      township,
      address,
      latitude,
      longitude,
      logo_url,
      banner_url,
    } = req.body;

    const vendorExists = await prisma.vendor.findUnique({
      where: { user_id: req.user.id },
    });

    if (vendorExists) {
      res.status(400);
      throw new Error('Business already registered for this user');
    }

    const vendor = await prisma.vendor.create({
      data: {
        user_id: req.user.id,
        business_name,
        business_description,
        category,
        phone_number,
        township,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        logo_url,
        banner_url,
      },
    });

    // Ensure the User's role is officially upgraded to VENDOR
    if (req.user.role !== 'VENDOR') {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { role: 'VENDOR' }
      });
    }

    res.status(201).json(vendor);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all vendors (for map)
// @route   GET /vendors
// @access  Public
const getVendors = async (req, res, next) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        user: {
          select: { full_name: true, email: true },
        },
        products: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    res.status(200).json(vendors);
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendor by ID
// @route   GET /vendors/:id
// @access  Public
const getVendorById = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        products: true,
        promotions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
    });

    if (!vendor) {
      res.status(404);
      throw new Error('Vendor not found');
    }

    res.status(200).json(vendor);
  } catch (error) {
    next(error);
  }
};

// @desc    Update vendor profile
// @route   PUT /vendors/:id
// @access  Private (Vendor only)
const updateVendor = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
    });

    if (!vendor) {
      res.status(404);
      throw new Error('Vendor not found');
    }

    if (vendor.user_id !== req.user.id) {
      res.status(401);
      throw new Error('User not authorized to update this business');
    }

    const updateData = { ...req.body };
    if (updateData.latitude !== undefined) {
      updateData.latitude = parseFloat(updateData.latitude);
    }
    if (updateData.longitude !== undefined) {
      updateData.longitude = parseFloat(updateData.longitude);
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.status(200).json(updatedVendor);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's vendor profile
// @route   GET /vendors/me
// @access  Private (Vendor only)
const getMyVendorProfile = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id },
      include: {
        products: true,
      }
    });

    if (!vendor) {
      res.status(404);
      throw new Error('Vendor profile not found');
    }

    res.status(200).json(vendor);
  } catch (error) {
    next(error);
  }
};
// @desc    Get vendor analytics
// @route   GET /vendors/analytics
// @access  Private (Vendor only)
const getVendorAnalytics = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { user_id: req.user.id },
    });

    if (!vendor) {
      res.status(404);
      throw new Error('Vendor profile not found');
    }

    const interactions = await prisma.interaction.findMany({
      where: { vendor_id: vendor.id },
      include: {
        user: {
          select: { full_name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const reviews = await prisma.productReview.findMany({
      where: {
        product: {
          vendor_id: vendor.id
        }
      },
      include: {
        user: {
          select: {
            full_name: true,
            profile_picture: true
          }
        },
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const stats = {
      totalViews: interactions.filter(i => i.type === 'VIEW_PROFILE').length,
      totalInterest: interactions.filter(i => i.type === 'INTERESTED').length,
      recentInteractions: interactions.slice(0, 20),
      productReviews: reviews
    };

    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};


// @desc    Record customer interaction
// @route   POST /vendors/interaction
// @access  Private (Customer only)
const recordInteraction = async (req, res, next) => {
  try {
    const { vendor_id, product_id, type } = req.body;

    const interaction = await prisma.interaction.create({
      data: {
        user_id: req.user.id,
        vendor_id,
        product_id,
        type,
      },
    });

    res.status(201).json(interaction);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerBusiness,
  getVendors,
  getVendorById,
  updateVendor,
  getMyVendorProfile,
  getVendorAnalytics,
  recordInteraction,
};
