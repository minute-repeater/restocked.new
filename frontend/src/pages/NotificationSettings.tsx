import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toaster';
import { Settings } from 'lucide-react';

export function NotificationSettings() {
  const queryClient = useQueryClient();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [thresholdPercentage, setThresholdPercentage] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => settingsApi.get(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof settingsApi.update>[0]) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
        variant: 'success',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to update settings',
        variant: 'error',
      });
    },
  });

  useEffect(() => {
    if (data?.settings) {
      setEmailEnabled(data.settings.email_enabled);
      setPushEnabled(data.settings.push_enabled);
      setThresholdPercentage(data.settings.threshold_percentage);
    }
  }, [data]);

  const handleSave = () => {
    updateMutation.mutate({
      email_enabled: emailEnabled,
      push_enabled: pushEnabled,
      threshold_percentage: thresholdPercentage,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
          <p className="text-gray-600">Manage your notification preferences</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <p className="text-gray-500 text-center">Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-gray-600">Manage your notification preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferences
          </CardTitle>
          <CardDescription>
            Choose how and when you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled">Email Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive notifications via email when products change
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-enabled">Push Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive browser push notifications (coming soon)
              </p>
            </div>
            <Switch
              id="push-enabled"
              checked={pushEnabled}
              onCheckedChange={setPushEnabled}
              disabled
            />
          </div>

          {/* Price Change Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold">Price Change Threshold (%)</Label>
            <p className="text-sm text-gray-500">
              Only notify about price changes above this percentage
            </p>
            <Input
              id="threshold"
              type="number"
              min="0"
              max="100"
              value={thresholdPercentage}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                  setThresholdPercentage(value);
                }
              }}
              className="max-w-xs"
            />
          </div>

          {/* Notification Types */}
          <div className="pt-4 border-t space-y-4">
            <h3 className="font-semibold text-sm">Notification Types</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Price Changes</Label>
                <p className="text-sm text-gray-500">
                  Notify when product prices change
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Restocks</Label>
                <p className="text-sm text-gray-500">
                  Notify when products come back in stock
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Out of Stock</Label>
                <p className="text-sm text-gray-500">
                  Notify when products go out of stock
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

