const { createClient } = require('@supabase/supabase-js');
const prisma = require('../config/db');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token with Supabase directly
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        throw new Error(authError?.message || 'Invalid token');
      }

      req.user = await prisma.user.findUnique({
        where: { id: user.id },
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
