import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { getAdminHealth } from '../../api/admin';

export function AdminHealth() {
  const { token } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => getAdminHealth(token!),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-10">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl">Failed to load health data.</div>
      </div>
    );
  }

  // Group notification delivery into a readable table
  const deliveryMap = new Map<string, Record<string, number>>();
  for (const d of data.notificationDelivery) {
    if (!deliveryMap.has(d.type)) deliveryMap.set(d.type, {});
    deliveryMap.get(d.type)![d.status] = d.count;
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
        <p className="text-gray-500 text-sm mt-1">Scraper performance and notification delivery (last 24 hours)</p>
      </div>

      {/* Scraper Health by Retailer */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Scraper Activity by Retailer</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Retailer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Checks (24h)</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Last Check</th>
              </tr>
            </thead>
            <tbody>
              {data.retailerHealth.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400 text-sm">No stock checks in the last 24 hours</td></tr>
              ) : data.retailerHealth.map((r, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-sm text-gray-900 font-medium">{r.retailer || 'Unknown'}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{r.checkCount}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {r.lastCheck ? new Date(r.lastCheck).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Delivery */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Notification Delivery (24h)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Sent</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Failed</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Pending</th>
              </tr>
            </thead>
            <tbody>
              {deliveryMap.size === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">No notifications in the last 24 hours</td></tr>
              ) : Array.from(deliveryMap).map(([type, statuses]) => (
                <tr key={type} className="border-b border-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900 font-medium">{type.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-3 text-sm text-green-600 font-semibold">{statuses['sent'] || 0}</td>
                  <td className="px-6 py-3 text-sm text-red-600 font-semibold">{statuses['failed'] || 0}</td>
                  <td className="px-6 py-3 text-sm text-amber-600 font-semibold">{statuses['pending'] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Failures */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Failed Notifications</h2>
        </div>
        {data.recentFailures.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No failed notifications</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Error</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recentFailures.map((f) => (
                  <tr key={f.id} className="border-b border-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">{f.type.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{f.userEmail}</td>
                    <td className="px-6 py-3 text-sm text-red-600 max-w-xs truncate">{f.errorMessage || 'Unknown error'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{new Date(f.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
