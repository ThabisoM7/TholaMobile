const { createClient } = require('@supabase/supabase-js');
const prisma = require('../config/db');

let supabaseInstance = null;

const getSupabase = () => {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || '';
    
    if (!url || !key) {
      console.error("CRITICAL ERROR: Supabase environment variables are missing!");
    }
    
    // We pass a dummy url if missing just to prevent the hard crash on startup, 
    // but the requests will fail gracefully later.
    supabaseInstance = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder');
  }
  return supabaseInstance;
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token with Supabase directly
      const supabase = getSupabase();
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
