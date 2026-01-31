import { Router } from 'express';
import { registerDevice, unregisterDevice } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /notifications/register-device
 * @desc    Register device token for push notifications
 * @access  Private
 */
router.post('/register-device', registerDevice);

/**
 * @route   DELETE /notifications/unregister-device
 * @desc    Unregister device token
 * @access  Private
 */
router.delete('/unregister-device', unregisterDevice);

export default router;
