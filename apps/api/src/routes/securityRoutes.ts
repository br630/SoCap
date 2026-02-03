import { Router } from 'express';
import { authMiddleware } from '../middleware';
import * as securityController from '../controllers/securityController';

const router = Router();

/**
 * Security Routes
 */

// GET /api/security/headers - Check security headers
router.get('/headers', authMiddleware, securityController.checkSecurityHeaders);

export default router;
