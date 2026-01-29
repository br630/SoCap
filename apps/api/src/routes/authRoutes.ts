import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  appleLogin,
  getProfile,
  updateProfile,
  deleteAccount,
  exportData,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /auth/login
 * @desc    Login with Firebase token
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /auth/google
 * @desc    Google OAuth login
 * @access  Public
 */
router.post('/google', googleLogin);

/**
 * @route   POST /auth/apple
 * @desc    Apple Sign-In login
 * @access  Public
 */
router.post('/apple', appleLogin);

/**
 * @route   GET /auth/profile
 * @desc    Get current user profile with stats
 * @access  Private (requires authentication)
 */
router.get('/profile', authMiddleware, getProfile);

/**
 * @route   PUT /auth/profile
 * @desc    Update user profile
 * @access  Private (requires authentication)
 */
router.put('/profile', authMiddleware, updateProfile);

/**
 * @route   DELETE /auth/account
 * @desc    Delete user account (GDPR compliance)
 * @access  Private (requires authentication)
 */
router.delete('/account', authMiddleware, deleteAccount);

/**
 * @route   GET /auth/export
 * @desc    Export user data (GDPR compliance)
 * @access  Private (requires authentication)
 */
router.get('/export', authMiddleware, exportData);

export default router;
