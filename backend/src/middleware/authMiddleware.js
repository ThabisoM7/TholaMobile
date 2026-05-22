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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, role: true, full_name: true, profile_picture: true, age: true, location: true, bio: true }
      });

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      next(new Error('Not authorized, token failed'));
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
