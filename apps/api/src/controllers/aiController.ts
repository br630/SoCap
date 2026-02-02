import { Request, Response } from 'express';
import { AIService } from '../services/aiService';
import { prisma } from '../lib/prisma';

/**
 * Get message suggestions for a contact
 * POST /ai/message-suggestions
 */
export const getMessageSuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contactId, context = 'general' } = req.body;

    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    // Validate contact belongs to user
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId,
        isDeleted: false,
      },
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    const validContexts = [
      'birthday', 'check-in', 'event-invite', 'holiday',
      'congratulations', 'sympathy', 'thank-you', 'reconnect', 'general'
    ];
    if (!validContexts.includes(context)) {
      res.status(400).json({
        error: 'Invalid context',
        message: `Context must be one of: ${validContexts.join(', ')}`,
      });
      return;
    }

    const suggestions = await AIService.generateMessageSuggestions(userId, contactId, context);

    // Store in AIInsight table
    const insight = await prisma.aIInsight.create({
      data: {
        userId,
        contactId,
        type: 'MESSAGE_SUGGESTION',
        content: JSON.stringify({
          context,
          suggestions,
        }),
      },
    });

    res.json({
      success: true,
      data: {
        insightId: insight.id,
        suggestions,
      },
    });
  } catch (error) {
    console.error('Get message suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate message suggestions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get event ideas
 * POST /ai/event-ideas
 */
export const getEventIdeas = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      budgetTier = 'MODERATE',
      groupSize = 4,
      location,
      interests,
      restrictions,
    } = req.body;

    const validBudgetTiers = ['FREE', 'BUDGET', 'MODERATE', 'PREMIUM'];
    if (!validBudgetTiers.includes(budgetTier)) {
      res.status(400).json({
        error: 'Invalid budgetTier',
        message: `budgetTier must be one of: ${validBudgetTiers.join(', ')}`,
      });
      return;
    }

    if (typeof groupSize !== 'number' || groupSize < 1 || groupSize > 100) {
      res.status(400).json({
        error: 'Invalid groupSize',
        message: 'groupSize must be a number between 1 and 100',
      });
      return;
    }

    const ideas = await AIService.generateEventIdeas(userId, {
      budgetTier,
      groupSize,
      location,
      sharedInterests: interests,
      restrictions,
    });

    // Store in AIInsight table
    const insight = await prisma.aIInsight.create({
      data: {
        userId,
        type: 'EVENT_IDEA',
        content: JSON.stringify({
          params: { budgetTier, groupSize, location, interests, restrictions },
          ideas,
        }),
      },
    });

    res.json({
      success: true,
      data: {
        insightId: insight.id,
        ideas,
      },
    });
  } catch (error) {
    console.error('Get event ideas error:', error);
    res.status(500).json({
      error: 'Failed to generate event ideas',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get conversation starters for a contact
 * GET /ai/conversation-starters/:contactId
 */
export const getConversationStarters = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contactId } = req.params;

    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    // Validate contact belongs to user
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId,
        isDeleted: false,
      },
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    const starters = await AIService.generateConversationStarters(userId, contactId);

    // Store in AIInsight table
    const insight = await prisma.aIInsight.create({
      data: {
        userId,
        contactId,
        type: 'CONVERSATION_STARTER',
        content: JSON.stringify({ starters }),
      },
    });

    res.json({
      success: true,
      data: {
        insightId: insight.id,
        starters,
      },
    });
  } catch (error) {
    console.error('Get conversation starters error:', error);
    res.status(500).json({
      error: 'Failed to generate conversation starters',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get a relationship tip
 * GET /ai/relationship-tip
 */
export const getRelationshipTip = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tip = await AIService.generateRelationshipTip(userId);

    // Store in AIInsight table
    const insight = await prisma.aIInsight.create({
      data: {
        userId,
        type: 'RELATIONSHIP_TIP',
        content: JSON.stringify({ tip }),
      },
    });

    res.json({
      success: true,
      data: {
        insightId: insight.id,
        ...tip,
      },
    });
  } catch (error) {
    console.error('Get relationship tip error:', error);
    res.status(500).json({
      error: 'Failed to generate relationship tip',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Submit feedback for an AI insight
 * POST /ai/feedback
 */
export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { insightId, wasUsed, feedback } = req.body;

    if (!insightId) {
      res.status(400).json({ error: 'insightId is required' });
      return;
    }

    if (typeof wasUsed !== 'boolean') {
      res.status(400).json({ error: 'wasUsed must be a boolean' });
      return;
    }

    // Verify insight belongs to user
    const insight = await prisma.aIInsight.findFirst({
      where: {
        id: insightId,
        userId,
      },
    });

    if (!insight) {
      res.status(404).json({ error: 'Insight not found' });
      return;
    }

    // Update the insight with feedback
    const updatedInsight = await prisma.aIInsight.update({
      where: { id: insightId },
      data: {
        wasUsed,
        feedback: feedback || null,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        insightId: updatedInsight.id,
        wasUsed: updatedInsight.wasUsed,
        feedback: updatedInsight.feedback,
      },
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      error: 'Failed to submit feedback',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get AI usage stats for the current user
 * GET /ai/usage
 */
export const getUsageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stats = await AIService.getUsageStats(userId);

    // Also get insight stats
    const [totalInsights, usedInsights, insightsByType] = await Promise.all([
      prisma.aIInsight.count({ where: { userId } }),
      prisma.aIInsight.count({ where: { userId, wasUsed: true } }),
      prisma.aIInsight.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true },
      }),
    ]);

    const typeStats = insightsByType.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        ...stats,
        insights: {
          total: totalInsights,
          used: usedInsights,
          usageRate: totalInsights > 0 ? Math.round((usedInsights / totalInsights) * 100) : 0,
          byType: typeStats,
        },
      },
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({
      error: 'Failed to get usage stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get user's AI insights history
 * GET /ai/history
 */
export const getInsightHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { type, contactId, limit = '20', page = '1' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };
    if (type) where.type = type;
    if (contactId) where.contactId = contactId;

    const [insights, total] = await Promise.all([
      prisma.aIInsight.findMany({
        where,
        include: {
          contact: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.aIInsight.count({ where }),
    ]);

    res.json({
      success: true,
      data: insights.map(insight => ({
        ...insight,
        content: JSON.parse(insight.content as string),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get insight history error:', error);
    res.status(500).json({
      error: 'Failed to get insight history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
