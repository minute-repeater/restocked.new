import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { getAdminOverview } from '../../api/admin';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function AdminOverview() {
  const { token } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => getAdminOverview(token!),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-10">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl">Failed to load admin stats.</div>
      </div>
    );
  }

  const notifTotal = Object.values(data.notifications7d).reduce((a, b) => a + b, 0);
  const notifSent = data.notifications7d['sent'] || 0;
  const notifFailed = data.notifications7d['failed'] || 0;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time platform metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={data.totalUsers} />
        <StatCard label="Total Products" value={data.totalProducts} />
        <StatCard label="Active Trackers" value={data.activeTrackers} sub={`of ${data.totalTrackers} total`} />
        <StatCard label="Stock Checks (24h)" value={data.stockChecks24h} />
      </div>

      {/* Signups & Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Signups</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last 7 days</span>
              <span className="text-lg font-bold text-gray-900">{data.signups7d}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last 30 days</span>
              <span className="text-lg font-bold text-gray-900">{data.signups30d}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Plan Distribution</h2>
          <div className="space-y-3">
            {Object.entries(data.planDistribution).map(([plan, count]) => (
              <div key={plan} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">{plan}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full"
                      style={{ width: `${data.totalUsers ? (count / data.totalUsers) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Notifications (7 days)</h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-2xl font-bold text-gray-900">{notifTotal}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{notifSent}</p>
            <p className="text-sm text-gray-500">Sent</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{notifFailed}</p>
            <p className="text-sm text-gray-500">Failed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
