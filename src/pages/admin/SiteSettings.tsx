import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ArrowUp, ArrowDown, Save, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NavigationItem {
  id: string;
  title: string;
  href: string;
  sort_order: number;
  is_active: boolean;
}

interface FooterSection {
  id: string;
  section_key: string;
  title: string;
  content: any;
  sort_order: number;
  is_active: boolean;
}

interface SiteSettings {
  site_title: string;
  site_logo: string;
  copyright_text: string;
  tagline: string;
}

const SiteSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [footerSections, setFooterSections] = useState<FooterSection[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    site_title: '',
    site_logo: '',
    copyright_text: '',
    tagline: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const safeParseJSON = (value: any) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if parsing fails
      }
    }
    return value; // Already an object or other type
  };

  const safePrepareValue = (value: any) => {
    if (typeof value === 'string') {
      return value; // Keep strings as strings
    }
    return JSON.stringify(value); // Only stringify non-string values
  };

  const loadData = async () => {
    try {
      console.log('Loading site settings data...');
      
      // Load navigation items
      const { data: navData, error: navError } = await supabase
        .from('navigation_items')
        .select('*')
        .order('sort_order');

      if (navError) {
        console.error('Error loading navigation items:', navError);
      } else {
        console.log('Navigation items loaded:', navData);
        setNavigationItems(navData || []);
      }

      // Load footer sections
      const { data: footerData, error: footerError } = await supabase
        .from('footer_sections')
        .select('*')
        .order('sort_order');

      if (footerError) {
        console.error('Error loading footer sections:', footerError);
      } else {
        console.log('Footer sections loaded:', footerData);
        setFooterSections(footerData || []);
      }

      // Load site settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('*');

      if (settingsError) {
        console.error('Error loading site settings:', settingsError);
      } else if (settingsData) {
        console.log('Site settings raw data:', settingsData);
        const settings: any = {};
        
        settingsData.forEach(setting => {
          settings[setting.setting_key] = safeParseJSON(setting.setting_value);
        });
        
        console.log('Processed site settings:', settings);
        setSiteSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNavigationItems = async () => {
    setSaving(true);
    try {
      // Delete all existing items and recreate them
      await supabase.from('navigation_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (navigationItems.length > 0) {
        const { error } = await supabase
          .from('navigation_items')
          .insert(navigationItems.map(item => ({
            title: item.title,
            href: item.href,
            sort_order: item.sort_order,
            is_active: item.is_active
          })));

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Navigation items saved successfully"
      });
    } catch (error) {
      console.error('Error saving navigation:', error);
      toast({
        title: "Error",
        description: "Failed to save navigation items",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveFooterSections = async () => {
    setSaving(true);
    try {
      for (const section of footerSections) {
        const { error } = await supabase
          .from('footer_sections')
          .upsert({
            id: section.id,
            section_key: section.section_key,
            title: section.title,
            content: section.content,
            sort_order: section.sort_order,
            is_active: section.is_active
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Footer sections saved successfully"
      });
    } catch (error) {
      console.error('Error saving footer:', error);
      toast({
        title: "Error",
        description: "Failed to save footer sections",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveSiteSettings = async () => {
    setSaving(true);
    try {
      console.log('Saving site settings:', siteSettings);
      
      const updates = Object.entries(siteSettings).map(([key, value]) => {
        const preparedValue = safePrepareValue(value);
        console.log(`Preparing ${key}:`, { original: value, prepared: preparedValue });
        
        return {
          setting_key: key,
          setting_value: preparedValue
        };
      });

      console.log('Final updates to save:', updates);

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(update);

        if (error) {
          console.error('Error saving setting:', update.setting_key, error);
          throw error;
        }
      }

      console.log('Site settings saved successfully');
      toast({
        title: "Success",
        description: "Site settings saved successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save site settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addNavigationItem = () => {
    const newItem: NavigationItem = {
      id: `temp-${Date.now()}`,
      title: 'New Item',
      href: '/',
      sort_order: navigationItems.length + 1,
      is_active: true
    };
    setNavigationItems([...navigationItems, newItem]);
  };

  const updateNavigationItem = (index: number, field: string, value: any) => {
    const updated = [...navigationItems];
    updated[index] = { ...updated[index], [field]: value };
    setNavigationItems(updated);
  };

  const deleteNavigationItem = (index: number) => {
    setNavigationItems(navigationItems.filter((_, i) => i !== index));
  };

  const moveNavigationItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...navigationItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      // Update sort orders
      newItems.forEach((item, i) => {
        item.sort_order = i + 1;
      });
      setNavigationItems(newItems);
    }
  };

  const updateFooterSection = (index: number, field: string, value: any) => {
    const updated = [...footerSections];
    if (field === 'content') {
      updated[index] = { ...updated[index], content: value };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFooterSections(updated);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Settings className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Site Settings</h1>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Site Settings</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic site configuration and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="site_title">Site Title</Label>
                <Input
                  id="site_title"
                  value={siteSettings.site_title}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, site_title: e.target.value }))}
                  placeholder="Your site title"
                />
              </div>
              
              <div>
                <Label htmlFor="site_logo">Site Logo URL</Label>
                <Input
                  id="site_logo"
                  value={siteSettings.site_logo}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, site_logo: e.target.value }))}
                  placeholder="/path/to/logo.png"
                />
              </div>

              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={siteSettings.tagline}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Your site tagline"
                />
              </div>

              <div>
                <Label htmlFor="copyright_text">Copyright Text</Label>
                <Input
                  id="copyright_text"
                  value={siteSettings.copyright_text}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, copyright_text: e.target.value }))}
                  placeholder="© 2024 Your Company Name"
                />
              </div>

              <Button onClick={saveSiteSettings} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save General Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="navigation">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Menu</CardTitle>
              <CardDescription>
                Manage your site's main navigation menu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {navigationItems.map((item, index) => (
                  <div key={item.id} className="flex items-center space-x-2 p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={item.title}
                        onChange={(e) => updateNavigationItem(index, 'title', e.target.value)}
                        placeholder="Menu item title"
                      />
                      <Input
                        value={item.href}
                        onChange={(e) => updateNavigationItem(index, 'href', e.target.value)}
                        placeholder="/path"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateNavigationItem(index, 'is_active', !item.is_active)}
                      >
                        Toggle
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveNavigationItem(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveNavigationItem(index, 'down')}
                        disabled={index === navigationItems.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNavigationItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="flex space-x-2">
                  <Button onClick={addNavigationItem} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Navigation Item
                  </Button>
                  <Button onClick={saveNavigationItems} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Navigation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <CardTitle>Footer Sections</CardTitle>
              <CardDescription>
                Manage footer content and sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {footerSections.map((section, index) => (
                  <div key={section.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{section.title}</h3>
                      <Badge variant={section.is_active ? "default" : "secondary"}>
                        {section.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Section Title</Label>
                        <Input
                          value={section.title}
                          onChange={(e) => updateFooterSection(index, 'title', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label>Content (JSON)</Label>
                        <Textarea
                          value={JSON.stringify(section.content, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              updateFooterSection(index, 'content', parsed);
                            } catch {
                              // Invalid JSON, don't update
                            }
                          }}
                          rows={6}
                          className="font-mono text-sm"
                        />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateFooterSection(index, 'is_active', !section.is_active)}
                      >
                        {section.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button onClick={saveFooterSections} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Footer Sections
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteSettings;
