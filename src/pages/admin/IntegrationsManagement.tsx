
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Shield, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { IntegrationConfigModal } from '@/components/admin/IntegrationConfigModal';

interface Integration {
  id: string;
  integration_key: string;
  name: string;
  category: string;
  description: string;
  is_enabled: boolean;
  status: 'not_configured' | 'ok' | 'error';
  secret_keys: Record<string, string>;
  config_keys: Record<string, string>;
  public_config: Record<string, any>;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

const statusIcons = {
  not_configured: AlertCircle,
  ok: CheckCircle,
  error: XCircle,
};

const statusColors = {
  not_configured: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ok: 'bg-green-100 text-green-800 border-green-200',
  error: 'bg-red-100 text-red-800 border-red-200',
};

const categoryColors = {
  payments: 'bg-blue-100 text-blue-800 border-blue-200',
  maps: 'bg-purple-100 text-purple-800 border-purple-200',
  ota: 'bg-orange-100 text-orange-800 border-orange-200',
  messaging: 'bg-green-100 text-green-800 border-green-200',
  analytics: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function IntegrationsManagement() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_integrations')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Integration[];
    },
  });

  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('api_integrations')
        .update({ is_enabled: enabled })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration updated successfully');
    },
    onError: (error) => {
      console.error('Error updating integration:', error);
      toast.error('Failed to update integration');
    },
  });

  const verifyIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`https://mmmogqappdtnwqkvzxih.supabase.co/functions/v1/verify-integration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ integrationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }

      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error: any) => {
      console.error('Error verifying integration:', error);
      toast.error(error.message || 'Failed to verify integration');
    },
  });

  const categories = integrations ? [...new Set(integrations.map(i => i.category))] : [];
  const filteredIntegrations = integrations?.filter(
    i => selectedCategory === 'all' || i.category === selectedCategory
  ) || [];

  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsConfigModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Integrations</h1>
          <p className="text-gray-600">Manage your external API connections and credentials</p>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList>
          <TabsTrigger value="all">All ({integrations?.length || 0})</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category} ({integrations?.filter(i => i.category === category).length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${categoryColors[integration.category as keyof typeof categoryColors]}`}
                        >
                          {integration.category}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${statusColors[integration.status]}`}
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(integration.status)}
                            {integration.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleIntegrationMutation.mutate({
                        id: integration.id,
                        enabled: !integration.is_enabled
                      })}
                      disabled={toggleIntegrationMutation.isPending}
                    >
                      {integration.is_enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                  <CardDescription className="text-sm">
                    {integration.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {integration.last_verified_at && (
                      <div className="text-xs text-gray-500">
                        Last verified: {new Date(integration.last_verified_at).toLocaleDateString()}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfigureIntegration(integration)}
                        className="flex-1"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyIntegrationMutation.mutate(integration.id)}
                        disabled={verifyIntegrationMutation.isPending || integration.status === 'not_configured'}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedIntegration && (
        <IntegrationConfigModal
          integration={selectedIntegration}
          open={isConfigModalOpen}
          onOpenChange={setIsConfigModalOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['integrations'] });
            setIsConfigModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
