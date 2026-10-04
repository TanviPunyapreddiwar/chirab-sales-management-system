import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, Phone, Mail, MapPin, Trash2, Eye, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { customersApi } from '../../api/customers.api';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { handleApiError } from '../../api/client';
import { Customer } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';

export function CustomersListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search: debouncedSearch, page }],
    queryFn: () => customersApi.getAll({ search: debouncedSearch, page, limit: 20 }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      toast.success('Customer deactivated');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: handleApiError,
  });

  const customers = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customers..."
            className="input pl-9"
          />
        </div>
        <Link to="/customers/new" className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> New Customer
        </Link>
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No customers found"
            description={search ? 'Try a different search term' : 'Add your first customer to get started'}
            action={
              <Link to="/customers/new" className="btn-primary btn-sm">
                <Plus className="h-4 w-4" /> Add Customer
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Industry</th>
                    <th>Offers</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <span className="font-mono text-xs text-gray-500">{customer.customerCode}</span>
                      </td>
                      <td>
                        <div className="font-medium text-gray-900">{customer.companyName}</div>
                        {customer.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="text-sm text-gray-700">{customer.contactPerson || '—'}</div>
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        )}
                      </td>
                      <td>
                        {(customer.city || customer.state) ? (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            {[customer.city, customer.state].filter(Boolean).join(', ')}
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <span className="text-sm text-gray-600">{customer.industry || '—'}</span>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                          {customer._count?.offers ?? 0}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/customers/${customer.id}`}
                            className="btn-ghost btn-sm p-1.5"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/customers/${customer.id}/edit`}
                            className="btn-ghost btn-sm p-1.5"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          {hasRole('ADMIN', 'MANAGEMENT') && (
                            <button
                              onClick={() => setDeleteTarget(customer)}
                              className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate Customer"
        message={`Are you sure you want to deactivate "${deleteTarget?.companyName}"? This will hide the customer from the list but preserve all offer history.`}
        confirmLabel="Deactivate"
        isDestructive
      />
    </div>
  );
}
