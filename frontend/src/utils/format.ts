import { OfferStatus } from '../types';

export function formatCurrency(value: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRevision(n: number): string {
  return `Rev-${String(n).padStart(2, '0')}`;
}

export function isOverdue(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export const STATUS_LABELS: Record<OfferStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED_FOR_APPROVAL: 'Submitted for Approval',
  APPROVED: 'Approved',
  SENT_TO_CUSTOMER: 'Sent to Customer',
  FOLLOW_UP_DUE: 'Follow-up Due',
  UNDER_NEGOTIATION: 'Under Negotiation',
  REVISED_OFFER: 'Revised Offer',
  PO_EXPECTED: 'PO Expected',
  WON: 'Won',
  LOST: 'Lost',
  CANCELLED: 'Cancelled',
  ON_HOLD: 'On Hold',
  NO_RESPONSE: 'No Response',
};

export const STATUS_COLORS: Record<OfferStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED_FOR_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  SENT_TO_CUSTOMER: 'bg-indigo-100 text-indigo-800',
  FOLLOW_UP_DUE: 'bg-orange-100 text-orange-800',
  UNDER_NEGOTIATION: 'bg-purple-100 text-purple-800',
  REVISED_OFFER: 'bg-cyan-100 text-cyan-800',
  PO_EXPECTED: 'bg-teal-100 text-teal-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
  ON_HOLD: 'bg-amber-100 text-amber-800',
  NO_RESPONSE: 'bg-slate-100 text-slate-600',
};

export const ALL_STATUSES: OfferStatus[] = [
  'DRAFT', 'SUBMITTED_FOR_APPROVAL', 'APPROVED', 'SENT_TO_CUSTOMER',
  'FOLLOW_UP_DUE', 'UNDER_NEGOTIATION', 'REVISED_OFFER', 'PO_EXPECTED',
  'WON', 'LOST', 'CANCELLED', 'ON_HOLD', 'NO_RESPONSE',
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
