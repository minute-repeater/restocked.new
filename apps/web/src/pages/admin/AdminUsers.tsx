import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { getAdminUsers } from '../../api/admin';

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  basic: 'bg-blue-100 text-blue-700',
  premium: 'bg-amber-100 text-amber-700',
};

export function AdminUsers() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: () => getAdminUsers(token!, search || undefined, page),
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 text-sm mt-1">{data ? `${data.total} total users` : 'Loading...'}</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracked</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : data?.users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{user.email}</span>
                      {user.isAdmin && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">ADMIN</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PLAN_COLORS[user.plan] || 'bg-gray-100 text-gray-700'}`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.trackedCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
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
