const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      let decoded;
      try {
        const decodedHeader = jwt.decode(token, { complete: true });
        console.log('--- JWT VERIFICATION DEBUG ---');
        console.log('Token Header:', decodedHeader?.header);
        console.log('JWT_SECRET starts with:', process.env.JWT_SECRET?.substring(0, 5));
        
        // Try verifying with the Base64-decoded Buffer (required for Supabase production secrets)
        const secretBuffer = Buffer.from(process.env.JWT_SECRET, 'base64');
        decoded = jwt.verify(token, secretBuffer);
      } catch (err) {
        console.log('Failed buffer verification:', err.message);
        // Fallback to verifying with the raw string secret
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (innerErr) {
          console.log('Failed string verification:', innerErr.message);
          throw innerErr;
        }
      }

      req.user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, role: true, full_name: true, profile_picture: true, age: true, location: true, bio: true }
      });

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401);
      next(new Error('Not authorized, token failed: ' + error.message));
    }
  }

  if (!token) {
    res.status(401);
    next(new Error('Not authorized, no token'));
  }
};

const vendorOnly = (req, res, next) => {
  if (req.user && req.user.role === 'VENDOR') {
    next();
  } else {
    res.status(403);
    next(new Error('Not authorized as vendor'));
  }
};

module.exports = { protect, vendorOnly };
