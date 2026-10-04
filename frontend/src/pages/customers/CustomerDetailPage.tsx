import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit, Building2, Mail, Phone, MapPin, FileText, Plus } from 'lucide-react';
import { customersApi } from '../../api/customers.api';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../../utils/format';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getById(id!).then((r) => r.data.data!),
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;
  if (!customer) return <div className="card card-body text-center text-gray-500">Customer not found.</div>;

  const { stats } = customer;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="btn-ghost btn-sm p-1.5">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{customer.companyName}</h1>
            <span className="font-mono text-xs text-gray-500">{customer.customerCode}</span>
          </div>
        </div>
        <Link to={`/customers/${id}/edit`} className="btn-secondary btn-sm">
          <Edit className="h-4 w-4" /> Edit
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Offers', value: stats.totalOffers, color: 'bg-blue-50 text-blue-700' },
          { label: 'Open Offers', value: stats.openOffers, color: 'bg-amber-50 text-amber-700' },
          { label: 'Total Quoted', value: formatCurrency(stats.totalQuoted), color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Won Value', value: formatCurrency(stats.wonValue), color: 'bg-green-50 text-green-700' },
        ].map((s) => (
          <div key={s.label} className={`card p-4 ${s.color}`}>
            <p className="text-xs font-medium opacity-75">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <h3>Company Details</h3>
            </div>
            <div className="card-body space-y-3 text-sm">
              {customer.industry && <Row label="Industry" value={customer.industry} />}
              {customer.gstNumber && <Row label="GST Number" value={customer.gstNumber} />}
              {customer.notes && <Row label="Notes" value={customer.notes} />}
              {!customer.industry && !customer.gstNumber && !customer.notes && (
                <p className="text-gray-400">No additional details</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <h3>Contact</h3>
            </div>
            <div className="card-body space-y-3 text-sm">
              {customer.contactPerson && <Row label="Contact Person" value={customer.contactPerson} />}
              {customer.email && (
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <a href={`mailto:${customer.email}`} className="text-brand-600 hover:underline">{customer.email}</a>
                </div>
              )}
              {customer.phone && <Row label="Phone" value={customer.phone} />}
            </div>
          </div>

          {(customer.address || customer.city || customer.state) && (
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <h3>Address</h3>
              </div>
              <div className="card-body text-sm text-gray-700">
                {customer.address && <p>{customer.address}</p>}
                {(customer.city || customer.state) && (
                  <p>{[customer.city, customer.state, customer.country].filter(Boolean).join(', ')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Offers */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <h3>Offer History</h3>
              </div>
              <Link to={`/offers/new?customerId=${id}`} className="btn-primary btn-sm">
                <Plus className="h-4 w-4" /> New Offer
              </Link>
            </div>
            {customer.offers.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No offers yet"
                description="Create the first offer for this customer"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Offer #</th>
                      <th>Product</th>
                      <th>Value</th>
                      <th>Status</th>
                      <th>Salesperson</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.offers.map((offer) => (
                      <tr key={offer.id}>
                        <td>
                          <Link to={`/offers/${offer.id}`} className="text-brand-600 hover:underline font-mono text-xs">
                            {offer.offerNumber}
                          </Link>
                        </td>
                        <td className="text-sm max-w-[140px] truncate">{offer.product}</td>
                        <td className="text-sm font-medium">{formatCurrency(Number(offer.offerValue), offer.currency)}</td>
                        <td><StatusBadge status={offer.status} size="sm" /></td>
                        <td className="text-sm">{offer.salesperson?.name}</td>
                        <td className="text-xs text-gray-500">{formatDate(offer.offerDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  );
}
