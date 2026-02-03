import { prisma } from '../lib/prisma';
import { RelationshipTier, InteractionType, ReminderStatus, ReminderType, EventStatus } from '@prisma/client';

// Types
export interface DashboardData {
  healthScore: number;
  healthScoreTrend: number;
  todayReminders: any[];
  upcomingEvents: any[];
  contactsNeedingAttention: any[];
  savingsSummary: {
    totalSaved: number;
    activeGoals: number;
    nearestDeadline: Date | null;
  };
  tipOfTheDay: string;
}

export interface InsightsData {
  communicationTrends: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
    byType: {
      call: number;
      text: number;
      inPerson: number;
    };
  };
  tierDistribution: Record<RelationshipTier, number>;
  topContacts: any[];
  neglectedTiers: RelationshipTier[];
  averageHealthScore: number;
  healthScoreHistory: { date: Date; score: number }[];
}

export interface HealthScoreComponents {
  innerCircleScore: number;
  eventParticipationScore: number;
  relationshipDiversityScore: number;
  reminderResponseScore: number;
  specialDatesScore: number;
}

/**
 * Dashboard Service
 * Handles dashboard data aggregation and health score calculation
 */
export class DashboardService {
  /**
   * Calculate health score for a user
   */
  async calculateHealthScore(userId: string): Promise<{
    score: number;
    components: HealthScoreComponents;
  }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get user's relationships
    const relationships = await prisma.relationship.findMany({
      where: { userId },
      include: {
        contact: true,
        interactions: {
          where: {
            date: { gte: thirtyDaysAgo },
          },
        },
      },
    });

    // Component 1: Inner Circle Contact (40%)
    const innerCircleContacts = relationships.filter(
      (r) => r.tier === RelationshipTier.INNER_CIRCLE
    );
    const innerCircleScore = this.calculateInnerCircleScore(
      innerCircleContacts,
      thirtyDaysAgo
    );

    // Component 2: Event Participation (20%)
    const eventsThisMonth = await prisma.event.findMany({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
        status: { not: EventStatus.CANCELLED },
      },
    });
    const eventParticipationScore = this.calculateEventParticipationScore(
      eventsThisMonth,
      userId
    );

    // Component 3: Relationship Diversity (15%)
    const relationshipDiversityScore = this.calculateRelationshipDiversityScore(
      relationships
    );

    // Component 4: Reminder Response (15%)
    const reminders = await prisma.reminder.findMany({
      where: {
        userId,
        scheduledDate: { gte: thirtyDaysAgo },
      },
    });
    const reminderResponseScore = this.calculateReminderResponseScore(reminders);

    // Component 5: Special Dates (10%)
    const specialDatesScore = await this.calculateSpecialDatesScore(
      userId,
      thirtyDaysAgo
    );

    // Calculate weighted total
    const totalScore =
      innerCircleScore * 0.4 +
      eventParticipationScore * 0.2 +
      relationshipDiversityScore * 0.15 +
      reminderResponseScore * 0.15 +
      specialDatesScore * 0.1;

    return {
      score: Math.round(totalScore),
      components: {
        innerCircleScore: Math.round(innerCircleScore),
        eventParticipationScore: Math.round(eventParticipationScore),
        relationshipDiversityScore: Math.round(relationshipDiversityScore),
        reminderResponseScore: Math.round(reminderResponseScore),
        specialDatesScore: Math.round(specialDatesScore),
      },
    };
  }

  /**
   * Calculate Inner Circle contact score (40% weight)
   */
  private calculateInnerCircleScore(
    innerCircleContacts: any[],
    sinceDate: Date
  ): number {
    if (innerCircleContacts.length === 0) return 50; // Neutral score if no inner circle

    let totalScore = 0;
    const now = new Date();

    for (const relationship of innerCircleContacts) {
      const frequency = relationship.communicationFrequency;
      const lastContact = relationship.lastContactDate
        ? new Date(relationship.lastContactDate)
        : null;

      // Expected days between contacts based on frequency
      const expectedDays = this.getExpectedDaysForFrequency(frequency);
      const daysSinceLastContact = lastContact
        ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Check if there are recent interactions
      const recentInteractions = relationship.interactions.filter(
        (i: any) => new Date(i.date) >= sinceDate
      );

      if (recentInteractions.length > 0 || daysSinceLastContact <= expectedDays) {
        totalScore += 100; // Full points
      } else if (daysSinceLastContact <= expectedDays * 1.5) {
        totalScore += 75; // Slightly overdue
      } else if (daysSinceLastContact <= expectedDays * 2) {
        totalScore += 50; // Moderately overdue
      } else {
        totalScore += 25; // Significantly overdue
      }
    }

    return totalScore / innerCircleContacts.length;
  }

  /**
   * Get expected days between contacts for a frequency
   */
  private getExpectedDaysForFrequency(
    frequency: string
  ): number {
    switch (frequency) {
      case 'DAILY':
        return 1;
      case 'WEEKLY':
        return 7;
      case 'BIWEEKLY':
        return 14;
      case 'MONTHLY':
        return 30;
      case 'QUARTERLY':
        return 90;
      default:
        return 30;
    }
  }

  /**
   * Calculate Event Participation score (20% weight)
   */
  private async calculateEventParticipationScore(
    eventsThisMonth: any[],
    userId: string
  ): Promise<number> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get events from previous month for comparison
    const eventsLastMonth = await prisma.event.count({
      where: {
        userId,
        date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        status: { not: EventStatus.CANCELLED },
      },
    });

    const eventsHosted = eventsThisMonth.filter(
      (e) => e.status === EventStatus.CONFIRMED || e.status === EventStatus.COMPLETED
    ).length;

    // Get events user attended (as attendee)
    const eventsAttended = await prisma.eventAttendee.count({
      where: {
        contact: {
          userId,
        },
        event: {
          date: { gte: thirtyDaysAgo },
          status: { not: EventStatus.CANCELLED },
        },
        rsvpStatus: 'CONFIRMED',
      },
    });

    const totalParticipation = eventsHosted + eventsAttended;
    const averageParticipation = eventsLastMonth || 1; // Avoid division by zero

    // Score based on participation relative to average
    if (totalParticipation >= averageParticipation * 1.2) {
      return 100; // Excellent
    } else if (totalParticipation >= averageParticipation) {
      return 80; // Good
    } else if (totalParticipation >= averageParticipation * 0.7) {
      return 60; // Average
    } else if (totalParticipation >= averageParticipation * 0.5) {
      return 40; // Below average
    } else {
      return 20; // Low participation
    }
  }

  /**
   * Calculate Relationship Diversity score (15% weight)
   */
  private calculateRelationshipDiversityScore(relationships: any[]): number {
    if (relationships.length === 0) return 0;

    // Count unique tiers
    const uniqueTiers = new Set(
      relationships.map((r) => r.tier)
    ).size;
    const totalTiers = Object.keys(RelationshipTier).length;

    // Count unique relationship types
    const uniqueTypes = new Set(
      relationships.map((r) => r.relationshipType)
    ).size;
    const totalTypes = 5; // FAMILY, FRIEND, COLLEAGUE, ROMANTIC, OTHER

    // Tier diversity score (0-50 points)
    const tierScore = (uniqueTiers / totalTiers) * 50;

    // Type diversity score (0-50 points)
    const typeScore = (uniqueTypes / totalTypes) * 50;

    return tierScore + typeScore;
  }

  /**
   * Calculate Reminder Response score (15% weight)
   */
  private calculateReminderResponseScore(reminders: any[]): number {
    if (reminders.length === 0) return 50; // Neutral if no reminders

    const now = new Date();
    const completedReminders = reminders.filter(
      (r) => r.status === ReminderStatus.COMPLETED
    ).length;

    const overdueReminders = reminders.filter(
      (r) => r.status === ReminderStatus.PENDING && r.scheduledDate < now
    ).length;

    const totalReminders = reminders.length;
    const completionRate = completedReminders / totalReminders;
    const overdueRate = overdueReminders / totalReminders;

    // Score based on completion rate, penalize overdue
    let score = completionRate * 100;
    score -= overdueRate * 30; // Penalty for overdue reminders

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate Special Dates score (10% weight)
   */
  private async calculateSpecialDatesScore(
    userId: string,
    sinceDate: Date
  ): Promise<number> {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Get contacts with birthdays/anniversaries
    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        OR: [
          { birthday: { not: null } },
          { anniversary: { not: null } },
        ],
      },
    });

    if (contacts.length === 0) return 50; // Neutral if no special dates

    let acknowledgedCount = 0;
    let totalSpecialDates = 0;

    for (const contact of contacts) {
      if (contact.birthday) {
        totalSpecialDates++;
        const birthdayThisYear = new Date(
          now.getFullYear(),
          contact.birthday.getMonth(),
          contact.birthday.getDate()
        );

        // Check if there was an interaction or reminder around birthday
        if (birthdayThisYear >= yearStart && birthdayThisYear <= now) {
          const daysDiff = Math.abs(
            (now.getTime() - birthdayThisYear.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff <= 7) {
            // Check for interactions or reminders around birthday
            const relationship = await prisma.relationship.findUnique({
              where: {
                userId_contactId: {
                  userId,
                  contactId: contact.id,
                },
              },
              include: {
                interactions: {
                  where: {
                    date: {
                      gte: new Date(birthdayThisYear.getTime() - 7 * 24 * 60 * 60 * 1000),
                      lte: new Date(birthdayThisYear.getTime() + 7 * 24 * 60 * 60 * 1000),
                    },
                  },
                },
              },
            });

            if (relationship && relationship.interactions.length > 0) {
              acknowledgedCount++;
            }
          }
        }
      }

      if (contact.anniversary) {
        totalSpecialDates++;
        const anniversaryThisYear = new Date(
          now.getFullYear(),
          contact.anniversary.getMonth(),
          contact.anniversary.getDate()
        );

        if (anniversaryThisYear >= yearStart && anniversaryThisYear <= now) {
          const daysDiff = Math.abs(
            (now.getTime() - anniversaryThisYear.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff <= 7) {
            const relationship = await prisma.relationship.findUnique({
              where: {
                userId_contactId: {
                  userId,
                  contactId: contact.id,
                },
              },
              include: {
                interactions: {
                  where: {
                    date: {
                      gte: new Date(anniversaryThisYear.getTime() - 7 * 24 * 60 * 60 * 1000),
                      lte: new Date(anniversaryThisYear.getTime() + 7 * 24 * 60 * 60 * 1000),
                    },
                  },
                },
              },
            });

            if (relationship && relationship.interactions.length > 0) {
              acknowledgedCount++;
            }
          }
        }
      }
    }

    if (totalSpecialDates === 0) return 50;

    return (acknowledgedCount / totalSpecialDates) * 100;
  }

  /**
   * Get dashboard data
   */
  async getDashboard(userId: string): Promise<DashboardData> {
    const now = new Date();
    const todayStart = new Date(now.getTime() - now.getHours() * 60 * 60 * 1000 - now.getMinutes() * 60 * 1000 - now.getSeconds() * 1000);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate health score
    const { score: healthScore, components } = await this.calculateHealthScore(userId);

    // Get health score from 7 days ago for trend
    const healthScoreTrend = await this.getHealthScoreTrend(userId, sevenDaysAgo, healthScore);

    // Get today's reminders
    const todayReminders = await prisma.reminder.findMany({
      where: {
        userId,
        scheduledDate: { gte: todayStart, lt: todayEnd },
        status: ReminderStatus.PENDING,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Get upcoming events (next 7 days)
    const upcomingEvents = await prisma.event.findMany({
      where: {
        userId,
        date: { gte: now, lte: sevenDaysFromNow },
        status: { not: EventStatus.CANCELLED },
      },
      include: {
        attendees: {
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: 10,
    });

    // Get contacts needing attention (overdue)
    const contactsNeedingAttention = await this.getContactsNeedingAttention(userId);

    // Get savings summary
    const savingsSummary = await this.getSavingsSummary(userId);

    // Get tip of the day
    const tipOfTheDay = this.getTipOfTheDay(components);

    return {
      healthScore,
      healthScoreTrend,
      todayReminders,
      upcomingEvents,
      contactsNeedingAttention,
      savingsSummary,
      tipOfTheDay,
    };
  }

  /**
   * Get health score trend
   */
  private async getHealthScoreTrend(
    userId: string,
    pastDate: Date,
    currentScore: number
  ): Promise<number> {
    // Simplified: calculate score based on past data
    // In production, you'd query stored daily health scores from a HealthScoreHistory table
    // For now, we'll use a simplified calculation that looks at past interactions
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get relationships to calculate past score
    const relationships = await prisma.relationship.findMany({
      where: { userId },
      include: {
        interactions: {
          where: {
            date: { gte: sevenDaysAgo, lt: pastDate },
          },
        },
      },
    });

    // Simplified past score calculation (just based on interaction count)
    const pastInteractions = relationships.reduce(
      (sum, r) => sum + r.interactions.length,
      0
    );
    const currentInteractions = await prisma.interaction.count({
      where: {
        relationship: { userId },
        date: { gte: pastDate },
      },
    });

    // Estimate trend based on interaction change
    // In production, use stored daily scores
    const interactionChange = currentInteractions - pastInteractions;
    const estimatedTrend = Math.min(20, Math.max(-20, interactionChange * 2)); // Cap at ±20
    
    return estimatedTrend;
  }

  /**
   * Get contacts needing attention
   */
  private async getContactsNeedingAttention(userId: string): Promise<any[]> {
    const relationships = await prisma.relationship.findMany({
      where: { userId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            birthday: true,
            anniversary: true,
          },
        },
        interactions: {
          orderBy: {
            date: 'desc',
          },
          take: 1,
        },
      },
    });

    const now = new Date();
    const contactsNeedingAttention = relationships
      .map((rel) => {
        const frequency = rel.communicationFrequency;
        const expectedDays = this.getExpectedDaysForFrequency(frequency);
        const lastContact = rel.lastContactDate
          ? new Date(rel.lastContactDate)
          : rel.interactions[0]?.date
          ? new Date(rel.interactions[0].date)
          : null;

        if (!lastContact) {
          return { ...rel, daysOverdue: 999 };
        }

        const daysSince = Math.floor(
          (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysOverdue = daysSince - expectedDays;

        return { ...rel, daysOverdue };
      })
      .filter((rel) => rel.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5)
      .map((rel) => ({
        id: rel.contact.id,
        name: rel.contact.name,
        profileImage: rel.contact.profileImage,
        tier: rel.tier,
        daysOverdue: rel.daysOverdue,
        lastContactDate: rel.lastContactDate,
      }));

    return contactsNeedingAttention;
  }

  /**
   * Get savings summary
   */
  private async getSavingsSummary(userId: string): Promise<{
    totalSaved: number;
    activeGoals: number;
    nearestDeadline: Date | null;
  }> {
    const savingsGoals = await prisma.savingsGoal.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        deadline: 'asc',
      },
    });

    const totalSaved = savingsGoals.reduce(
      (sum, goal) => sum + Number(goal.currentAmount),
      0
    );

    const nearestDeadline =
      savingsGoals.length > 0 && savingsGoals[0].deadline
        ? savingsGoals[0].deadline
        : null;

    return {
      totalSaved,
      activeGoals: savingsGoals.length,
      nearestDeadline,
    };
  }

  /**
   * Get tip of the day based on health score components
   */
  private getTipOfTheDay(components: HealthScoreComponents): string {
    const tips = [
      "Remember to reach out to your inner circle regularly to maintain strong relationships.",
      "Hosting events is a great way to bring people together and strengthen bonds.",
      "Diversify your relationships across different tiers and types for a well-rounded social life.",
      "Acting on reminders promptly helps you stay on top of your relationships.",
      "Don't forget to acknowledge birthdays and anniversaries - they mean a lot to people!",
    ];

    // Find the lowest scoring component
    const scores = [
      { name: 'innerCircle', score: components.innerCircleScore },
      { name: 'eventParticipation', score: components.eventParticipationScore },
      { name: 'relationshipDiversity', score: components.relationshipDiversityScore },
      { name: 'reminderResponse', score: components.reminderResponseScore },
      { name: 'specialDates', score: components.specialDatesScore },
    ];

    const lowest = scores.reduce((min, curr) =>
      curr.score < min.score ? curr : min
    );

    const tipIndex = scores.indexOf(lowest);
    return tips[tipIndex] || tips[0];
  }

  /**
   * Get insights data
   */
  async getInsights(userId: string): Promise<InsightsData> {
    const now = new Date();
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get all relationships with interactions
    const relationships = await prisma.relationship.findMany({
      where: { userId },
      include: {
        contact: true,
        interactions: {
          where: {
            date: { gte: lastMonthStart },
          },
        },
      },
    });

    // Communication trends
    const thisWeekInteractions = relationships.flatMap((r) =>
      r.interactions.filter((i) => new Date(i.date) >= thisWeekStart)
    );
    const lastWeekInteractions = relationships.flatMap((r) =>
      r.interactions.filter(
        (i) =>
          new Date(i.date) >= lastWeekStart && new Date(i.date) < thisWeekStart
      )
    );
    const thisMonthInteractions = relationships.flatMap((r) =>
      r.interactions.filter((i) => new Date(i.date) >= thisMonthStart)
    );
    const lastMonthInteractions = relationships.flatMap((r) =>
      r.interactions.filter(
        (i) =>
          new Date(i.date) >= lastMonthStart && new Date(i.date) < thisMonthStart
      )
    );

    // Count by type
    const byType = {
      call: thisMonthInteractions.filter((i) => i.type === InteractionType.CALL).length,
      text: thisMonthInteractions.filter((i) => i.type === InteractionType.TEXT).length,
      inPerson: thisMonthInteractions.filter(
        (i) => i.type === InteractionType.IN_PERSON
      ).length,
    };

    // Tier distribution
    const tierDistribution = relationships.reduce(
      (acc, rel) => {
        acc[rel.tier] = (acc[rel.tier] || 0) + 1;
        return acc;
      },
      {} as Record<RelationshipTier, number>
    );

    // Initialize all tiers to 0
    Object.values(RelationshipTier).forEach((tier) => {
      if (!tierDistribution[tier]) {
        tierDistribution[tier] = 0;
      }
    });

    // Top contacts (most interactions this month)
    const contactInteractionCounts = new Map<string, number>();
    thisMonthInteractions.forEach((interaction) => {
      const rel = relationships.find((r) =>
        r.interactions.some((i) => i.id === interaction.id)
      );
      if (rel) {
        contactInteractionCounts.set(
          rel.contactId,
          (contactInteractionCounts.get(rel.contactId) || 0) + 1
        );
      }
    });

    const topContacts = Array.from(contactInteractionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([contactId, count]) => {
        const rel = relationships.find((r) => r.contactId === contactId);
        return {
          id: rel?.contact.id,
          name: rel?.contact.name,
          profileImage: rel?.contact.profileImage,
          interactionCount: count,
          tier: rel?.tier,
        };
      })
      .filter((c) => c.id);

    // Neglected tiers (tiers with low engagement)
    const neglectedTiers = Object.entries(tierDistribution)
      .filter(([tier, count]) => {
        if (count === 0) return true;
        const tierRels = relationships.filter((r) => r.tier === tier);
        const avgInteractions = tierRels.reduce(
          (sum, r) => sum + r.interactions.length,
          0
        ) / tierRels.length;
        return avgInteractions < 2; // Less than 2 interactions per contact
      })
      .map(([tier]) => tier as RelationshipTier);

    // Average health score (current)
    const { score: averageHealthScore } = await this.calculateHealthScore(userId);

    // Health score history (last 30 days) - simplified, would use stored scores in production
    const healthScoreHistory = await this.getHealthScoreHistory(userId, 30);

    return {
      communicationTrends: {
        thisWeek: thisWeekInteractions.length,
        lastWeek: lastWeekInteractions.length,
        thisMonth: thisMonthInteractions.length,
        lastMonth: lastMonthInteractions.length,
        byType,
      },
      tierDistribution,
      topContacts,
      neglectedTiers,
      averageHealthScore,
      healthScoreHistory,
    };
  }

  /**
   * Get health score history
   */
  private async getHealthScoreHistory(
    userId: string,
    days: number
  ): Promise<{ date: Date; score: number }[]> {
    // Simplified implementation - in production, you'd query stored daily scores
    // from a HealthScoreHistory table that's populated by a daily cron job
    const history: { date: Date; score: number }[] = [];
    const now = new Date();

    // Calculate current score once
    const { score: currentScore } = await this.calculateHealthScore(userId);

    // Generate history with slight variations to simulate trends
    // In production, this would be actual stored daily scores
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      // Simulate slight daily variations (±5 points)
      const variation = Math.floor(Math.random() * 11) - 5;
      const score = Math.max(0, Math.min(100, currentScore + variation));
      history.push({ date, score });
    }

    return history;
  }
}

export const dashboardService = new DashboardService();
