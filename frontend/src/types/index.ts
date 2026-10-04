export type Role = 'ADMIN' | 'MANAGEMENT' | 'SALES' | 'APPROVER';

export type OfferStatus =
  | 'DRAFT'
  | 'SUBMITTED_FOR_APPROVAL'
  | 'APPROVED'
  | 'SENT_TO_CUSTOMER'
  | 'FOLLOW_UP_DUE'
  | 'UNDER_NEGOTIATION'
  | 'REVISED_OFFER'
  | 'PO_EXPECTED'
  | 'WON'
  | 'LOST'
  | 'CANCELLED'
  | 'ON_HOLD'
  | 'NO_RESPONSE';

export type FollowUpMethod = 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'MEETING' | 'OTHER';
export type ApprovalAction = 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  employeeCode?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  industry?: string;
  gstNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { offers: number };
}

export interface CustomerWithStats extends Customer {
  offers: Offer[];
  stats: {
    totalQuoted: number;
    wonValue: number;
    openOffers: number;
    totalOffers: number;
  };
}

export interface Offer {
  id: string;
  offerNumber: string;
  customerId: string;
  salespersonId: string;
  contactPerson?: string;
  customerRfqNumber?: string;
  businessDivision?: string;
  product: string;
  applicationDescription?: string;
  currency: string;
  offerValue: number;
  status: OfferStatus;
  revisionNumber: number;
  offerDate: string;
  nextFollowUpDate?: string;
  validityDays: number;
  source?: string;
  commercialRemarks?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  salesperson?: { id: string; name: string; email: string; employeeCode?: string };
  createdBy?: { id: string; name: string };
  _count?: { revisions: number; followUps: number; documents: number };
  revisions?: OfferRevision[];
  followUps?: FollowUp[];
  approvals?: OfferApproval[];
  documents?: OfferDocument[];
  auditLogs?: AuditLog[];
}

export interface OfferRevision {
  id: string;
  offerId: string;
  revisionNumber: number;
  offerValue: number;
  currency: string;
  status: OfferStatus;
  description?: string;
  commercialRemarks?: string;
  changeReason?: string;
  createdById: string;
  createdAt: string;
  createdBy?: { id: string; name: string };
}

export interface FollowUp {
  id: string;
  offerId: string;
  followUpDate: string;
  method: FollowUpMethod;
  customerResponse?: string;
  remarks?: string;
  nextFollowUpDate?: string;
  createdById: string;
  createdAt: string;
  createdBy?: { id: string; name: string };
  offer?: {
    offerNumber: string;
    product: string;
    customer?: { companyName: string };
    salesperson?: { name: string };
  };
}

export interface OfferApproval {
  id: string;
  offerId: string;
  approverId: string;
  action: ApprovalAction;
  comments?: string;
  createdAt: string;
  approver?: { id: string; name: string };
}

export interface OfferDocument {
  id: string;
  offerId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: { id: string; name: string };
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  timestamp: string;
  user?: { id: string; name: string };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardSummary {
  kpis: {
    totalOffers: number;
    openOffers: number;
    wonOffers: number;
    lostOffers: number;
    followUpsDue: number;
    totalQuoted: number;
    wonValue: number;
    conversionRate: number;
  };
  offersByStatus: Array<{ status: OfferStatus; count: number; value: number }>;
  offersBySalesperson: Array<{ salesperson: string; count: number; value: number }>;
  monthlyTrend: Array<{ month: string; count: number; total: number }>;
  topCustomers: Array<{ customer: string; count: number; value: number }>;
}

export interface OfferFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: OfferStatus | '';
  salespersonId?: string;
  customerId?: string;
  businessDivision?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Flat document record returned by GET /api/documents (central register)
export interface DocumentRecord {
  id: string;
  offerId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: { id: string; name: string };
  offer: {
    id: string;
    offerNumber: string;
    customer: { id: string; companyName: string };
  };
}
