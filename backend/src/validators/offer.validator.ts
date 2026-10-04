import { z } from 'zod';
import { OfferStatus, FollowUpMethod } from '@prisma/client';

export const createOfferSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  salespersonId: z.string().uuid('Invalid salesperson ID'),
  contactPerson: z.string().max(100).optional(),
  customerRfqNumber: z.string().max(50).optional(),
  businessDivision: z.string().max(100).optional(),
  product: z.string().min(1, 'Product is required').max(200),
  applicationDescription: z.string().max(1000).optional(),
  currency: z.string().length(3).default('INR'),
  offerValue: z.number().min(0, 'Offer value cannot be negative'),
  validityDays: z.number().int().min(1).max(365).default(30),
  offerDate: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
  source: z.string().max(100).optional(),
  commercialRemarks: z.string().max(1000).optional(),
});

export const updateOfferSchema = createOfferSchema.partial().omit({ customerId: true });

export const changeStatusSchema = z.object({
  status: z.nativeEnum(OfferStatus),
  remarks: z.string().max(500).optional(),
});

export const createRevisionSchema = z.object({
  offerValue: z.number().min(0, 'Offer value cannot be negative'),
  currency: z.string().length(3).default('INR'),
  description: z.string().max(1000).optional(),
  commercialRemarks: z.string().max(1000).optional(),
  changeReason: z.string().min(1, 'Change reason is required').max(500),
});

export const createFollowUpSchema = z.object({
  followUpDate: z.string().min(1, 'Follow-up date is required'),
  method: z.nativeEnum(FollowUpMethod).default('EMAIL'),
  customerResponse: z.string().max(500).optional(),
  remarks: z.string().max(1000).optional(),
  nextFollowUpDate: z.string().optional(),
});

export const createApprovalSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']),
  comments: z.string().max(1000).optional(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type CreateRevisionInput = z.infer<typeof createRevisionSchema>;
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
