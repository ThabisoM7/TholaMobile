const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password) {
      res.status(400);
      throw new Error('Please add all fields');
    }

    const userExists = await prisma.user.findUnique({ where: { email } });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        password: hashedPassword,
        role: role || 'CUSTOMER',
      },
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
        age: user.age,
        location: user.location,
        bio: user.bio,
        token: generateToken(user.id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate a user
// @route   POST /auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
        age: user.age,
        location: user.location,
        bio: user.bio,
        token: generateToken(user.id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid credentials');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get user data
// @route   GET /auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /auth/me
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        full_name: req.body.full_name !== undefined ? req.body.full_name : user.full_name,
        profile_picture: req.body.profile_picture !== undefined ? req.body.profile_picture : user.profile_picture,
        age: req.body.age !== undefined ? parseInt(req.body.age) : user.age,
        location: req.body.location !== undefined ? req.body.location : user.location,
        bio: req.body.bio !== undefined ? req.body.bio : user.bio,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        profile_picture: true,
        age: true,
        location: true,
        bio: true,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
};
