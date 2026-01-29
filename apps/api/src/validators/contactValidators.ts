import { z } from 'zod';
import { ImportSource, RelationshipTier, RelationshipType, CommunicationFrequency, InteractionType, Sentiment } from '@prisma/client';

/**
 * Create contact validation schema
 */
export const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  profileImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
  birthday: z.string().datetime().optional().or(z.literal('')),
  anniversary: z.string().datetime().optional().or(z.literal('')),
  notes: z.string().optional(),
  importSource: z.nativeEnum(ImportSource).default(ImportSource.MANUAL),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

/**
 * Update contact validation schema
 */
export const updateContactSchema = createContactSchema.partial();

export type UpdateContactInput = z.infer<typeof updateContactSchema>;

/**
 * Import contacts validation schema
 */
export const importContactsSchema = z.object({
  contacts: z.array(createContactSchema).min(1, 'At least one contact is required').max(1000, 'Too many contacts'),
});

export type ImportContactsInput = z.infer<typeof importContactsSchema>;

/**
 * Update relationship validation schema
 */
export const updateRelationshipSchema = z.object({
  tier: z.nativeEnum(RelationshipTier).optional(),
  customLabel: z.string().max(100, 'Label is too long').optional(),
  relationshipType: z.nativeEnum(RelationshipType).optional(),
  communicationFrequency: z.nativeEnum(CommunicationFrequency).optional(),
  sharedInterests: z.array(z.string()).optional(),
  importantDates: z.array(z.any()).optional(),
});

export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;

/**
 * Log interaction validation schema
 */
export const logInteractionSchema = z.object({
  type: z.nativeEnum(InteractionType),
  date: z.string().datetime('Invalid date format'),
  duration: z.number().int().min(0, 'Duration must be positive').optional(),
  notes: z.string().optional(),
  sentiment: z.nativeEnum(Sentiment).optional(),
});

export type LogInteractionInput = z.infer<typeof logInteractionSchema>;

/**
 * Query params for getContacts
 */
export const getContactsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  tier: z.nativeEnum(RelationshipTier).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'lastContactDate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type GetContactsQuery = z.infer<typeof getContactsQuerySchema>;
