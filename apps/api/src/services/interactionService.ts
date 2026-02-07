import { Prisma, Interaction, InteractionType, Sentiment } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { PaginationParams, PaginatedResponse, getPaginationParams, createPaginatedResponse } from '../types/pagination';

export interface CreateInteractionData {
  type: InteractionType;
  date: Date;
  duration?: number;
  notes?: string;
  sentiment?: Sentiment;
}

export interface AutoLogInteractionData {
  contactId?: string;
  contactPhone?: string;
  contactName?: string;
  type: InteractionType;
  date: string; // ISO string
  duration?: number;
  direction?: 'incoming' | 'outgoing';
  externalId?: string; // Unique ID from call log to prevent duplicates
}

export interface BatchLogResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface InteractionStats {
  total: number;
  byType: Record<InteractionType, number>;
  bySentiment: Record<Sentiment, number>;
  averageDuration: number;
  recentCount: number;
}

export class InteractionService {
  /**
   * Log a new interaction
   */
  static async logInteraction(relationshipId: string, data: CreateInteractionData): Promise<Interaction> {
    try {
      // Verify relationship exists
      const relationship = await prisma.relationship.findUnique({
        where: { id: relationshipId },
      });

      if (!relationship) {
        throw new Error('Relationship not found');
      }

      const interaction = await prisma.interaction.create({
        data: {
          relationshipId,
          type: data.type,
          date: data.date,
          duration: data.duration,
          notes: data.notes,
          sentiment: data.sentiment,
        },
      });

      // Update relationship's last contact date
      await prisma.relationship.update({
        where: { id: relationshipId },
        data: {
          lastContactDate: data.date,
          updatedAt: new Date(),
        },
      });

      return interaction;
    } catch (error) {
      if (error instanceof Error && error.message === 'Relationship not found') {
        throw error;
      }
      throw new Error(`Failed to log interaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get interaction history for a relationship
   */
  static async getInteractionHistory(
    relationshipId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Interaction>> {
    try {
      const { skip, take } = getPaginationParams(pagination);

      const where: Prisma.InteractionWhereInput = {
        relationshipId,
      };

      const [interactions, total] = await Promise.all([
        prisma.interaction.findMany({
          where,
          skip,
          take,
          orderBy: { date: 'desc' },
        }),
        prisma.interaction.count({ where }),
      ]);

      return createPaginatedResponse(interactions, total, pagination);
    } catch (error) {
      throw new Error(
        `Failed to get interaction history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Batch log interactions from auto-sync (call logs, etc.)
   */
  static async batchLogInteractions(
    userId: string,
    interactions: AutoLogInteractionData[]
  ): Promise<BatchLogResult> {
    const result: BatchLogResult = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    for (const interaction of interactions) {
      try {
        // Find the contact by ID, phone, or name
        let contact = null;

        if (interaction.contactId) {
          contact = await prisma.contact.findFirst({
            where: { id: interaction.contactId, userId },
            include: { relationship: true },
          });
        } else if (interaction.contactPhone) {
          // Normalize phone number (remove non-digits)
          const normalizedPhone = interaction.contactPhone.replace(/\D/g, '');
          contact = await prisma.contact.findFirst({
            where: {
              userId,
              OR: [
                { phone: { contains: normalizedPhone.slice(-10) } },
                { phone: interaction.contactPhone },
              ],
            },
            include: { relationship: true },
          });
        }

        if (!contact || !contact.relationship) {
          // Skip if no matching contact found
          result.skipped++;
          continue;
        }

        // Check for duplicate using externalId if provided
        if (interaction.externalId) {
          const existing = await prisma.interaction.findFirst({
            where: {
              relationshipId: contact.relationship.id,
              notes: { contains: `[auto:${interaction.externalId}]` },
            },
          });

          if (existing) {
            result.skipped++;
            continue;
          }
        }

        // Create the interaction
        const notes = [
          interaction.direction ? `${interaction.direction} ${interaction.type.toLowerCase()}` : null,
          interaction.externalId ? `[auto:${interaction.externalId}]` : '[auto-logged]',
        ]
          .filter(Boolean)
          .join(' ');

        await prisma.interaction.create({
          data: {
            relationshipId: contact.relationship.id,
            type: interaction.type,
            date: new Date(interaction.date),
            duration: interaction.duration,
            notes,
            sentiment: 'NEUTRAL',
          },
        });

        // Update relationship's last contact date
        await prisma.relationship.update({
          where: { id: contact.relationship.id },
          data: {
            lastContactDate: new Date(interaction.date),
            updatedAt: new Date(),
          },
        });

        result.created++;
      } catch (error) {
        result.errors.push(
          `Failed to log interaction: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return result;
  }

  /**
   * Get last sync timestamp for a user
   */
  static async getLastSyncTime(userId: string): Promise<Date | null> {
    const lastAutoInteraction = await prisma.interaction.findFirst({
      where: {
        relationship: { userId },
        notes: { contains: '[auto' },
      },
      orderBy: { date: 'desc' },
    });

    return lastAutoInteraction?.date || null;
  }

  /**
   * Get interaction statistics for a user
   */
  static async getInteractionStats(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<InteractionStats> {
    try {
      const where: Prisma.InteractionWhereInput = {
        relationship: {
          userId,
        },
        ...(dateRange && {
          date: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }),
      };

      const interactions = await prisma.interaction.findMany({
        where,
        include: {
          relationship: true,
        },
      });

      const stats: InteractionStats = {
        total: interactions.length,
        byType: {
          CALL: 0,
          TEXT: 0,
          VIDEO_CALL: 0,
          IN_PERSON: 0,
          EVENT: 0,
        },
        bySentiment: {
          POSITIVE: 0,
          NEUTRAL: 0,
          NEGATIVE: 0,
        },
        averageDuration: 0,
        recentCount: 0,
      };

      let totalDuration = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      interactions.forEach((interaction) => {
        // Count by type
        stats.byType[interaction.type]++;

        // Count by sentiment
        if (interaction.sentiment) {
          stats.bySentiment[interaction.sentiment]++;
        }

        // Sum duration
        if (interaction.duration) {
          totalDuration += interaction.duration;
        }

        // Count recent interactions
        if (interaction.date >= thirtyDaysAgo) {
          stats.recentCount++;
        }
      });

      // Calculate average duration
      const interactionsWithDuration = interactions.filter((i) => i.duration !== null);
      stats.averageDuration =
        interactionsWithDuration.length > 0 ? totalDuration / interactionsWithDuration.length : 0;

      return stats;
    } catch (error) {
      throw new Error(`Failed to get interaction stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
