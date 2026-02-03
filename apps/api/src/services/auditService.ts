import { prisma } from '../lib/prisma';
import { Request } from 'express';

/**
 * Audit action types
 */
export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
  
  // Account management
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
  
  // Data operations
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  BULK_DELETE = 'BULK_DELETE',
  
  // Financial operations
  TRANSACTION_CREATED = 'TRANSACTION_CREATED',
  TRANSACTION_UPDATED = 'TRANSACTION_UPDATED',
  TRANSACTION_DELETED = 'TRANSACTION_DELETED',
  SAVINGS_GOAL_CREATED = 'SAVINGS_GOAL_CREATED',
  SAVINGS_GOAL_UPDATED = 'SAVINGS_GOAL_UPDATED',
  SAVINGS_GOAL_DELETED = 'SAVINGS_GOAL_DELETED',
  
  // Sensitive operations
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  
  // Calendar
  CALENDAR_CONNECTED = 'CALENDAR_CONNECTED',
  CALENDAR_DISCONNECTED = 'CALENDAR_DISCONNECTED',
  
  // Other
  SECURITY_EVENT = 'SECURITY_EVENT',
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    undefined
  );
}

/**
 * Get user agent from request
 */
function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'];
}

/**
 * Audit Service
 * Logs all sensitive operations for security and compliance
 */
export class AuditService {
  /**
   * Log an audit event
   */
  async log(
    action: AuditAction | string,
    userId: string | undefined,
    req: Request,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action,
          ipAddress: getClientIp(req),
          userAgent: getUserAgent(req),
          details: details || {},
        },
      });
    } catch (error) {
      // Don't throw errors from audit logging - log to console instead
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log authentication event
   */
  async logAuth(
    action: AuditAction.LOGIN_SUCCESS | AuditAction.LOGIN_FAILURE,
    userId: string | undefined,
    req: Request,
    email?: string,
    reason?: string
  ): Promise<void> {
    await this.log(
      action,
      userId,
      req,
      {
        email: email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined, // Mask email
        reason,
      }
    );
  }

  /**
   * Log password change
   */
  async logPasswordChange(
    userId: string,
    req: Request,
    success: boolean,
    reason?: string
  ): Promise<void> {
    await this.log(
      AuditAction.PASSWORD_CHANGE,
      userId,
      req,
      {
        success,
        reason,
      }
    );
  }

  /**
   * Log account lockout
   */
  async logAccountLockout(
    userId: string | undefined,
    req: Request,
    email?: string,
    reason?: string
  ): Promise<void> {
    await this.log(
      AuditAction.ACCOUNT_LOCKED,
      userId,
      req,
      {
        email: email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined,
        reason,
      }
    );
  }

  /**
   * Log data export
   */
  async logDataExport(
    userId: string,
    req: Request,
    exportType: string,
    recordCount?: number
  ): Promise<void> {
    await this.log(
      AuditAction.DATA_EXPORT,
      userId,
      req,
      {
        exportType,
        recordCount,
      }
    );
  }

  /**
   * Log account deletion
   */
  async logAccountDeletion(
    userId: string,
    req: Request,
    reason?: string
  ): Promise<void> {
    await this.log(
      AuditAction.ACCOUNT_DELETED,
      userId,
      req,
      {
        reason,
      }
    );
  }

  /**
   * Log financial transaction
   */
  async logTransaction(
    action: AuditAction.TRANSACTION_CREATED | AuditAction.TRANSACTION_UPDATED | AuditAction.TRANSACTION_DELETED,
    userId: string,
    req: Request,
    transactionId: string,
    amount?: number,
    currency?: string
  ): Promise<void> {
    await this.log(
      action,
      userId,
      req,
      {
        transactionId,
        amount,
        currency,
      }
    );
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: string | undefined,
    req: Request,
    event: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log(
      AuditAction.SECURITY_EVENT,
      userId,
      req,
      {
        event,
        ...details,
      }
    );
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get audit logs by action
   */
  async getAuditLogsByAction(
    action: string,
    limit: number = 100,
    offset: number = 0
  ) {
    return prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}

export const auditService = new AuditService();
