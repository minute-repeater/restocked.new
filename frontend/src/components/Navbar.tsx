import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { LogOut, Package, Bell } from 'lucide-react';
import { notificationsApi } from '@/api/notifications';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationsApi.getAll(1, 0), // Just get one to check unread count
    enabled: !!token,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const unreadCount = notificationsData?.unreadCount || 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Don't render navbar if user is not authenticated
  if (!token) {
    return null;
  }

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Package className="h-6 w-6" />
              <span className="text-xl font-bold">StockCheck</span>
            </Link>
            <Link
              to="/dashboard"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              to="/notifications"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Notifications
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/notifications"
              className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </Link>
            <span className="text-sm text-gray-600">{user?.email}</span>
            {user?.plan && (
              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                user.plan === 'pro' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {user.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

