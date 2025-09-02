import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Github, Video, MessageCircle, Globe } from 'lucide-react';

interface SocialNetwork {
  platform: string;
  label: string;
  url: string;
  enabled: boolean;
  icon: React.ReactNode;
}

interface SocialMediaManagerProps {
  section: {
    content: {
      networks?: SocialNetwork[];
    };
  };
  onUpdate: (content: any) => void;
}

const AVAILABLE_PLATFORMS = [
  { platform: 'facebook', label: 'Facebook', icon: <Facebook className="w-4 h-4" /> },
  { platform: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" /> },
  { platform: 'twitter', label: 'Twitter / X', icon: <Twitter className="w-4 h-4" /> },
  { platform: 'youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4" /> },
  { platform: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" /> },
  { platform: 'github', label: 'GitHub', icon: <Github className="w-4 h-4" /> },
  { platform: 'tiktok', label: 'TikTok', icon: <Video className="w-4 h-4" /> },
  { platform: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" /> },
];

const SocialMediaManager: React.FC<SocialMediaManagerProps> = ({ section, onUpdate }) => {
  const networks = section.content.networks || AVAILABLE_PLATFORMS.map(platform => ({
    ...platform,
    url: '',
    enabled: false
  }));

  // Ensure we have all platforms with proper structure
  const completeNetworks = AVAILABLE_PLATFORMS.map(platform => {
    const existing = networks.find(n => n.platform === platform.platform);
    return existing ? existing : {
      ...platform,
      url: '',
      enabled: false
    };
  });

  const updateNetwork = (platformIndex: number, field: string, value: any) => {
    const updatedNetworks = [...completeNetworks];
    updatedNetworks[platformIndex] = {
      ...updatedNetworks[platformIndex],
      [field]: value
    };
    
    onUpdate({
      ...section.content,
      networks: updatedNetworks
    });
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Social Media Networks</Label>
      <p className="text-sm text-muted-foreground">
        Configure your social media links. Only enabled networks with URLs will appear in the footer.
      </p>
      
      <div className="grid gap-4">
        {completeNetworks.map((network, index) => (
          <Card key={network.platform} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {network.icon}
                  <CardTitle className="text-sm">{network.label}</CardTitle>
                </div>
                <Switch
                  checked={network.enabled}
                  onCheckedChange={(enabled) => updateNetwork(index, 'enabled', enabled)}
                />
              </div>
            </CardHeader>
            {network.enabled && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <Label htmlFor={`${network.platform}-url`} className="text-xs">
                    Profile URL
                  </Label>
                  <Input
                    id={`${network.platform}-url`}
                    placeholder={`https://${network.platform}.com/yourprofile`}
                    value={network.url}
                    onChange={(e) => updateNetwork(index, 'url', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p>💡 Tip: Only networks that are enabled and have a URL will be displayed in the footer.</p>
      </div>
    </div>
  );
};

export default SocialMediaManager;