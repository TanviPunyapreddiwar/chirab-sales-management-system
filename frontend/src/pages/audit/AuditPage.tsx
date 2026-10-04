import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Shield } from 'lucide-react';
import { apiClient } from '../../api/client';
import { ApiResponse, AuditLog } from '../../types';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDateTime } from '../../utils/format';
import { Pagination } from '../../components/ui/Pagination';

export function AuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () =>
      apiClient
        .get<ApiResponse<AuditLog[]>>('/audit', { params: { page, limit: 50 } })
        .then((r) => r.data)
        .catch(() => ({ success: true, data: [], pagination: undefined })),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-400" /> Audit Log
          </h3>
        </div>
        {isLoading ? (
          <PageLoader />
        ) : logs.length === 0 ? (
          <EmptyState icon={Shield} title="No audit records" description="System activity will be recorded here" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>User</th>
                    <th>Timestamp</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-gray-500">{log.entityType}</span>
                        <span className="text-xs text-gray-400 ml-1 font-mono">{log.entityId?.slice(0, 8)}…</span>
                      </td>
                      <td className="text-sm">{log.user?.name || 'System'}</td>
                      <td className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</td>
                      <td className="text-xs text-gray-500 max-w-[220px] truncate">
                        {log.newValue ? JSON.stringify(log.newValue).slice(0, 100) : '—'}
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
    </div>
  );
}
