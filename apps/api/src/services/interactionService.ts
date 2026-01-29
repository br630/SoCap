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
