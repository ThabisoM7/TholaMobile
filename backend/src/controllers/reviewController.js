const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Create or update a product review
// @route   POST /reviews
// @access  Private (Customer only)
const createOrUpdateReview = async (req, res, next) => {
  try {
    const { product_id, rating, comment } = req.body;

    // 1. Strictly enforce that only CUSTOMERS can review products
    if (req.user.role !== 'CUSTOMER') {
      res.status(403);
      throw new Error('Access denied. Only customers can review listings.');
    }

    if (!product_id || !rating) {
      res.status(400);
      throw new Error('Product ID and rating are required.');
    }

    const ratingVal = parseInt(rating);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      res.status(400);
      throw new Error('Rating must be an integer between 1 and 5.');
    }

    // 2. Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: product_id }
    });

    if (!product) {
      res.status(404);
      throw new Error('Product listing not found.');
    }

    // 3. Upsert review on compound index to prevent duplication
    const review = await prisma.productReview.upsert({
      where: {
        user_id_product_id: {
          user_id: req.user.id,
          product_id: product_id
        }
      },
      update: {
        rating: ratingVal,
        comment: comment || null
      },
      create: {
        user_id: req.user.id,
        product_id: product_id,
        rating: ratingVal,
        comment: comment || null
      },
      include: {
        user: {
          select: {
            full_name: true,
            profile_picture: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Review submitted successfully!',
      review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews for a product
// @route   GET /reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const reviews = await prisma.productReview.findMany({
      where: { product_id: productId },
      include: {
        user: {
          select: {
            full_name: true,
            profile_picture: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate stats
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    res.status(200).json({
      reviews,
      stats: {
        totalReviews,
        avgRating: parseFloat(avgRating.toFixed(1))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a review
// @route   DELETE /reviews/:id
// @access  Private (Customer owner only)
const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await prisma.productReview.findUnique({
      where: { id }
    });

    if (!review) {
      res.status(404);
      throw new Error('Review not found.');
    }

    if (review.user_id !== req.user.id) {
      res.status(401);
      throw new Error('Unauthorized to delete this review.');
    }

    await prisma.productReview.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Review deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrUpdateReview,
  getProductReviews,
  deleteReview
};
