import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Edit, GitBranch, PhoneCall, FileUp, CheckCircle, XCircle,
  Clock, Download, File, RefreshCw, AlertTriangle, Loader2, User, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { offersApi } from '../../api/offers.api';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { handleApiError } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import {
  formatCurrency, formatDate, formatDateTime, formatRevision,
  formatFileSize, ALL_STATUSES, STATUS_LABELS, isOverdue,
} from '../../utils/format';
import { OfferStatus, FollowUpMethod } from '../../types';
import clsx from 'clsx';

// Sub-form schemas
const revisionSchema = z.object({
  offerValue: z.coerce.number().min(0),
  currency: z.string().default('INR'),
  description: z.string().optional(),
  commercialRemarks: z.string().optional(),
  changeReason: z.string().min(1, 'Reason is required'),
});

const followUpSchema = z.object({
  followUpDate: z.string().min(1, 'Date required'),
  method: z.enum(['PHONE', 'EMAIL', 'WHATSAPP', 'MEETING', 'OTHER']),
  customerResponse: z.string().optional(),
  remarks: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
});

const approvalSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']),
  comments: z.string().optional(),
});

const statusSchema = z.object({
  status: z.string(),
  remarks: z.string().optional(),
});

type Tab = 'details' | 'revisions' | 'followups' | 'approvals' | 'documents' | 'audit';

export function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();

  const defaultTab = (searchParams.get('tab') as Tab) || 'details';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [modal, setModal] = useState<'revision' | 'followup' | 'approval' | 'status' | 'document' | null>(null);

  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => offersApi.getById(id!).then((r) => r.data.data!),
    enabled: !!id,
  });

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: (data: { status: string; remarks?: string }) =>
      offersApi.changeStatus(id!, data.status, data.remarks),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['offer', id] }); setModal(null); },
    onError: handleApiError,
  });

  // Revision mutation
  const revisionMutation = useMutation({
    mutationFn: (data: z.infer<typeof revisionSchema>) => offersApi.createRevision(id!, data),
    onSuccess: () => { toast.success('Revision created'); queryClient.invalidateQueries({ queryKey: ['offer', id] }); setModal(null); },
    onError: handleApiError,
  });

  // Follow-up mutation
  const followUpMutation = useMutation({
    mutationFn: (data: z.infer<typeof followUpSchema>) => offersApi.createFollowUp(id!, data),
    onSuccess: () => { toast.success('Follow-up added'); queryClient.invalidateQueries({ queryKey: ['offer', id] }); setModal(null); },
    onError: handleApiError,
  });

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: (data: z.infer<typeof approvalSchema>) => offersApi.createApproval(id!, data),
    onSuccess: () => { toast.success('Approval recorded'); queryClient.invalidateQueries({ queryKey: ['offer', id] }); setModal(null); },
    onError: handleApiError,
  });

  // Document upload mutation
  const documentMutation = useMutation({
    mutationFn: (file: File) => offersApi.uploadDocument(id!, file),
    onSuccess: () => { toast.success('Document uploaded'); queryClient.invalidateQueries({ queryKey: ['offer', id] }); setModal(null); },
    onError: handleApiError,
  });

  // Forms
  const revisionForm = useForm<z.infer<typeof revisionSchema>>({ resolver: zodResolver(revisionSchema) });
  const followUpForm = useForm<z.infer<typeof followUpSchema>>({ resolver: zodResolver(followUpSchema), defaultValues: { method: 'EMAIL', followUpDate: new Date().toISOString().split('T')[0] } });
  const approvalForm = useForm<z.infer<typeof approvalSchema>>({ resolver: zodResolver(approvalSchema) });
  const statusForm = useForm<z.infer<typeof statusSchema>>({ resolver: zodResolver(statusSchema) });

  if (isLoading) return <PageLoader />;
  if (!offer) return <div className="card card-body text-center text-gray-500">Offer not found.</div>;

  const canEdit = hasRole('ADMIN', 'MANAGEMENT') || offer.salespersonId === user?.id;
  const canApprove = hasRole('ADMIN', 'MANAGEMENT', 'APPROVER');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'details', label: 'Details' },
    { key: 'revisions', label: 'Revisions', count: offer._count?.revisions },
    { key: 'followups', label: 'Follow-ups', count: offer._count?.followUps },
    { key: 'approvals', label: 'Approvals' },
    { key: 'documents', label: 'Documents', count: offer._count?.documents },
    { key: 'audit', label: 'Audit History' },
  ];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/offers" className="btn-ghost btn-sm p-1.5 mt-1">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-mono text-xl font-bold">{offer.offerNumber}</h1>
            <StatusBadge status={offer.status} />
            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {formatRevision(offer.revisionNumber)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {offer.customer?.companyName} · {offer.product}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <Link to={`/offers/${id}/edit`} className="btn-secondary btn-sm">
              <Edit className="h-4 w-4" /> Edit
            </Link>
          )}
          {canApprove && offer.status === 'SUBMITTED_FOR_APPROVAL' && (
            <button onClick={() => setModal('approval')} className="btn-primary btn-sm">
              <CheckCircle className="h-4 w-4" /> Approve
            </button>
          )}
          <button onClick={() => setModal('status')} className="btn-secondary btn-sm">
            <RefreshCw className="h-4 w-4" /> Status
          </button>
          <button onClick={() => setModal('revision')} className="btn-secondary btn-sm">
            <GitBranch className="h-4 w-4" /> Revise
          </button>
          <button onClick={() => setModal('followup')} className="btn-secondary btn-sm">
            <PhoneCall className="h-4 w-4" /> Follow-up
          </button>
          <button onClick={() => setModal('document')} className="btn-secondary btn-sm">
            <FileUp className="h-4 w-4" /> Upload
          </button>
        </div>
      </div>

      {/* Value Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Offer Value</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(Number(offer.offerValue), offer.currency)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Offer Date</p>
          <p className="text-base font-semibold text-gray-800">{formatDate(offer.offerDate)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Validity</p>
          <p className="text-base font-semibold text-gray-800">{offer.validityDays} days</p>
        </div>
        <div className={clsx('card p-4', offer.nextFollowUpDate && isOverdue(offer.nextFollowUpDate) && 'border-orange-300 bg-orange-50')}>
          <p className="text-xs text-gray-500">Next Follow-up</p>
          <p className={clsx('text-base font-semibold', offer.nextFollowUpDate && isOverdue(offer.nextFollowUpDate) ? 'text-orange-600' : 'text-gray-800')}>
            {offer.nextFollowUpDate ? formatDate(offer.nextFollowUpDate) : '—'}
            {offer.nextFollowUpDate && isOverdue(offer.nextFollowUpDate) && (
              <AlertTriangle className="h-4 w-4 inline ml-1 text-orange-500" />
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === t.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'details' && offer && <DetailsTab offer={offer} />}
        {activeTab === 'revisions' && <RevisionsTab revisions={offer.revisions || []} />}
        {activeTab === 'followups' && <FollowUpsTab followUps={offer.followUps || []} />}
        {activeTab === 'approvals' && <ApprovalsTab approvals={offer.approvals || []} />}
        {activeTab === 'documents' && (
          <DocumentsTab
            documents={offer.documents || []}
            offerId={id!}
            onUpload={() => setModal('document')}
          />
        )}
        {activeTab === 'audit' && <AuditTab logs={offer.auditLogs || []} />}
      </div>

      {/* === MODALS === */}

      {/* Status Change */}
      <Modal isOpen={modal === 'status'} onClose={() => setModal(null)} title="Change Status" size="sm">
        <form onSubmit={statusForm.handleSubmit((d) => statusMutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">New Status</label>
            <select {...statusForm.register('status')} className="input">
              <option value="">Select status...</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Remarks (optional)</label>
            <textarea {...statusForm.register('remarks')} rows={2} className="input" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={statusMutation.isPending} className="btn-primary">
              {statusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Status
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Revision */}
      <Modal isOpen={modal === 'revision'} onClose={() => setModal(null)} title="Create Revision" size="md">
        <form onSubmit={revisionForm.handleSubmit((d) => revisionMutation.mutate(d))} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Creating revision {formatRevision((offer.revisionNumber || 0) + 1)}.
            Current value: {formatCurrency(Number(offer.offerValue), offer.currency)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Revised Value *</label>
              <input {...revisionForm.register('offerValue')} type="number" step="0.01" defaultValue={Number(offer.offerValue)} className="input" />
            </div>
            <div>
              <label className="label">Currency</label>
              <input {...revisionForm.register('currency')} defaultValue={offer.currency} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Change Reason *</label>
            <input {...revisionForm.register('changeReason')} className={`input ${revisionForm.formState.errors.changeReason ? 'input-error' : ''}`} placeholder="e.g. Customer requested 10% discount" />
            {revisionForm.formState.errors.changeReason && <p className="error-text">{revisionForm.formState.errors.changeReason.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...revisionForm.register('description')} rows={2} className="input" />
          </div>
          <div>
            <label className="label">Commercial Remarks</label>
            <textarea {...revisionForm.register('commercialRemarks')} rows={2} className="input" defaultValue={offer.commercialRemarks || ''} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={revisionMutation.isPending} className="btn-primary">
              {revisionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Revision
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Follow-up */}
      <Modal isOpen={modal === 'followup'} onClose={() => setModal(null)} title="Add Follow-up" size="md">
        <form onSubmit={followUpForm.handleSubmit((d) => followUpMutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Follow-up Date *</label>
              <input type="date" {...followUpForm.register('followUpDate')} className="input" />
              {followUpForm.formState.errors.followUpDate && <p className="error-text">{followUpForm.formState.errors.followUpDate.message}</p>}
            </div>
            <div>
              <label className="label">Method</label>
              <select {...followUpForm.register('method')} className="input">
                {(['PHONE', 'EMAIL', 'WHATSAPP', 'MEETING', 'OTHER'] as FollowUpMethod[]).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Customer Response</label>
            <input {...followUpForm.register('customerResponse')} className="input" placeholder="What did the customer say?" />
          </div>
          <div>
            <label className="label">Remarks / Notes</label>
            <textarea {...followUpForm.register('remarks')} rows={2} className="input" />
          </div>
          <div>
            <label className="label">Next Follow-up Date</label>
            <input type="date" {...followUpForm.register('nextFollowUpDate')} className="input" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={followUpMutation.isPending} className="btn-primary">
              {followUpMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Follow-up
            </button>
          </div>
        </form>
      </Modal>

      {/* Approval */}
      <Modal isOpen={modal === 'approval'} onClose={() => setModal(null)} title="Record Approval Decision" size="sm">
        <form onSubmit={approvalForm.handleSubmit((d) => approvalMutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Decision *</label>
            <div className="space-y-2">
              {(['APPROVED', 'REJECTED', 'REVISION_REQUESTED'] as const).map((a) => (
                <label key={a} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={a} {...approvalForm.register('action')} className="text-brand-600" />
                  <span className={clsx('text-sm font-medium',
                    a === 'APPROVED' ? 'text-green-700' : a === 'REJECTED' ? 'text-red-700' : 'text-amber-700'
                  )}>
                    {a === 'APPROVED' ? '✓ Approve' : a === 'REJECTED' ? '✗ Reject' : '↩ Request Revision'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Comments</label>
            <textarea {...approvalForm.register('comments')} rows={3} className="input" placeholder="Add approval comments..." />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={approvalMutation.isPending} className="btn-primary">
              {approvalMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Decision
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Upload */}
      <Modal isOpen={modal === 'document'} onClose={() => setModal(null)} title="Upload Document" size="sm">
        <div className="p-6">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-brand-400 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) documentMutation.mutate(file);
            }}
          >
            <FileUp className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-1">Drag & drop a file or</p>
            <label className="btn-primary btn-sm cursor-pointer">
              Browse Files
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) documentMutation.mutate(file);
                }}
              />
            </label>
            <p className="text-xs text-gray-400 mt-2">PDF, Word, Excel, Images — Max 25MB</p>
          </div>
          {documentMutation.isPending && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// Tab sub-components
function DetailsTab({ offer }: { offer: import('../../types').Offer }) {
  const o = offer;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card">
        <div className="card-header flex items-center gap-2"><Building2 className="h-4 w-4 text-gray-400" /><h3>Customer</h3></div>
        <div className="card-body space-y-2 text-sm">
          <DetailRow label="Company" value={o.customer?.companyName} />
          <DetailRow label="Code" value={o.customer?.customerCode} mono />
          <DetailRow label="Contact Person" value={o.contactPerson || o.customer?.contactPerson} />
          <DetailRow label="City" value={o.customer?.city} />
          <DetailRow label="Industry" value={o.customer?.industry} />
        </div>
      </div>
      <div className="card">
        <div className="card-header flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><h3>Sales Information</h3></div>
        <div className="card-body space-y-2 text-sm">
          <DetailRow label="Salesperson" value={o.salesperson?.name} />
          <DetailRow label="Employee Code" value={o.salesperson?.employeeCode} mono />
          <DetailRow label="Created By" value={o.createdBy?.name} />
          <DetailRow label="Source" value={o.source} />
          <DetailRow label="Customer RFQ #" value={o.customerRfqNumber} mono />
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3>Offer Details</h3></div>
        <div className="card-body space-y-2 text-sm">
          <DetailRow label="Product" value={o.product} />
          <DetailRow label="Division" value={o.businessDivision} />
          <DetailRow label="Application" value={o.applicationDescription} />
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3>Commercial</h3></div>
        <div className="card-body space-y-2 text-sm">
          <DetailRow label="Value" value={formatCurrency(Number(o.offerValue), o.currency)} />
          <DetailRow label="Currency" value={o.currency} />
          <DetailRow label="Validity" value={`${o.validityDays} days`} />
          <DetailRow label="Remarks" value={o.commercialRemarks} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 min-w-[120px] shrink-0">{label}</span>
      <span className={clsx('text-gray-900', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

function RevisionsTab({ revisions }: { revisions: ReturnType<typeof useQuery<unknown>>['data'][] }) {
  const revs = revisions as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!revs.length) return <EmptyState title="No revisions" description="Create a revision to track offer changes" />;
  return (
    <div className="card overflow-hidden">
      <table className="table">
        <thead>
          <tr>
            <th>Revision</th>
            <th>Date</th>
            <th className="text-right">Value</th>
            <th>Status</th>
            <th>Changed By</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {revs.map((r) => (
            <tr key={r.id}>
              <td><span className="font-mono font-semibold text-sm">{formatRevision(r.revisionNumber)}</span></td>
              <td className="text-xs text-gray-500">{formatDate(r.createdAt)}</td>
              <td className="text-right font-medium">{formatCurrency(Number(r.offerValue), r.currency)}</td>
              <td><StatusBadge status={r.status} size="sm" /></td>
              <td className="text-sm">{r.createdBy?.name}</td>
              <td className="text-sm text-gray-600 max-w-[200px] truncate" title={r.changeReason}>{r.changeReason || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FollowUpsTab({ followUps }: { followUps: ReturnType<typeof useQuery<unknown>>['data'][] }) {
  const items = followUps as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!items.length) return <EmptyState title="No follow-ups recorded" description="Add a follow-up to track customer communication" />;
  const METHOD_COLORS: Record<string, string> = {
    PHONE: 'bg-green-100 text-green-700',
    EMAIL: 'bg-blue-100 text-blue-700',
    WHATSAPP: 'bg-emerald-100 text-emerald-700',
    MEETING: 'bg-purple-100 text-purple-700',
    OTHER: 'bg-gray-100 text-gray-700',
  };
  return (
    <div className="space-y-3">
      {items.map((f) => (
        <div key={f.id} className="card card-body">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${METHOD_COLORS[f.method]}`}>{f.method}</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(f.followUpDate)}</span>
                <span className="text-xs text-gray-400">by {f.createdBy?.name}</span>
              </div>
              {f.customerResponse && <p className="text-sm text-gray-700 mb-1"><strong>Response:</strong> {f.customerResponse}</p>}
              {f.remarks && <p className="text-sm text-gray-600">{f.remarks}</p>}
            </div>
            {f.nextFollowUpDate && (
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">Next follow-up</p>
                <p className={clsx('text-sm font-medium', isOverdue(f.nextFollowUpDate) ? 'text-orange-600' : 'text-gray-700')}>
                  {formatDate(f.nextFollowUpDate)}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ApprovalsTab({ approvals }: { approvals: any[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!approvals.length) return <EmptyState title="No approval history" description="Approval records will appear here" />;
  return (
    <div className="card overflow-hidden">
      <table className="table">
        <thead><tr><th>Approver</th><th>Decision</th><th>Comments</th><th>Date</th></tr></thead>
        <tbody>
          {approvals.map((a) => (
            <tr key={a.id}>
              <td className="font-medium text-sm">{a.approver?.name}</td>
              <td>
                <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                  a.action === 'APPROVED' ? 'bg-green-100 text-green-700' :
                  a.action === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {a.action}
                </span>
              </td>
              <td className="text-sm text-gray-600">{a.comments || '—'}</td>
              <td className="text-xs text-gray-500">{formatDateTime(a.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsTab({ documents, offerId, onUpload }: { documents: any[]; offerId: string; onUpload: () => void }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!documents.length) return (
    <EmptyState
      icon={File}
      title="No documents"
      description="Upload quotation documents and attachments"
      action={<button onClick={onUpload} className="btn-primary btn-sm"><FileUp className="h-4 w-4" /> Upload Document</button>}
    />
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {documents.map((doc) => (
        <div key={doc.id} className="card card-body flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50 shrink-0">
            <File className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</p>
            <p className="text-xs text-gray-400">{formatFileSize(doc.fileSize)} · {formatDate(doc.createdAt)} · {doc.uploadedBy?.name}</p>
          </div>
          <a
            href={offersApi.getDocumentDownloadUrl(offerId, doc.id)}
            className="btn-ghost btn-sm p-1.5 shrink-0"
            title="Download"
            target="_blank"
            rel="noreferrer"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      ))}
    </div>
  );
}

function AuditTab({ logs }: { logs: any[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!logs.length) return <EmptyState title="No audit records" description="Actions taken on this offer will be recorded here" />;
  return (
    <div className="card overflow-hidden">
      <table className="table">
        <thead><tr><th>Action</th><th>User</th><th>Timestamp</th><th>Details</th></tr></thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>
                <span className="text-xs font-mono font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                  {log.action}
                </span>
              </td>
              <td className="text-sm">{log.user?.name || 'System'}</td>
              <td className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</td>
              <td className="text-xs text-gray-500 max-w-[200px] truncate">
                {log.newValue ? JSON.stringify(log.newValue).slice(0, 80) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
