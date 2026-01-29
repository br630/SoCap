import { Response } from 'express';
import { z } from 'zod';
import { ContactService, CreateContactData, UpdateContactData } from '../services/contactService';
import { RelationshipService, UpdateRelationshipData } from '../services/relationshipService';
import { InteractionService, CreateInteractionData } from '../services/interactionService';
import { UserService } from '../services/userService';
import { AuthenticatedRequest } from '../types/express';
import { prisma } from '../lib/prisma';
import { RelationshipTier, RelationshipType, CommunicationFrequency } from '@prisma/client';
import {
  createContactSchema,
  updateContactSchema,
  importContactsSchema,
  updateRelationshipSchema,
  logInteractionSchema,
  getContactsQuerySchema,
  CreateContactInput,
  UpdateContactInput,
  ImportContactsInput,
  UpdateRelationshipInput,
  LogInteractionInput,
  GetContactsQuery,
} from '../validators/contactValidators';

/**
 * Helper to get local user ID from Firebase UID
 */
async function getLocalUserId(firebaseUid: string, email?: string): Promise<string> {
  const localUser = await UserService.getUserByEmail(email || '');
  if (!localUser) {
    throw new Error('User not found in local database');
  }
  return localUser.id;
}

/**
 * Get all contacts for the authenticated user
 * GET /contacts
 * Query params: page, limit, tier, search, sortBy, sortOrder
 */
export async function getContacts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    
    // Validate and parse query params
    const query = getContactsQuerySchema.parse(req.query);

    const filters: any = {
      ...(query.search && { search: query.search }),
      ...(query.tier && { tier: query.tier }),
    };

    const pagination = {
      ...(query.page && { page: query.page }),
      ...(query.limit && { limit: query.limit }),
    };

    // Get contacts with relationship info
    const result = await ContactService.getContactsWithRelationships(
      localUserId,
      filters,
      pagination,
      query.sortBy,
      query.sortOrder
    );
    
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }
    console.error('Get contacts error:', error);
    res.status(500).json({
      error: 'Failed to get contacts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get a single contact by ID with full relationship details and recent interactions
 * GET /contacts/:id
 */
export async function getContactById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id } = req.params;

    const contact = await ContactService.getContactWithDetails(localUserId, id);
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      error: 'Failed to get contact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create a new contact and relationship record
 * POST /contacts
 */
export async function createContact(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const validated: CreateContactInput = createContactSchema.parse(req.body);

    const data: CreateContactData = {
      name: validated.name,
      phone: validated.phone,
      email: validated.email || undefined,
      profileImage: validated.profileImage || undefined,
      birthday: validated.birthday ? new Date(validated.birthday) : undefined,
      anniversary: validated.anniversary ? new Date(validated.anniversary) : undefined,
      notes: validated.notes,
      importSource: validated.importSource,
    };

    // Create contact and default relationship
    const contact = await ContactService.createContactWithRelationship(localUserId, data);
    
    res.status(201).json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Create contact error:', error);
    res.status(500).json({
      error: 'Failed to create contact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update a contact
 * PUT /contacts/:id
 */
export async function updateContact(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id } = req.params;
    const validated: UpdateContactInput = updateContactSchema.parse(req.body);

    const data: UpdateContactData = {
      ...(validated.name && { name: validated.name }),
      ...(validated.phone !== undefined && { phone: validated.phone }),
      ...(validated.email !== undefined && { email: validated.email || undefined }),
      ...(validated.profileImage !== undefined && { profileImage: validated.profileImage || undefined }),
      ...(validated.birthday && { birthday: new Date(validated.birthday) }),
      ...(validated.anniversary && { anniversary: new Date(validated.anniversary) }),
      ...(validated.notes !== undefined && { notes: validated.notes }),
      ...(validated.importSource && { importSource: validated.importSource }),
    };

    const contact = await ContactService.updateContact(localUserId, id, data);
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Update contact error:', error);
    res.status(500).json({
      error: 'Failed to update contact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete a contact (soft delete)
 * DELETE /contacts/:id
 */
export async function deleteContact(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id } = req.params;

    await ContactService.deleteContact(localUserId, id);
    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      error: 'Failed to delete contact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Import contacts in bulk
 * POST /contacts/import
 */
export async function importContacts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const validated: ImportContactsInput = importContactsSchema.parse(req.body);

    const result = await ContactService.importContacts(localUserId, validated.contacts);
    
    res.status(201).json({
      success: true,
      summary: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Import contacts error:', error);
    res.status(500).json({
      error: 'Failed to import contacts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update relationship settings for a contact
 * PUT /contacts/:id/relationship
 */
export async function updateRelationship(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id: contactId } = req.params;
    const validated: UpdateRelationshipInput = updateRelationshipSchema.parse(req.body);

    // Verify contact belongs to user
    const contact = await ContactService.getContactById(localUserId, contactId);
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    // Get or create relationship
    let relationship = await prisma.relationship.findUnique({
      where: {
        userId_contactId: {
          userId: localUserId,
          contactId: contactId,
        },
      },
    });

    const data: UpdateRelationshipData = {
      ...(validated.tier && { tier: validated.tier }),
      ...(validated.customLabel !== undefined && { customLabel: validated.customLabel }),
      ...(validated.relationshipType && { relationshipType: validated.relationshipType }),
      ...(validated.communicationFrequency && { communicationFrequency: validated.communicationFrequency }),
      ...(validated.sharedInterests && { sharedInterests: validated.sharedInterests }),
      ...(validated.importantDates && { importantDates: validated.importantDates }),
    };

    if (relationship) {
      relationship = await RelationshipService.updateRelationship(localUserId, contactId, data);
    } else {
      // Create relationship with default values
      relationship = await RelationshipService.createRelationship(localUserId, contactId, {
        tier: validated.tier || RelationshipTier.ACQUAINTANCES,
        relationshipType: validated.relationshipType || RelationshipType.OTHER,
        communicationFrequency: validated.communicationFrequency || CommunicationFrequency.MONTHLY,
        customLabel: validated.customLabel,
        sharedInterests: validated.sharedInterests,
        importantDates: validated.importantDates,
      });
    }

    res.json({
      success: true,
      relationship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Update relationship error:', error);
    res.status(500).json({
      error: 'Failed to update relationship',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Log an interaction with a contact
 * POST /contacts/:id/interactions
 */
export async function logInteraction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id: contactId } = req.params;
    const validated: LogInteractionInput = logInteractionSchema.parse(req.body);

    // Verify contact belongs to user
    const contact = await ContactService.getContactById(localUserId, contactId);
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    // Get relationship
    let relationship = await prisma.relationship.findUnique({
      where: {
        userId_contactId: {
          userId: localUserId,
          contactId: contactId,
        },
      },
    });

    if (!relationship) {
      // Create default relationship if it doesn't exist
      relationship = await RelationshipService.createRelationship(localUserId, contactId, {
        tier: RelationshipTier.ACQUAINTANCES,
        relationshipType: RelationshipType.OTHER,
        communicationFrequency: CommunicationFrequency.MONTHLY,
      });
    }

    const data: CreateInteractionData = {
      type: validated.type,
      date: new Date(validated.date),
      duration: validated.duration,
      notes: validated.notes,
      sentiment: validated.sentiment,
    };

    // Log interaction and update relationship
    const interaction = await InteractionService.logInteraction(relationship.id, data);

    // Recalculate health score
    await RelationshipService.recalculateHealthScore(relationship.id);

    res.status(201).json({
      success: true,
      interaction,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Log interaction error:', error);
    res.status(500).json({
      error: 'Failed to log interaction',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get interaction history for a contact
 * GET /contacts/:id/interactions
 */
export async function getInteractionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const { id: contactId } = req.params;
    const { page, limit } = req.query;

    // Verify contact belongs to user
    const contact = await ContactService.getContactById(localUserId, contactId);
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    // Get relationship
    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_contactId: {
          userId: localUserId,
          contactId: contactId,
        },
      },
    });

    if (!relationship) {
      res.json({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });
      return;
    }

    const pagination = {
      ...(page && { page: parseInt(page as string, 10) }),
      ...(limit && { limit: parseInt(limit as string, 10) }),
    };

    const result = await InteractionService.getInteractionHistory(relationship.id, pagination);
    res.json(result);
  } catch (error) {
    console.error('Get interaction history error:', error);
    res.status(500).json({
      error: 'Failed to get interaction history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
