import { Prisma, SavingsGoal, SavingsGoalStatus, TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateGoalData {
  eventId?: string;
  name: string;
  targetAmount: number;
  currency?: string;
  deadline?: Date;
  autoSaveEnabled?: boolean;
  autoSaveAmount?: number;
  autoSaveFrequency?: string;
  status?: SavingsGoalStatus;
}

export interface UpdateGoalData {
  name?: string;
  targetAmount?: number;
  currency?: string;
  deadline?: Date;
  autoSaveEnabled?: boolean;
  autoSaveAmount?: number;
  autoSaveFrequency?: string;
  status?: SavingsGoalStatus;
}

export class SavingsService {
  /**
   * Create a new savings goal
   */
  static async createGoal(userId: string, data: CreateGoalData): Promise<SavingsGoal> {
    try {
      const goal = await prisma.savingsGoal.create({
        data: {
          userId,
          eventId: data.eventId,
          name: data.name,
          targetAmount: data.targetAmount,
          currency: data.currency ?? 'USD',
          deadline: data.deadline,
          autoSaveEnabled: data.autoSaveEnabled ?? false,
          autoSaveAmount: data.autoSaveAmount,
          autoSaveFrequency: data.autoSaveFrequency as any,
          status: data.status ?? 'ACTIVE',
          currentAmount: 0,
        },
      });

      return goal;
    } catch (error) {
      throw new Error(`Failed to create savings goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all savings goals for a user
   */
  static async getGoals(userId: string): Promise<SavingsGoal[]> {
    try {
      const goals = await prisma.savingsGoal.findMany({
        where: { userId },
        include: {
          transactions: {
            orderBy: { date: 'desc' },
            take: 10, // Get last 10 transactions
          },
          event: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return goals;
    } catch (error) {
      throw new Error(`Failed to get savings goals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get savings goal by ID
   */
  static async getGoalById(userId: string, goalId: string): Promise<SavingsGoal | null> {
    try {
      const goal = await prisma.savingsGoal.findFirst({
        where: {
          id: goalId,
          userId,
        },
        include: {
          transactions: {
            orderBy: { date: 'desc' },
          },
          event: true,
        },
      });

      return goal;
    } catch (error) {
      throw new Error(`Failed to get savings goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update savings goal
   */
  static async updateGoal(userId: string, goalId: string, data: UpdateGoalData): Promise<SavingsGoal> {
    try {
      // Verify goal belongs to user
      const existingGoal = await prisma.savingsGoal.findFirst({
        where: {
          id: goalId,
          userId,
        },
      });

      if (!existingGoal) {
        throw new Error('Savings goal not found');
      }

      const goal = await prisma.savingsGoal.update({
        where: { id: goalId },
        data: {
          ...data,
          autoSaveFrequency: data.autoSaveFrequency as any,
          updatedAt: new Date(),
        },
      });

      return goal;
    } catch (error) {
      if (error instanceof Error && error.message === 'Savings goal not found') {
        throw error;
      }
      throw new Error(`Failed to update savings goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add contribution to savings goal
   */
  static async addContribution(
    goalId: string,
    amount: number,
    description?: string
  ): Promise<{ goal: SavingsGoal; transaction: any }> {
    try {
      const goal = await prisma.savingsGoal.findUnique({
        where: { id: goalId },
      });

      if (!goal) {
        throw new Error('Savings goal not found');
      }

      if (goal.status !== 'ACTIVE') {
        throw new Error('Cannot add contribution to inactive goal');
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create transaction
        const transaction = await tx.transaction.create({
          data: {
            savingsGoalId: goalId,
            amount,
            type: 'DEPOSIT',
            date: new Date(),
            description: description ?? 'Manual contribution',
          },
        });

        // Update goal current amount
        const updatedGoal = await tx.savingsGoal.update({
          where: { id: goalId },
          data: {
            currentAmount: {
              increment: amount,
            },
            updatedAt: new Date(),
          },
        });

        // Check if goal is completed
        if (updatedGoal.currentAmount >= updatedGoal.targetAmount && updatedGoal.status === 'ACTIVE') {
          await tx.savingsGoal.update({
            where: { id: goalId },
            data: {
              status: 'COMPLETED',
              updatedAt: new Date(),
            },
          });
          updatedGoal.status = 'COMPLETED';
        }

        return { goal: updatedGoal, transaction };
      });

      return result;
    } catch (error) {
      if (error instanceof Error && (error.message === 'Savings goal not found' || error.message.includes('inactive'))) {
        throw error;
      }
      throw new Error(`Failed to add contribution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Withdraw from savings goal
   */
  static async withdrawFromGoal(
    goalId: string,
    amount: number,
    description?: string
  ): Promise<{ goal: SavingsGoal; transaction: any }> {
    try {
      const goal = await prisma.savingsGoal.findUnique({
        where: { id: goalId },
      });

      if (!goal) {
        throw new Error('Savings goal not found');
      }

      if (goal.currentAmount.toNumber() < amount) {
        throw new Error('Insufficient funds in savings goal');
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create withdrawal transaction
        const transaction = await tx.transaction.create({
          data: {
            savingsGoalId: goalId,
            amount,
            type: 'WITHDRAWAL',
            date: new Date(),
            description: description ?? 'Withdrawal',
          },
        });

        // Update goal current amount
        const updatedGoal = await tx.savingsGoal.update({
          where: { id: goalId },
          data: {
            currentAmount: {
              decrement: amount,
            },
            updatedAt: new Date(),
          },
        });

        return { goal: updatedGoal, transaction };
      });

      return result;
    } catch (error) {
      if (error instanceof Error && (error.message === 'Savings goal not found' || error.message.includes('Insufficient'))) {
        throw error;
      }
      throw new Error(`Failed to withdraw from goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
