import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, FolderOpen, X, File, FileText, FileSpreadsheet, Image } from 'lucide-react';
import { documentsApi } from '../../api/documents.api';
import { offersApi } from '../../api/offers.api';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { formatDate, formatFileSize } from '../../utils/format';
import { useDebounce } from '../../hooks/useDebounce';
import { DocumentRecord } from '../../types';
import clsx from 'clsx';

// ── helpers ──────────────────────────────────────────────────────────────────

function mimeLabel(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
  };
  return map[mime] ?? mime.split('/').pop()?.toUpperCase() ?? '—';
}

const MIME_STYLES: Record<string, string> = {
  'application/pdf': 'bg-red-50 text-red-700',
  'application/msword': 'bg-blue-50 text-blue-700',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'bg-blue-50 text-blue-700',
  'application/vnd.ms-excel': 'bg-green-50 text-green-700',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'bg-green-50 text-green-700',
  'image/jpeg': 'bg-purple-50 text-purple-700',
  'image/png': 'bg-purple-50 text-purple-700',
};

function FileIcon({ mime }: { mime: string }) {
  const cls = 'h-4 w-4';
  if (mime === 'application/pdf') return <File className={cls} />;
  if (mime.includes('sheet') || mime.includes('excel')) return <FileSpreadsheet className={cls} />;
  if (mime.startsWith('image/')) return <Image className={cls} />;
  return <FileText className={cls} />;
}

function MimeBadge({ mime }: { mime: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold',
      MIME_STYLES[mime] ?? 'bg-gray-100 text-gray-600'
    )}>
      <FileIcon mime={mime} />
      {mimeLabel(mime)}
    </span>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documents', { search: debouncedSearch, page }],
    queryFn: () =>
      documentsApi
        .getAll({ search: debouncedSearch, page, limit: 25 })
        .then((r) => r.data),
  });

  const documents: DocumentRecord[] = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Document Register</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            All documents uploaded to offers — centralised view.
          </p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search file name, offer, customer…"
            className="input pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-600">
            Failed to load documents. Please try again.
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={search ? 'No documents match your search' : 'No documents yet'}
            description={
              search
                ? 'Try a different search term.'
                : 'Upload documents from any Offer Detail page — they will appear here.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Offer No.</th>
                    <th>Customer</th>
                    <th>File Type</th>
                    <th>Size</th>
                    <th>Uploaded By</th>
                    <th>Uploaded Date</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
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

      {pagination && !isLoading && documents.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {pagination.total} document{pagination.total !== 1 ? 's' : ''} total
        </p>
      )}
    </div>
  );
}

// ── row ───────────────────────────────────────────────────────────────────────

function DocumentRow({ doc }: { doc: DocumentRecord }) {
  const downloadUrl = offersApi.getDocumentDownloadUrl(doc.offerId, doc.id);

  return (
    <tr>
      {/* Document name — clicking it downloads the file */}
      <td>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 group max-w-[220px]"
          title={doc.originalName}
        >
          <span className={clsx(
            'p-1 rounded shrink-0',
            MIME_STYLES[doc.fileType] ?? 'bg-gray-100 text-gray-500'
          )}>
            <FileIcon mime={doc.fileType} />
          </span>
          <span className="text-sm font-medium text-brand-600 group-hover:underline truncate">
            {doc.originalName}
          </span>
        </a>
      </td>

      {/* Offer number — links to the offer detail page */}
      <td>
        <Link
          to={`/offers/${doc.offer.id}?tab=documents`}
          className="font-mono text-xs text-brand-600 hover:underline font-semibold"
        >
          {doc.offer.offerNumber}
        </Link>
      </td>

      <td className="text-sm text-gray-700">
        {doc.offer.customer.companyName}
      </td>

      <td>
        <MimeBadge mime={doc.fileType} />
      </td>

      <td className="text-sm text-gray-600">
        {formatFileSize(doc.fileSize)}
      </td>

      <td className="text-sm text-gray-600">
        {doc.uploadedBy.name}
      </td>

      <td className="text-xs text-gray-500">
        {formatDate(doc.createdAt)}
      </td>

      <td className="text-right">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost btn-sm p-1.5 inline-flex items-center gap-1 text-gray-500 hover:text-brand-700"
          title={`Download ${doc.originalName}`}
        >
          <Download className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">Download</span>
        </a>
      </td>
    </tr>
  );
}
