import { Role, OfferStatus } from '@prisma/client';
import { Request } from 'express';

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OfferFilters extends PaginationQuery {
  status?: OfferStatus;
  salespersonId?: string;
  customerId?: string;
  businessDivision?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Status transition rules
export const STATUS_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  DRAFT: ['SUBMITTED_FOR_APPROVAL', 'CANCELLED'],
  SUBMITTED_FOR_APPROVAL: ['APPROVED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['SENT_TO_CUSTOMER', 'DRAFT', 'CANCELLED'],
  SENT_TO_CUSTOMER: ['FOLLOW_UP_DUE', 'UNDER_NEGOTIATION', 'WON', 'LOST', 'NO_RESPONSE'],
  FOLLOW_UP_DUE: ['UNDER_NEGOTIATION', 'SENT_TO_CUSTOMER', 'WON', 'LOST', 'NO_RESPONSE', 'ON_HOLD'],
  UNDER_NEGOTIATION: ['REVISED_OFFER', 'WON', 'LOST', 'PO_EXPECTED', 'ON_HOLD'],
  REVISED_OFFER: ['SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION', 'CANCELLED'],
  PO_EXPECTED: ['WON', 'LOST', 'ON_HOLD'],
  WON: [],
  LOST: [],
  CANCELLED: [],
  ON_HOLD: ['DRAFT', 'SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION', 'CANCELLED'],
  NO_RESPONSE: ['FOLLOW_UP_DUE', 'LOST', 'CANCELLED'],
};

// Management/Admin can bypass standard transitions
export const MANAGEMENT_ROLES: Role[] = ['ADMIN', 'MANAGEMENT'];
export const APPROVER_ROLES: Role[] = ['ADMIN', 'MANAGEMENT', 'APPROVER'];
