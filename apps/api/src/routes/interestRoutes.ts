import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { InterestNewsService } from '../services/interestNewsService';
import { getLocalUserId } from '../controllers/aiController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Get interest updates for a specific contact
 * GET /interests/contact/:contactId
 */
router.get('/contact/:contactId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    if (!localUserId) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    const { contactId } = req.params;

    const updates = await InterestNewsService.getInterestUpdatesForContact(localUserId, contactId);
    res.json({ updates });
  } catch (error) {
    console.error('Get interest updates error:', error);
    res.status(500).json({ error: 'Failed to get interest updates' });
  }
});

/**
 * Get trending news for all user's shared interests
 * GET /interests/trending
 */
router.get('/trending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📰 Trending endpoint called, user:', req.user?.uid);
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    console.log('📰 Local user ID:', localUserId);

    if (!localUserId) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const trending = await InterestNewsService.getTrendingForUser(localUserId);
    console.log('📰 Trending result:', trending.length, 'items');
    res.json({ trending });
  } catch (error: any) {
    console.error('Get trending error:', error);
    console.error('Get trending error stack:', error.stack);
    res.status(500).json({ error: 'Failed to get trending topics', details: error.message });
  }
});

/**
 * Get news for a specific interest
 * GET /interests/news/:interest
 */
router.get('/news/:interest', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { interest } = req.params;

    const articles = await InterestNewsService.getNewsForInterest(interest);
    res.json({ articles });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ error: 'Failed to get news' });
  }
});

/**
 * Get contacts who share a specific interest
 * GET /interests/:interest/contacts
 */
router.get('/:interest/contacts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    if (!localUserId) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    const { interest } = req.params;

    const contacts = await InterestNewsService.getContactsForInterest(localUserId, interest);
    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts for interest error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

export default router;
