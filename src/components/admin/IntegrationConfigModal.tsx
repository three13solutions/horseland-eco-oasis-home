
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Integration {
  id: string;
  integration_key: string;
  name: string;
  category: string;
  description: string;
  secret_keys: Record<string, string>;
  config_keys: Record<string, string>;
  public_config: Record<string, any>;
}

interface IntegrationConfigModalProps {
  integration: Integration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IntegrationConfigModal({
  integration,
  open,
  onOpenChange,
  onSuccess,
}: IntegrationConfigModalProps) {
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<Record<string, any>>(integration.public_config || {});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const saveSecretsMutation = useMutation({
    mutationFn: async (data: { secrets: Record<string, string>; config: Record<string, any> }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Save secrets via edge function
      if (Object.keys(data.secrets).length > 0) {
        const response = await fetch(`https://mmmogqappdtnwqkvzxih.supabase.co/functions/v1/save-integration-secret`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            integrationId: integration.id,
            secrets: data.secrets,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save secrets');
        }
      }

      // Save public config directly to database
      if (Object.keys(data.config).length > 0) {
        const { error } = await supabase
          .from('api_integrations')
          .update({ public_config: data.config })
          .eq('id', integration.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Configuration saved successfully');
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Error saving configuration:', error);
      toast.error(error.message || 'Failed to save configuration');
    },
  });

  const handleSecretChange = (key: string, value: string) => {
    setSecrets(prev => ({ ...prev, [key]: value }));
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    saveSecretsMutation.mutate({ secrets, config });
  };

  const secretKeys = Object.entries(integration.secret_keys || {});
  const configKeys = Object.entries(integration.config_keys || {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configure {integration.name}
            <Badge variant="outline" className="capitalize">
              {integration.category}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {integration.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {secretKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Credentials & Secrets
                </CardTitle>
                <CardDescription>
                  These values will be encrypted and stored securely. Leave empty to keep existing values.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {secretKeys.map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{label}</Label>
                    <div className="relative">
                      <Input
                        id={key}
                        type={showSecrets[key] ? 'text' : 'password'}
                        value={secrets[key] || ''}
                        onChange={(e) => handleSecretChange(key, e.target.value)}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleSecretVisibility(key)}
                      >
                        {showSecrets[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {configKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
                <CardDescription>
                  Public configuration settings for this integration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {configKeys.map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`config_${key}`}>{label}</Label>
                    <Input
                      id={`config_${key}`}
                      value={config[key] || ''}
                      onChange={(e) => handleConfigChange(key, e.target.value)}
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {integration.integration_key === 'razorpay' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg text-blue-900">Razorpay Setup</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-800">
                <p className="mb-2">To configure Razorpay:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Log in to your Razorpay Dashboard</li>
                  <li>Go to Settings → API Keys</li>
                  <li>Generate or copy your Key ID and Secret</li>
                  <li>Enter them in the fields above</li>
                </ol>
              </CardContent>
            </Card>
          )}

          {integration.integration_key === 'mapbox' && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-lg text-purple-900">Mapbox Setup</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-purple-800">
                <p className="mb-2">To configure Mapbox:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Log in to your Mapbox account</li>
                  <li>Go to Account → Access tokens</li>
                  <li>Copy your Default public token or create a new one</li>
                  <li>Enter it in the field above</li>
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveSecretsMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveSecretsMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
