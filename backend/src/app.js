const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const productRoutes = require('./routes/productRoutes');
const kycRoutes = require('./routes/kycRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const promotionRoutes = require('./routes/promotionRoutes');

const app = express();

// Trust the first proxy (Railway) to enable secure X-Forwarded-For headers for rate-limiting
app.set('trust proxy', 1);

// Step 1: Enforce secure headers via Helmet
app.use(helmet());

// Step 2: Configure defensive rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per auth window (protects login/registration)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Excessive authentication attempts. Please wait 15 minutes before retrying.' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiter to all paths
app.use(globalLimiter);

// Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/vendors', vendorRoutes);
app.use('/products', productRoutes);
app.use('/kyc', kycRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/loyalty', loyaltyRoutes);
app.use('/reviews', reviewRoutes);
app.use('/promotions', promotionRoutes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
