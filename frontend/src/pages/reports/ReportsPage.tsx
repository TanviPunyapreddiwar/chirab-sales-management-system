import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Download, BarChart3, Users, TrendingUp, PhoneCall, Loader2 } from 'lucide-react';
import { reportsApi } from '../../api/reports.api';
import { usersApi } from '../../api/users.api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/format';
import { exportToCSV } from '../../utils/csv';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

type ReportTab = 'summary' | 'salesperson' | 'wonlost' | 'followups';

const PIE_COLORS = ['#16a34a', '#dc2626', '#f59e0b', '#3b82f6'];

export function ReportsPage() {
  const { hasRole } = useAuth();
  const [tab, setTab] = useState<ReportTab>('summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [salespersonId, setSalespersonId] = useState('');

  const dateParams = {
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
    ...(salespersonId && { salespersonId }),
  };

  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['report-summary', dateParams],
    queryFn: () => reportsApi.getOfferSummary(dateParams).then((r) => r.data.data as any), // eslint-disable-line @typescript-eslint/no-explicit-any
    enabled: tab === 'summary',
  });

  const { data: spData, isLoading: spLoading } = useQuery({
    queryKey: ['report-salesperson', dateParams],
    queryFn: () => reportsApi.getSalespersonPerformance(dateParams).then((r) => (r.data.data || []) as any[]), // eslint-disable-line @typescript-eslint/no-explicit-any
    enabled: tab === 'salesperson' && hasRole('ADMIN', 'MANAGEMENT'),
  });

  const { data: wonLostData, isLoading: wonLostLoading } = useQuery({
    queryKey: ['report-wonlost', dateParams],
    queryFn: () => reportsApi.getWonLost(dateParams).then((r) => r.data.data as any), // eslint-disable-line @typescript-eslint/no-explicit-any
    enabled: tab === 'wonlost',
  });

  const { data: followUpData, isLoading: fuLoading } = useQuery({
    queryKey: ['report-followups', dateParams],
    queryFn: () => reportsApi.getFollowUpReport(dateParams).then((r) => (r.data.data || []) as any[]), // eslint-disable-line @typescript-eslint/no-explicit-any
    enabled: tab === 'followups',
  });

  const { data: salespeopleData } = useQuery({
    queryKey: ['salespeople'],
    queryFn: () => usersApi.getSalespeople().then((r) => r.data.data || []),
  });

  const tabs = [
    { key: 'summary' as ReportTab, label: 'Offer Summary', icon: BarChart3 },
    { key: 'salesperson' as ReportTab, label: 'Salesperson Performance', icon: Users, adminOnly: true },
    { key: 'wonlost' as ReportTab, label: 'Won / Lost Analysis', icon: TrendingUp },
    { key: 'followups' as ReportTab, label: 'Follow-up Report', icon: PhoneCall },
  ].filter((t) => !t.adminOnly || hasRole('ADMIN', 'MANAGEMENT'));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card card-body">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input text-sm py-1.5" />
          </div>
          <div>
            <label className="label">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input text-sm py-1.5" />
          </div>
          {tab === 'summary' && (
            <div>
              <label className="label">Salesperson</label>
              <select value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)} className="input text-sm py-1.5">
                <option value="">All Salespeople</option>
                {salespeopleData?.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
              </select>
            </div>
          )}
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setSalespersonId(''); }}
            className="btn-ghost text-sm text-gray-500"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Report Content */}
      {tab === 'summary' && (
        summaryLoading ? <PageLoader /> :
        summaryData ? <OfferSummaryReport data={summaryData} /> : null
      )}
      {tab === 'salesperson' && (
        spLoading ? <PageLoader /> :
        spData ? <SalespersonReport data={spData} /> : null
      )}
      {tab === 'wonlost' && (
        wonLostLoading ? <PageLoader /> :
        wonLostData ? <WonLostReport data={wonLostData} /> : null
      )}
      {tab === 'followups' && (
        fuLoading ? <PageLoader /> :
        followUpData ? <FollowUpReport data={followUpData} /> : null
      )}
    </div>
  );
}

function OfferSummaryReport({ data }: { data: any }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { summary, offers } = data;

  const handleExport = () => {
    exportToCSV(offers.map((o: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      'Offer Number': o.offerNumber,
      'Date': formatDate(o.offerDate),
      'Customer': o.customer?.companyName,
      'Salesperson': o.salesperson?.name,
      'Product': o.product,
      'Division': o.businessDivision || '',
      'Currency': o.currency,
      'Value': Number(o.offerValue),
      'Status': o.status,
      'Revision': o.revisionNumber,
    })), 'offer-summary');
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Offers', value: summary.total },
          { label: 'Total Value', value: formatCurrency(summary.totalValue) },
          { label: 'Won', value: `${summary.won} (${formatCurrency(summary.wonValue)})` },
          { label: 'Open', value: summary.open },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3>Offer Details</h3>
          <button onClick={handleExport} className="btn-secondary btn-sm">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Offer #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Salesperson</th>
                <th>Product</th>
                <th className="text-right">Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <tr key={o.id}>
                  <td><span className="font-mono text-xs text-brand-600">{o.offerNumber}</span></td>
                  <td className="text-xs text-gray-500">{formatDate(o.offerDate)}</td>
                  <td className="text-sm">{o.customer?.companyName}</td>
                  <td className="text-sm">{o.salesperson?.name}</td>
                  <td className="text-sm max-w-[140px] truncate">{o.product}</td>
                  <td className="text-right text-sm font-medium">{formatCurrency(Number(o.offerValue), o.currency)}</td>
                  <td><StatusBadge status={o.status} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SalespersonReport({ data }: { data: any[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const handleExport = () => {
    exportToCSV(data.map((d) => ({
      'Name': d.name,
      'Employee Code': d.employeeCode || '',
      'Total Offers': d.totalOffers,
      'Total Value': d.totalValue,
      'Won Offers': d.wonOffers,
      'Won Value': d.wonValue,
      'Lost Offers': d.lostOffers,
      'Open Offers': d.openOffers,
      'Conversion Rate %': d.conversionRate,
    })), 'salesperson-performance');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3>Offers by Salesperson</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="wonOffers" fill="#16a34a" name="Won" />
                <Bar dataKey="lostOffers" fill="#dc2626" name="Lost" />
                <Bar dataKey="openOffers" fill="#3b82f6" name="Open" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Conversion Rate</h3></div>
          <div className="card-body">
            <div className="space-y-3">
              {data.map((d) => (
                <div key={d.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-gray-500">{d.conversionRate}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-2 bg-brand-600 rounded-full transition-all"
                      style={{ width: `${d.conversionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3>Performance Details</h3>
          <button onClick={handleExport} className="btn-secondary btn-sm">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Salesperson</th>
                <th className="text-right">Total</th>
                <th className="text-right">Total Value</th>
                <th className="text-right">Won</th>
                <th className="text-right">Won Value</th>
                <th className="text-right">Lost</th>
                <th className="text-right">Open</th>
                <th className="text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.name}</td>
                  <td className="text-right">{d.totalOffers}</td>
                  <td className="text-right text-sm">{formatCurrency(d.totalValue)}</td>
                  <td className="text-right text-green-700 font-medium">{d.wonOffers}</td>
                  <td className="text-right text-sm text-green-700">{formatCurrency(d.wonValue)}</td>
                  <td className="text-right text-red-600">{d.lostOffers}</td>
                  <td className="text-right text-blue-600">{d.openOffers}</td>
                  <td className="text-right font-semibold">{d.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WonLostReport({ data }: { data: any }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const pieData = [
    { name: 'Won', value: data.won.count },
    { name: 'Lost', value: data.lost.count },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6 bg-green-50 border-green-200">
          <p className="text-sm text-green-700 font-medium">Won Offers</p>
          <p className="text-3xl font-bold text-green-800 mt-1">{data.won.count}</p>
          <p className="text-sm text-green-600 mt-0.5">{formatCurrency(data.won.value)}</p>
        </div>
        <div className="card p-6 bg-red-50 border-red-200">
          <p className="text-sm text-red-700 font-medium">Lost Offers</p>
          <p className="text-3xl font-bold text-red-800 mt-1">{data.lost.count}</p>
          <p className="text-sm text-red-600 mt-0.5">{formatCurrency(data.lost.value)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3>Won vs Lost</h3></div>
          <div className="card-body flex justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="#16a34a" />
                  <Cell fill="#dc2626" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {data.byDivision?.length > 0 && (
          <div className="card">
            <div className="card-header"><h3>By Division</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byDivision}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="division" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUpReport({ data }: { data: any[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const handleExport = () => {
    exportToCSV(data.map((f) => ({
      'Offer Number': f.offer?.offerNumber || '',
      'Customer': f.offer?.customer?.companyName || '',
      'Salesperson': f.offer?.salesperson?.name || '',
      'Method': f.method,
      'Date': formatDate(f.followUpDate),
      'Response': f.customerResponse || '',
      'Remarks': f.remarks || '',
      'Next Follow-up': formatDate(f.nextFollowUpDate),
    })), 'followup-report');
  };

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3>Follow-up History ({data.length} records)</h3>
        <button onClick={handleExport} className="btn-secondary btn-sm">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Offer</th>
              <th>Customer</th>
              <th>Salesperson</th>
              <th>Method</th>
              <th>Date</th>
              <th>Response</th>
              <th>Next Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">No follow-ups found for selected period</td></tr>
            )}
            {data.map((f) => (
              <tr key={f.id}>
                <td><span className="font-mono text-xs text-brand-600">{f.offer?.offerNumber}</span></td>
                <td className="text-sm">{f.offer?.customer?.companyName}</td>
                <td className="text-sm">{f.offer?.salesperson?.name || f.createdBy?.name}</td>
                <td>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                    f.method === 'EMAIL' ? 'bg-blue-100 text-blue-700' :
                    f.method === 'PHONE' ? 'bg-green-100 text-green-700' :
                    f.method === 'MEETING' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {f.method}
                  </span>
                </td>
                <td className="text-xs text-gray-500">{formatDate(f.followUpDate)}</td>
                <td className="text-sm max-w-[160px] truncate text-gray-600">{f.customerResponse || '—'}</td>
                <td className="text-xs text-gray-500">{formatDate(f.nextFollowUpDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
