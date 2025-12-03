import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { ProductDetails } from '@/pages/ProductDetails';
import { ProductHistory } from '@/pages/ProductHistory';
import { Notifications } from '@/pages/Notifications';
import { NotificationSettings } from '@/pages/NotificationSettings';
import { Upgrade } from '@/pages/Upgrade';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            {/* Public auth routes */}
            <Route
              path="/login"
              element={token ? <Navigate to="/dashboard" replace /> : <Login />}
            />
            <Route
              path="/register"
              element={token ? <Navigate to="/dashboard" replace /> : <Register />}
            />

            {/* Protected app routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/product/:id/history/:variantId" element={<ProductHistory />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings/notifications" element={<NotificationSettings />} />
              <Route path="/upgrade" element={<Upgrade />} />
            </Route>

            {/* Root redirect */}
            <Route
              path="/"
              element={
                token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
              }
            />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
