import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PhoneCall, Clock, AlertTriangle } from 'lucide-react';
import { offersApi } from '../../api/offers.api';
import { dashboardApi } from '../../api/dashboard.api';
import { usersApi } from '../../api/users.api';
import { reportsApi } from '../../api/reports.api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatDateTime, isOverdue } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { FollowUp } from '../../types';
import clsx from 'clsx';

const METHOD_COLORS: Record<string, string> = {
  PHONE: 'bg-green-100 text-green-700',
  EMAIL: 'bg-blue-100 text-blue-700',
  WHATSAPP: 'bg-emerald-100 text-emerald-700',
  MEETING: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

type ViewMode = 'due' | 'all';

export function FollowUpsPage() {
  const { hasRole } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('due');
  const [salespersonId, setSalespersonId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: dueOffers, isLoading: dueLoading } = useQuery({
    queryKey: ['followups-due'],
    queryFn: () => dashboardApi.getFollowUpsDue().then((r) => r.data.data || []),
    enabled: viewMode === 'due',
  });

  const { data: allFollowUps, isLoading: allLoading } = useQuery({
    queryKey: ['all-followups', { salespersonId, dateFrom, dateTo }],
    queryFn: () => reportsApi.getFollowUpReport({
      ...(salespersonId && { salespersonId }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    }).then((r) => (r.data.data as FollowUp[]) || []),
    enabled: viewMode === 'all',
  });

  const { data: salespeopleData } = useQuery({
    queryKey: ['salespeople'],
    queryFn: () => usersApi.getSalespeople().then((r) => r.data.data || []),
    enabled: hasRole('ADMIN', 'MANAGEMENT'),
  });

  const isLoading = viewMode === 'due' ? dueLoading : allLoading;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('due')}
            className={clsx('px-4 py-2 text-sm font-medium transition-colors', viewMode === 'due' ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}
          >
            <Clock className="h-4 w-4 inline mr-1.5" /> Due / Upcoming
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={clsx('px-4 py-2 text-sm font-medium transition-colors', viewMode === 'all' ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}
          >
            <PhoneCall className="h-4 w-4 inline mr-1.5" /> All History
          </button>
        </div>

        {viewMode === 'all' && (
          <div className="flex gap-2 flex-wrap items-end">
            {hasRole('ADMIN', 'MANAGEMENT') && (
              <div>
                <label className="label">Salesperson</label>
                <select value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)} className="input text-sm py-1.5">
                  <option value="">All</option>
                  {salespeopleData?.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input text-sm py-1.5" />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input text-sm py-1.5" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <PageLoader />
      ) : viewMode === 'due' ? (
        <DueFollowUpsView offers={dueOffers || []} />
      ) : (
        <AllFollowUpsView followUps={allFollowUps || []} />
      )}
    </div>
  );
}

function DueFollowUpsView({ offers }: { offers: ReturnType<typeof useQuery<unknown>>['data'][] }) {
  const items = offers as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!items.length) return (
    <EmptyState
      icon={Clock}
      title="No follow-ups due"
      description="No follow-ups are scheduled for the next 7 days"
    />
  );

  const overdue = items.filter((o) => isOverdue(o.nextFollowUpDate));
  const upcoming = items.filter((o) => !isOverdue(o.nextFollowUpDate));

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-red-700">Overdue ({overdue.length})</h3>
          </div>
          <div className="space-y-2">
            {overdue.map((offer) => <OfferFollowUpCard key={offer.id} offer={offer} overdue />)}
          </div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-gray-700">Upcoming ({upcoming.length})</h3>
          </div>
          <div className="space-y-2">
            {upcoming.map((offer) => <OfferFollowUpCard key={offer.id} offer={offer} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function OfferFollowUpCard({ offer, overdue }: { offer: any; overdue?: boolean }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (
    <div className={clsx('card card-body flex items-center justify-between gap-3', overdue && 'border-red-200 bg-red-50')}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/offers/${offer.id}`} className="font-mono text-sm font-semibold text-brand-600 hover:underline">
            {offer.offerNumber}
          </Link>
          <StatusBadge status={offer.status} size="sm" />
        </div>
        <p className="text-sm text-gray-700 mt-0.5 truncate">{offer.customer?.companyName} — {offer.product}</p>
        <p className="text-xs text-gray-500">Salesperson: {offer.salesperson?.name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-gray-400">Follow-up</p>
        <p className={clsx('text-sm font-semibold', overdue ? 'text-red-600' : 'text-gray-800')}>
          {formatDate(offer.nextFollowUpDate)}
          {overdue && ' ⚠'}
        </p>
      </div>
    </div>
  );
}

function AllFollowUpsView({ followUps }: { followUps: FollowUp[] }) {
  if (!followUps.length) return (
    <EmptyState icon={PhoneCall} title="No follow-ups found" description="No follow-up records match your filters" />
  );

  return (
    <div className="card overflow-hidden">
      <table className="table">
        <thead>
          <tr>
            <th>Offer</th>
            <th>Customer</th>
            <th>Method</th>
            <th>Date</th>
            <th>Response</th>
            <th>Next Follow-up</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {followUps.map((f) => (
            <tr key={f.id}>
              <td>
                <Link to={`/offers/${f.offerId}`} className="font-mono text-xs text-brand-600 hover:underline font-semibold">
                  {f.offer?.offerNumber}
                </Link>
              </td>
              <td className="text-sm">{f.offer?.customer?.companyName}</td>
              <td>
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', METHOD_COLORS[f.method])}>
                  {f.method}
                </span>
              </td>
              <td className="text-xs text-gray-500">{formatDate(f.followUpDate)}</td>
              <td className="text-sm max-w-[180px] truncate text-gray-600" title={f.customerResponse || ''}>
                {f.customerResponse || '—'}
              </td>
              <td>
                {f.nextFollowUpDate ? (
                  <span className={clsx('text-xs', isOverdue(f.nextFollowUpDate) ? 'text-orange-600 font-medium' : 'text-gray-600')}>
                    {formatDate(f.nextFollowUpDate)}
                  </span>
                ) : '—'}
              </td>
              <td className="text-xs text-gray-500">{f.createdBy?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
