import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Save, Settings, GripVertical, ChevronRight, Facebook, Instagram, Twitter, Youtube, Linkedin, Video, MessageCircle, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';
import SocialMediaManager from '@/components/admin/SocialMediaManager';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface NavigationItem {
  id: string;
  title: string;
  href: string;
  sort_order: number;
  is_active: boolean;
  parent_id?: string | null;
}

// Sortable Navigation Item Component (moved outside to prevent re-renders)
const SortableNavigationItem = React.memo(({ 
  item, 
  index, 
  onUpdate, 
  onDelete, 
  onAddChild,
  isChild = false
}: {
  item: NavigationItem;
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onDelete: (index: number) => void;
  onAddChild: (parentId: string) => void;
  isChild?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 p-3 bg-background border rounded-lg ${isChild ? 'border-l-4 border-l-primary/30' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1 grid grid-cols-2 gap-3">
        <Input
          value={item.title}
          onChange={(e) => onUpdate(index, 'title', e.target.value)}
          placeholder="Title"
          className="text-sm"
        />
        <Input
          value={item.href}
          onChange={(e) => onUpdate(index, 'href', e.target.value)}
          placeholder="/path"
          className="text-sm"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <Label htmlFor={`toggle-${item.id}`} className="text-xs text-muted-foreground">
            {item.is_active ? 'Published' : 'Draft'}
          </Label>
          <Switch
            id={`toggle-${item.id}`}
            checked={item.is_active}
            onCheckedChange={(checked) => onUpdate(index, 'is_active', checked)}
          />
        </div>
        
        {!isChild && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddChild(item.id)}
            title="Add sub-menu item"
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(index)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
});

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
  brand_descriptor: string;
  copyright_text: string;
  tagline: string;
}

interface SEOSettings {
  default_title_format: string;
  default_meta_description: string;
  default_og_image: string;
  google_analytics_id: string;
  google_search_console: string;
  twitter_handle: string;
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
    brand_descriptor: '',
    copyright_text: '',
    tagline: 'Powered by <a href="https://313s.com/" target="_blank" rel="noopener noreferrer">IIIXIII</a>'
  });
  const [seoSettings, setSeoSettings] = useState<SEOSettings>({
    default_title_format: '{title} | {site_name}',
    default_meta_description: '',
    default_og_image: '',
    google_analytics_id: '',
    google_search_console: '',
    twitter_handle: ''
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
    // For JSONB columns, we need to ensure proper JSON encoding
    // Supabase client will handle the final conversion
    return value;
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
        const seoData: any = {};
        
        settingsData.forEach(setting => {
          const value = safeParseJSON(setting.setting_value);
          // Separate SEO settings from general site settings
          if (['default_title_format', 'default_meta_description', 'default_og_image', 
               'google_analytics_id', 'google_search_console', 'twitter_handle'].includes(setting.setting_key)) {
            seoData[setting.setting_key] = value;
          } else {
            settings[setting.setting_key] = value;
          }
        });
        
        console.log('Processed site settings:', settings);
        console.log('Processed SEO settings:', seoData);
        setSiteSettings(prev => ({ ...prev, ...settings }));
        setSeoSettings(prev => ({ ...prev, ...seoData }));
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
        // First, insert all parent items (items without parent_id)
        const parentItems = navigationItems.filter(item => !item.parent_id);
        const childItems = navigationItems.filter(item => item.parent_id);
        
        // Create a mapping from old temp IDs to new IDs
        const idMapping: { [key: string]: string } = {};
        
        if (parentItems.length > 0) {
          const { data: insertedParents, error: parentError } = await supabase
            .from('navigation_items')
            .insert(parentItems.map(item => ({
              title: item.title,
              href: item.href,
              sort_order: item.sort_order,
              is_active: item.is_active,
              parent_id: null
            })))
            .select('id');

          if (parentError) throw parentError;
          
          // Map old IDs to new IDs
          parentItems.forEach((item, index) => {
            if (insertedParents && insertedParents[index]) {
              idMapping[item.id] = insertedParents[index].id;
            }
          });
        }
        
        // Then, insert child items with the correct parent IDs
        if (childItems.length > 0) {
          const { error: childError } = await supabase
            .from('navigation_items')
            .insert(childItems.map(item => ({
              title: item.title,
              href: item.href,
              sort_order: item.sort_order,
              is_active: item.is_active,
              parent_id: item.parent_id ? idMapping[item.parent_id] || item.parent_id : null
            })));

          if (childError) throw childError;
        }
      }

      toast({
        title: "Success",
        description: "Navigation items saved successfully"
      });
      
      // Reload the data to get the new IDs
      loadData();
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
          .upsert(update, {
            onConflict: 'setting_key'
          });

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

  const saveSEOSettings = async () => {
    setSaving(true);
    try {
      console.log('Saving SEO settings:', seoSettings);
      
      const updates = Object.entries(seoSettings).map(([key, value]) => {
        const preparedValue = safePrepareValue(value);
        return {
          setting_key: key,
          setting_value: preparedValue
        };
      });

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(update, {
            onConflict: 'setting_key'
          });

        if (error) {
          console.error('Error saving SEO setting:', update.setting_key, error);
          throw error;
        }
      }

      toast({
        title: "Success",
        description: "SEO settings saved successfully"
      });
    } catch (error) {
      console.error('Error saving SEO settings:', error);
      toast({
        title: "Error",
        description: "Failed to save SEO settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addNavigationItem = (parentId?: string) => {
    const newItem: NavigationItem = {
      id: `temp-${Date.now()}`,
      title: 'New Item',
      href: '/',
      sort_order: navigationItems.length + 1,
      is_active: true,
      parent_id: parentId || null
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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setNavigationItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        // Update sort orders
        reorderedItems.forEach((item, index) => {
          item.sort_order = index + 1;
        });
        return reorderedItems;
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic site configuration and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="site_title">Brand Name</Label>
                <Input
                  id="site_title"
                  value={siteSettings.site_title}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, site_title: e.target.value }))}
                  placeholder="Your brand name"
                />
              </div>
              
              <div>
                <ImageUpload
                  label="Brand Monogram"
                  value={siteSettings.site_logo}
                  onChange={(url) => setSiteSettings(prev => ({ ...prev, site_logo: url }))}
                  bucketName="uploads"
                  folder="logos"
                />
              </div>

              <div>
                <Label htmlFor="brand_descriptor">Brand Descriptor</Label>
                <Input
                  id="brand_descriptor"
                  value={siteSettings.brand_descriptor}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, brand_descriptor: e.target.value }))}
                  placeholder="Hotel, Resort, etc."
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

              <div>
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  value={siteSettings.tagline}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Powered by IIIXIII"
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={navigationItems.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {navigationItems
                      .filter(item => !item.parent_id)
                      .map((item, index) => (
                        <div key={item.id}>
                          <SortableNavigationItem
                            item={item}
                            index={navigationItems.indexOf(item)}
                            onUpdate={updateNavigationItem}
                            onDelete={deleteNavigationItem}
                            onAddChild={addNavigationItem}
                          />
                          {navigationItems
                            .filter(child => child.parent_id === item.id)
                            .map((child) => (
                              <div key={child.id} className="ml-8">
                                <SortableNavigationItem
                                  item={child}
                                  index={navigationItems.indexOf(child)}
                                  onUpdate={updateNavigationItem}
                                  onDelete={deleteNavigationItem}
                                  onAddChild={addNavigationItem}
                                  isChild={true}
                                />
                              </div>
                            ))}
                        </div>
                      ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              <div className="flex space-x-2 mt-4">
                <Button onClick={() => addNavigationItem()} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Navigation Item
                </Button>
                <Button onClick={saveNavigationItems} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Navigation
                </Button>
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
                      
                      {section.section_key === 'social' ? (
                        <SocialMediaManager 
                          section={section}
                          onUpdate={(content) => updateFooterSection(index, 'content', content)}
                        />
                      ) : (
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
                      )}
                      
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

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Configure search engine optimization and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="default_title_format">Default Title Format</Label>
                <Input
                  id="default_title_format"
                  value={seoSettings.default_title_format}
                  onChange={(e) => setSeoSettings(prev => ({ ...prev, default_title_format: e.target.value }))}
                  placeholder="{title} | {site_name}"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Use {'{title}'} and {'{site_name}'} as placeholders
                </p>
              </div>

              <div>
                <Label htmlFor="default_meta_description">Default Meta Description</Label>
                <Textarea
                  id="default_meta_description"
                  value={seoSettings.default_meta_description}
                  onChange={(e) => setSeoSettings(prev => ({ ...prev, default_meta_description: e.target.value }))}
                  placeholder="Enter default meta description (max 160 characters)"
                  rows={3}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {seoSettings.default_meta_description.length}/160 characters
                </p>
              </div>

              <div>
                <ImageUpload
                  label="Default OG Image"
                  value={seoSettings.default_og_image}
                  onChange={(url) => setSeoSettings(prev => ({ ...prev, default_og_image: url }))}
                  bucketName="uploads"
                  folder="seo"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Recommended size: 1200x630px for social media sharing
                </p>
              </div>

              <div>
                <Label htmlFor="google_analytics_id">Google Analytics ID</Label>
                <Input
                  id="google_analytics_id"
                  value={seoSettings.google_analytics_id}
                  onChange={(e) => setSeoSettings(prev => ({ ...prev, google_analytics_id: e.target.value }))}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>

              <div>
                <Label htmlFor="google_search_console">Google Search Console Verification</Label>
                <Input
                  id="google_search_console"
                  value={seoSettings.google_search_console}
                  onChange={(e) => setSeoSettings(prev => ({ ...prev, google_search_console: e.target.value }))}
                  placeholder="Verification meta tag content"
                />
              </div>

              <div>
                <Label htmlFor="twitter_handle">Twitter Handle</Label>
                <Input
                  id="twitter_handle"
                  value={seoSettings.twitter_handle}
                  onChange={(e) => setSeoSettings(prev => ({ ...prev, twitter_handle: e.target.value }))}
                  placeholder="@yourbrand"
                />
              </div>

              <Button onClick={saveSEOSettings} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save SEO Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteSettings;
