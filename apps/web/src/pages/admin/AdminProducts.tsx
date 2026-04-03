import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { getAdminProducts } from '../../api/admin';

export function AdminProducts() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', page],
    queryFn: () => getAdminProducts(token!, page),
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-500 text-sm mt-1">
          {data ? `${data.total} products tracked across all users` : 'Loading...'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Retailer</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trackers</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Check</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : data?.products.map((product) => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="size-10 rounded-lg object-cover bg-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-gray-400 !text-lg">image</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 font-medium truncate max-w-xs">
                          {product.name || 'Unnamed Product'}
                        </p>
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-400 hover:text-gray-600 truncate block max-w-xs"
                        >
                          {new URL(product.url).hostname}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{product.retailer || 'Unknown'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900">{product.trackerCount}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {product.lastCheckedAt
                      ? new Date(product.lastCheckedAt).toLocaleString()
                      : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
