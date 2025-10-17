import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, CheckCircle, Database, Image, Video, Trash2, RefreshCw, Filter, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MediaStats {
  total: number;
  used: number;
  unused: number;
  byType: {
    pages: number;
    blogs: number;
    rooms: number;
    packages: number;
    activities: number;
    spa: number;
    meals: number;
  };
  byMediaType: {
    images: number;
    videos: number;
  };
}

interface DuplicateStats {
  totalDuplicates: number;
  groups: number;
  wastedSpace: number;
}

interface UnusedMediaDashboardProps {
  stats: MediaStats;
  onRefresh?: () => void;
  usageFilter: 'all' | 'used' | 'unused';
  onUsageFilterChange: (filter: 'all' | 'used' | 'unused') => void;
  duplicateStats: DuplicateStats;
  duplicatesFilter?: 'all' | 'duplicates';
  onDuplicatesFilterChange?: () => void;
  formatFileSize: (bytes: number) => string;
}

export const UnusedMediaDashboard: React.FC<UnusedMediaDashboardProps> = ({ 
  stats, 
  onRefresh, 
  usageFilter,
  onUsageFilterChange,
  duplicateStats,
  duplicatesFilter,
  onDuplicatesFilterChange,
  formatFileSize
}) => {
  const usagePercentage = stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0;
  const { toast } = useToast();
  const [isCleaningUp, setIsCleaningUp] = React.useState(false);

  const handleCleanup = async () => {
    if (stats.unused === 0) {
      toast({
        title: "No unused media",
        description: "All media is currently in use!",
      });
      return;
    }

    if (!confirm(`Delete all ${stats.unused} unused media items? This action cannot be undone.`)) {
      return;
    }

    setIsCleaningUp(true);
    
    try {
      // Get all images
      const { data: allImages, error: fetchError } = await supabase
        .from('gallery_images')
        .select('id, image_url, is_hardcoded');

      if (fetchError) throw fetchError;

      // Check usage for each image
      const unusedImages = [];
      for (const img of allImages || []) {
        // Skip hardcoded images
        if (img.is_hardcoded) continue;

        const imageUrl = img.image_url;
        
        // Check all tables for usage
        const [pages, blogs, rooms, packages, activities, spa, meals] = await Promise.all([
          supabase.from('pages').select('id, hero_image, og_image, hero_gallery'),
          supabase.from('blog_posts').select('id, featured_image'),
          supabase.from('room_types').select('id, hero_image, gallery'),
          supabase.from('packages').select('id, featured_image, banner_image, gallery'),
          supabase.from('activities').select('id, image, media_urls'),
          supabase.from('spa_services').select('id, image, media_urls'),
          supabase.from('meals').select('id, featured_media'),
        ]);

        let isUsed = false;

        // Check pages
        pages.data?.forEach(page => {
          if (page.hero_image === imageUrl || page.og_image === imageUrl) {
            isUsed = true;
          } else if (Array.isArray(page.hero_gallery) && page.hero_gallery.some((item: any) => 
            (typeof item === 'string' ? item : item?.url) === imageUrl
          )) {
            isUsed = true;
          }
        });

        // Check other tables
        if (blogs.data?.some(blog => blog.featured_image === imageUrl)) isUsed = true;
        
        rooms.data?.forEach(room => {
          if (room.hero_image === imageUrl || (Array.isArray(room.gallery) && room.gallery.includes(imageUrl))) {
            isUsed = true;
          }
        });

        packages.data?.forEach(pkg => {
          if (pkg.featured_image === imageUrl || pkg.banner_image === imageUrl || 
              (Array.isArray(pkg.gallery) && pkg.gallery.includes(imageUrl))) {
            isUsed = true;
          }
        });

        activities.data?.forEach(activity => {
          if (activity.image === imageUrl || 
              (Array.isArray(activity.media_urls) && activity.media_urls.some((m: any) => 
                typeof m === 'string' ? m === imageUrl : m?.url === imageUrl
              ))) {
            isUsed = true;
          }
        });

        spa.data?.forEach(service => {
          if (service.image === imageUrl || 
              (Array.isArray(service.media_urls) && service.media_urls.includes(imageUrl))) {
            isUsed = true;
          }
        });

        if (meals.data?.some(meal => meal.featured_media === imageUrl)) isUsed = true;

        if (!isUsed) {
          unusedImages.push(img.id);
        }
      }

      if (unusedImages.length === 0) {
        toast({
          title: "No unused media found",
          description: "All media appears to be in use now.",
        });
        onRefresh?.();
        return;
      }

      // Delete unused images
      const { error: deleteError } = await supabase
        .from('gallery_images')
        .delete()
        .in('id', unusedImages);

      if (deleteError) throw deleteError;

      toast({
        title: "Cleanup Complete",
        description: `Successfully deleted ${unusedImages.length} unused media items.`,
      });
      
      onRefresh?.();
    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to clean up unused media",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onUsageFilterChange('all')}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Media</p>
              <button className="text-2xl font-bold hover:underline text-left">
                {stats.total}
              </button>
            </div>
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="flex items-center gap-1">
              <Image className="h-3 w-3" />
              {stats.byMediaType.images}
            </span>
            <span className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              {stats.byMediaType.videos}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onUsageFilterChange('used')}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Used Media</p>
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className="text-2xl font-bold text-green-600 dark:text-green-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {stats.used}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64" side="bottom" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold mb-3">Usage Breakdown</p>
                    <div className="space-y-1.5 text-sm">
                      {stats.byType.pages > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pages</span>
                          <span className="font-medium">{stats.byType.pages}</span>
                        </div>
                      )}
                      {stats.byType.blogs > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Blog Posts</span>
                          <span className="font-medium">{stats.byType.blogs}</span>
                        </div>
                      )}
                      {stats.byType.rooms > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rooms</span>
                          <span className="font-medium">{stats.byType.rooms}</span>
                        </div>
                      )}
                      {stats.byType.packages > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Packages</span>
                          <span className="font-medium">{stats.byType.packages}</span>
                        </div>
                      )}
                      {stats.byType.activities > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Activities</span>
                          <span className="font-medium">{stats.byType.activities}</span>
                        </div>
                      )}
                      {stats.byType.spa > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Spa Services</span>
                          <span className="font-medium">{stats.byType.spa}</span>
                        </div>
                      )}
                      {stats.byType.meals > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Meals</span>
                          <span className="font-medium">{stats.byType.meals}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-xs text-muted-foreground">
            {usagePercentage}% utilization
          </p>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onUsageFilterChange('unused')}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unused Media</p>
              <button className="text-2xl font-bold text-orange-600 dark:text-orange-400 hover:underline text-left">
                {stats.unused}
              </button>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.unused > 0 ? 'Click to filter unused media' : 'All media in use!'}
          </p>
        </CardContent>
      </Card>

      {/* Duplicate Files Stat Card */}
      <Card 
        className={`cursor-pointer hover:shadow-md transition-shadow ${duplicateStats.totalDuplicates > 0 ? 'border-destructive/50' : ''}`}
        onClick={duplicateStats.totalDuplicates > 0 ? onDuplicatesFilterChange : undefined}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Duplicate Files</p>
              <button 
                className={`text-2xl font-bold text-left ${duplicateStats.totalDuplicates > 0 ? 'text-orange-600 dark:text-orange-400 hover:underline' : 'text-green-600 dark:text-green-400'}`}
                disabled={duplicateStats.totalDuplicates === 0}
              >
                {duplicateStats.totalDuplicates}
              </button>
            </div>
            {duplicateStats.totalDuplicates > 0 ? (
              <Copy className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            ) : (
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {duplicateStats.totalDuplicates > 0 
              ? `${duplicateStats.groups} groups • ${formatFileSize(duplicateStats.wastedSpace)}`
              : 'No duplicate files found'
            }
          </p>
          {duplicatesFilter === 'duplicates' && duplicateStats.totalDuplicates > 0 && (
            <Badge variant="secondary" className="mt-2">Filtering</Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
