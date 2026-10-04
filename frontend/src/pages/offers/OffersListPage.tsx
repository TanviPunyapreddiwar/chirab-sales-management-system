import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, X, Eye, Edit, GitBranch, PhoneCall, ChevronUp, ChevronDown } from 'lucide-react';
import { offersApi } from '../../api/offers.api';
import { usersApi } from '../../api/users.api';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { OfferFilters, OfferStatus } from '../../types';
import { formatCurrency, formatDate, formatRevision, isOverdue, ALL_STATUSES, STATUS_LABELS } from '../../utils/format';
import { useDebounce } from '../../hooks/useDebounce';
import clsx from 'clsx';

export function OffersListPage() {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OfferFilters>({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });

  const debouncedSearch = useDebounce(search, 400);

  const activeFilters = { ...filters, search: debouncedSearch };

  const { data, isLoading } = useQuery({
    queryKey: ['offers', activeFilters],
    queryFn: () => offersApi.getAll(activeFilters).then((r) => r.data),
  });

  const { data: salespeopleData } = useQuery({
    queryKey: ['salespeople'],
    queryFn: () => usersApi.getSalespeople().then((r) => r.data.data || []),
  });

  const offers = data?.data || [];
  const pagination = data?.pagination;

  const clearFilter = (key: keyof OfferFilters) => {
    setFilters((f) => { const n = { ...f }; delete n[key]; return { ...n, page: 1 }; });
  };

  const sortBy = (col: string) => {
    setFilters((f) => ({
      ...f,
      sortBy: col,
      sortOrder: f.sortBy === col && f.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (filters.sortBy !== col) return null;
    return filters.sortOrder === 'asc'
      ? <ChevronUp className="h-3 w-3 inline" />
      : <ChevronDown className="h-3 w-3 inline" />;
  };

  const activeFilterCount = [filters.status, filters.salespersonId, filters.dateFrom, filters.dateTo, filters.businessDivision]
    .filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setFilters((f) => ({ ...f, page: 1 })); }}
            placeholder="Search offer number, customer, product..."
            className="input pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx('btn-secondary shrink-0', showFilters && 'bg-brand-50 border-brand-300')}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-brand-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <Link to="/offers/new" className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> New Offer
        </Link>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as OfferStatus || undefined, page: 1 }))}
                className="input"
              >
                <option value="">All Statuses</option>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Salesperson</label>
              <select
                value={filters.salespersonId || ''}
                onChange={(e) => setFilters((f) => ({ ...f, salespersonId: e.target.value || undefined, page: 1 }))}
                className="input"
              >
                <option value="">All Salespeople</option>
                {salespeopleData?.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Division</label>
              <input
                value={filters.businessDivision || ''}
                onChange={(e) => setFilters((f) => ({ ...f, businessDivision: e.target.value || undefined, page: 1 }))}
                className="input"
                placeholder="e.g. Automation"
              />
            </div>
            <div>
              <label className="label">Date From</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 1 }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Date To</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined, page: 1 }))}
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
                  setSearch('');
                }}
                className="btn-ghost text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" /> Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : offers.length === 0 ? (
          <EmptyState
            title="No offers found"
            description={search ? 'Try adjusting your search or filters' : 'Create your first offer to get started'}
            action={<Link to="/offers/new" className="btn-primary btn-sm"><Plus className="h-4 w-4" /> New Offer</Link>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="cursor-pointer" onClick={() => sortBy('offerNumber')}>
                      Offer # <SortIcon col="offerNumber" />
                    </th>
                    <th className="cursor-pointer" onClick={() => sortBy('offerDate')}>
                      Date <SortIcon col="offerDate" />
                    </th>
                    <th>Customer</th>
                    <th>Salesperson</th>
                    <th>Product</th>
                    <th>Division</th>
                    <th className="cursor-pointer text-right" onClick={() => sortBy('offerValue')}>
                      Value <SortIcon col="offerValue" />
                    </th>
                    <th>Status</th>
                    <th>Rev</th>
                    <th>Next Follow-up</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr key={offer.id}>
                      <td>
                        <Link to={`/offers/${offer.id}`} className="font-mono text-xs text-brand-600 hover:underline font-semibold">
                          {offer.offerNumber}
                        </Link>
                      </td>
                      <td className="text-xs text-gray-500">{formatDate(offer.offerDate)}</td>
                      <td>
                        <div className="text-sm font-medium text-gray-900 max-w-[140px] truncate">
                          {offer.customer?.companyName}
                        </div>
                      </td>
                      <td className="text-sm text-gray-600">{offer.salesperson?.name}</td>
                      <td>
                        <div className="text-sm max-w-[140px] truncate" title={offer.product}>
                          {offer.product}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-gray-600">{offer.businessDivision || '—'}</span>
                      </td>
                      <td className="text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(offer.offerValue), offer.currency)}
                      </td>
                      <td><StatusBadge status={offer.status} size="sm" /></td>
                      <td>
                        <span className="font-mono text-xs text-gray-500">
                          {formatRevision(offer.revisionNumber)}
                        </span>
                      </td>
                      <td>
                        {offer.nextFollowUpDate ? (
                          <span className={clsx(
                            'text-xs',
                            isOverdue(offer.nextFollowUpDate) ? 'text-red-600 font-medium' : 'text-gray-600'
                          )}>
                            {formatDate(offer.nextFollowUpDate)}
                            {isOverdue(offer.nextFollowUpDate) && ' ⚠'}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/offers/${offer.id}`} className="btn-ghost btn-sm p-1.5" title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <Link to={`/offers/${offer.id}/edit`} className="btn-ghost btn-sm p-1.5" title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </Link>
                          <Link to={`/offers/${offer.id}?tab=revision`} className="btn-ghost btn-sm p-1.5" title="Revise">
                            <GitBranch className="h-3.5 w-3.5" />
                          </Link>
                          <Link to={`/offers/${offer.id}?tab=followup`} className="btn-ghost btn-sm p-1.5" title="Follow-up">
                            <PhoneCall className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
              />
            )}
          </>
        )}
      </div>

      {/* Summary Bar */}
      {pagination && (
        <div className="text-xs text-gray-500 text-right">
          {pagination.total} offer{pagination.total !== 1 ? 's' : ''} total
        </div>
      )}
    </div>
  );
}
