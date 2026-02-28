import { Router } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { JWT_EXPIRY } from '../config/constants.js';
import {
  usernameRules,
  emailRules,
  passwordRules,
  handleValidationErrors,
} from '../middleware/validators.js';

const router = Router();

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function formatUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    isPatron: user.isPatron,
    mapLimit: user.mapLimit,
    patreonId: user.patreonId || null,
  };
}

// POST /api/auth/register
router.post('/register', [
  usernameRules(),
  emailRules(),
  passwordRules(),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findOne({ username }).collation({ locale: 'en', strength: 2 });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', [
  emailRules(),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json(formatUser(req.user));
});

// PUT /api/auth/profile — update username
router.put('/profile', auth, [
  usernameRules(),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { username } = req.body;

    // Check uniqueness (case-insensitive, excluding current user)
    const existing = await User.findOne({
      username,
      _id: { $ne: req.user._id },
    }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    req.user.username = username;
    await req.user.save();

    res.json(formatUser(req.user));
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
