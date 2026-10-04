import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, FileText, CheckCircle, XCircle, Clock, DollarSign, Target } from 'lucide-react';
import { dashboardApi } from '../../api/dashboard.api';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatCurrency, formatDate, isOverdue, STATUS_COLORS } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { OfferStatus } from '../../types';

const PIE_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#7c3aed', '#0891b2', '#be185d', '#059669'];

function KpiCard({
  title, value, sub, icon: Icon, color, trend,
}: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; trend?: 'up' | 'down';
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {trend && (
        trend === 'up'
          ? <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
          : <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
      )}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary().then((r) => r.data.data!),
    refetchInterval: 60000,
  });

  const { data: followUpsData } = useQuery({
    queryKey: ['dashboard-followups-due'],
    queryFn: () => dashboardApi.getFollowUpsDue().then((r) => r.data.data || []),
  });

  if (summaryLoading) return <PageLoader />;
  if (!summaryData) return null;

  const { kpis, offersByStatus, offersBySalesperson, monthlyTrend, topCustomers } = summaryData;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's your sales pipeline overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Offers" value={kpis.totalOffers} icon={FileText} color="bg-blue-50 text-blue-600" />
        <KpiCard title="Open Offers" value={kpis.openOffers} icon={Clock} color="bg-amber-50 text-amber-600" />
        <KpiCard title="Won" value={kpis.wonOffers} icon={CheckCircle} color="bg-green-50 text-green-600" trend="up" />
        <KpiCard title="Lost" value={kpis.lostOffers} icon={XCircle} color="bg-red-50 text-red-600" />
        <KpiCard
          title="Total Quoted"
          value={formatCurrency(kpis.totalQuoted)}
          icon={DollarSign}
          color="bg-indigo-50 text-indigo-600"
        />
        <KpiCard
          title="Won Value"
          value={formatCurrency(kpis.wonValue)}
          icon={TrendingUp}
          color="bg-emerald-50 text-emerald-600"
          trend="up"
        />
        <KpiCard
          title="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          icon={Target}
          color="bg-purple-50 text-purple-600"
        />
        <KpiCard
          title="Follow-ups Due"
          value={kpis.followUpsDue}
          icon={Clock}
          color="bg-orange-50 text-orange-600"
          sub="Next 7 days"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="card col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Monthly Offer Trend</h3>
          </div>
          <div className="card-body">
            {monthlyTrend.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No monthly data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v, name) => [
                      name === 'total' ? formatCurrency(Number(v)) : v,
                      name === 'total' ? 'Value' : 'Count',
                    ]}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Offers by Status (Pie) */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">By Status</h3>
          </div>
          <div className="card-body">
            {offersByStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No data</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={offersByStatus} dataKey="count" nameKey="status" innerRadius={35} outerRadius={60}>
                      {offersByStatus.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {offersByStatus.slice(0, 5).map((s, i) => (
                    <div key={s.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <StatusBadge status={s.status as OfferStatus} size="sm" />
                      </div>
                      <span className="font-medium text-gray-700">{s.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salesperson Performance */}
        {offersBySalesperson.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Offers by Salesperson</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={offersBySalesperson} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="salesperson" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top Customers */}
        {topCustomers.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Top Customers by Value</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.customer}</p>
                      <p className="text-xs text-gray-500">{c.count} offers</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {formatCurrency(c.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Follow-ups Due */}
      {followUpsData && followUpsData.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Follow-ups Due (Next 7 Days)</h3>
            <Link to="/followups" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Offer</th>
                  <th>Customer</th>
                  <th>Salesperson</th>
                  <th>Status</th>
                  <th>Follow-up Date</th>
                </tr>
              </thead>
              <tbody>
                {followUpsData.slice(0, 5).map((offer) => (
                  <tr key={offer.id}>
                    <td>
                      <Link to={`/offers/${offer.id}`} className="text-brand-600 hover:underline font-mono text-xs">
                        {offer.offerNumber}
                      </Link>
                    </td>
                    <td className="text-sm">{offer.customer?.companyName}</td>
                    <td className="text-sm">{offer.salesperson?.name}</td>
                    <td><StatusBadge status={offer.status} size="sm" /></td>
                    <td>
                      <span className={`text-xs ${isOverdue(offer.nextFollowUpDate) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {formatDate(offer.nextFollowUpDate)}
                        {isOverdue(offer.nextFollowUpDate) && ' ⚠'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
