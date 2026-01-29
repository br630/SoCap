import { Prisma, Relationship, RelationshipTier, RelationshipType, CommunicationFrequency } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateRelationshipData {
  tier: RelationshipTier;
  customLabel?: string;
  relationshipType: RelationshipType;
  communicationFrequency: CommunicationFrequency;
  lastContactDate?: Date;
  healthScore?: number;
  sharedInterests?: string[];
  importantDates?: Prisma.InputJsonValue[];
}

export interface UpdateRelationshipData {
  tier?: RelationshipTier;
  customLabel?: string;
  relationshipType?: RelationshipType;
  communicationFrequency?: CommunicationFrequency;
  lastContactDate?: Date;
  healthScore?: number;
  sharedInterests?: string[];
  importantDates?: Prisma.InputJsonValue[];
}

export class RelationshipService {
  /**
   * Create a new relationship
   */
  static async createRelationship(
    userId: string,
    contactId: string,
    data: CreateRelationshipData
  ): Promise<Relationship> {
    try {
      // Verify contact belongs to user
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId,
          isDeleted: false,
        },
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      const relationship = await prisma.relationship.create({
        data: {
          userId,
          contactId,
          tier: data.tier,
          customLabel: data.customLabel,
          relationshipType: data.relationshipType,
          communicationFrequency: data.communicationFrequency,
          lastContactDate: data.lastContactDate,
          healthScore: data.healthScore ?? 50,
          sharedInterests: data.sharedInterests ?? [],
          importantDates: data.importantDates ?? [],
        },
      });

      return relationship;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Relationship already exists for this contact');
        }
      }
      if (error instanceof Error && error.message === 'Contact not found') {
        throw error;
      }
      throw new Error(`Failed to create relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get relationship by userId and contactId
   */
  static async getRelationship(userId: string, contactId: string): Promise<Relationship | null> {
    try {
      const relationship = await prisma.relationship.findUnique({
        where: {
          userId_contactId: {
            userId,
            contactId,
          },
        },
        include: {
          contact: true,
        },
      });

      return relationship;
    } catch (error) {
      throw new Error(`Failed to get relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update relationship
   */
  static async updateRelationship(
    userId: string,
    contactId: string,
    data: UpdateRelationshipData
  ): Promise<Relationship> {
    try {
      const relationship = await prisma.relationship.update({
        where: {
          userId_contactId: {
            userId,
            contactId,
          },
        },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      return relationship;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Relationship not found');
        }
      }
      throw new Error(`Failed to update relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get relationships by tier
   */
  static async getRelationshipsByTier(userId: string, tier: RelationshipTier): Promise<Relationship[]> {
    try {
      const relationships = await prisma.relationship.findMany({
        where: {
          userId,
          tier,
        },
        include: {
          contact: true,
        },
        orderBy: {
          healthScore: 'desc',
        },
      });

      return relationships;
    } catch (error) {
      throw new Error(`Failed to get relationships by tier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recalculate health score (alias for calculateHealthScore)
   */
  static async recalculateHealthScore(relationshipId: string): Promise<Relationship> {
    return this.calculateHealthScore(relationshipId);
  }

  /**
   * Calculate and update health score for a relationship
   */
  static async calculateHealthScore(relationshipId: string): Promise<Relationship> {
    try {
      const relationship = await prisma.relationship.findUnique({
        where: { id: relationshipId },
        include: {
          interactions: {
            orderBy: { date: 'desc' },
            take: 10, // Consider last 10 interactions
          },
        },
      });

      if (!relationship) {
        throw new Error('Relationship not found');
      }

      let score = 50; // Base score

      // Factor 1: Recency of last contact
      if (relationship.lastContactDate) {
        const daysSinceLastContact = Math.floor(
          (Date.now() - relationship.lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLastContact <= 7) score += 20;
        else if (daysSinceLastContact <= 30) score += 10;
        else if (daysSinceLastContact > 90) score -= 20;
      }

      // Factor 2: Interaction frequency vs expected
      const interactions = relationship.interactions;
      if (interactions.length > 0) {
        const recentInteractions = interactions.filter((i) => {
          const daysAgo = Math.floor((Date.now() - i.date.getTime()) / (1000 * 60 * 60 * 24));
          return daysAgo <= 30;
        }).length;
        score += Math.min(recentInteractions * 5, 20);
      }

      // Factor 3: Positive sentiment in recent interactions
      const positiveInteractions = interactions.filter((i) => i.sentiment === 'POSITIVE').length;
      score += Math.min(positiveInteractions * 3, 15);

      // Factor 4: Tier bonus
      const tierBonus: Record<RelationshipTier, number> = {
        INNER_CIRCLE: 15,
        CLOSE_FRIENDS: 10,
        FRIENDS: 5,
        ACQUAINTANCES: 0,
        PROFESSIONAL: 0,
      };
      score += tierBonus[relationship.tier] ?? 0;

      // Clamp score between 0 and 100
      score = Math.max(0, Math.min(100, score));

      const updated = await prisma.relationship.update({
        where: { id: relationshipId },
        data: {
          healthScore: score,
          updatedAt: new Date(),
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof Error && error.message === 'Relationship not found') {
        throw error;
      }
      throw new Error(`Failed to calculate health score: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update last contact date
   */
  static async updateLastContactDate(relationshipId: string, date?: Date): Promise<Relationship> {
    try {
      const relationship = await prisma.relationship.update({
        where: { id: relationshipId },
        data: {
          lastContactDate: date ?? new Date(),
          updatedAt: new Date(),
        },
      });

      return relationship;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Relationship not found');
        }
      }
      throw new Error(
        `Failed to update last contact date: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
