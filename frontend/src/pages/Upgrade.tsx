import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Sparkles, Zap, Infinity, Shield } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/toaster';

const freeFeatures = [
  'Track up to 3 products',
  'Email notifications',
  'Price & stock history',
  'Basic alerts',
];

const proFeatures = [
  'Unlimited product tracking',
  'Variant-level tracking',
  'Instant notifications',
  'Advanced price alerts',
  'Priority support',
  'Export data',
  'Frequent checks (every 5 min)',
  'Advanced analytics',
];

export function Upgrade() {
  const { user, login } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: planData } = useQuery({
    queryKey: ['user-plan'],
    queryFn: async () => {
      const response = await apiClient.get('/me/plan');
      return response.data;
    },
    enabled: !!user,
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/me/upgrade');
      return response.data;
    },
    onSuccess: (data) => {
      // Update auth store with new user data
      const updatedUser = { ...user!, plan: 'pro' as const };
      login({ user: updatedUser, token: useAuthStore.getState().token! });
      
      toast({
        title: 'Upgraded to Pro!',
        description: 'You now have access to all Pro features.',
        variant: 'success',
      });
      
      queryClient.invalidateQueries({ queryKey: ['user-plan'] });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Upgrade failed',
        description: error.response?.data?.error?.message || 'Failed to upgrade. Please try again.',
        variant: 'error',
      });
    },
  });

  const downgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/me/downgrade');
      return response.data;
    },
    onSuccess: (data) => {
      const updatedUser = { ...user!, plan: 'free' as const };
      login({ user: updatedUser, token: useAuthStore.getState().token! });
      
      toast({
        title: 'Downgraded to Free',
        description: 'You are now on the Free plan.',
        variant: 'success',
      });
      
      queryClient.invalidateQueries({ queryKey: ['user-plan'] });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Downgrade failed',
        description: error.response?.data?.error?.message || 'Failed to downgrade. Please try again.',
        variant: 'error',
      });
    },
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  const isPro = user.plan === 'pro';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {isPro ? 'Manage Your Plan' : 'Upgrade to Pro'}
          </h1>
          <p className="text-xl text-gray-600">
            {isPro 
              ? 'You\'re currently on the Pro plan. Switch to Free anytime.'
              : 'Unlock unlimited tracking and advanced features'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Free Plan */}
          <Card className={isPro ? '' : 'border-2 border-gray-300'}>
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for trying out Restocked.now</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-gray-600">/forever</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              {isPro ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => downgradeMutation.mutate()}
                  disabled={downgradeMutation.isPending}
                >
                  {downgradeMutation.isPending ? 'Switching...' : 'Switch to Free'}
                </Button>
              ) : (
                <div className="text-center text-sm text-gray-500">
                  Current plan
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={isPro ? 'border-2 border-primary shadow-xl scale-105' : 'border-2 border-gray-300'}>
            {isPro && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Current Plan
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                Pro
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </CardTitle>
              <CardDescription>For serious product trackers</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$9</span>
                <span className="text-gray-600">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              {!isPro ? (
                <Button
                  className="w-full bg-primary hover:bg-primary-dark"
                  onClick={() => upgradeMutation.mutate()}
                  disabled={upgradeMutation.isPending}
                >
                  {upgradeMutation.isPending ? 'Upgrading...' : 'Upgrade to Pro'}
                </Button>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-semibold">
                    <Shield className="h-4 w-4" />
                    Active
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {planData && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Current Plan Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Tracked Items</div>
                  <div className="text-lg font-semibold">
                    {planData.limits.maxTrackedItems === null ? (
                      <Infinity className="h-5 w-5 inline" />
                    ) : (
                      planData.limits.maxTrackedItems
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Checks Per Day</div>
                  <div className="text-lg font-semibold">
                    {planData.limits.maxChecksPerDay === null ? (
                      <Infinity className="h-5 w-5 inline" />
                    ) : (
                      planData.limits.maxChecksPerDay
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Variant Tracking</div>
                  <div className="text-lg font-semibold">
                    {planData.limits.allowVariantTracking ? 'Yes' : 'No'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Check Interval</div>
                  <div className="text-lg font-semibold">
                    {planData.limits.minCheckIntervalMinutes} min
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Note: This is a testing mode. No billing is required.</p>
          <p>You can switch between plans instantly.</p>
        </div>
      </div>
    </div>
  );
}

