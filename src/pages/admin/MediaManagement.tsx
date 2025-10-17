import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { MediaCard } from '@/components/admin/MediaCard';
import { MediaListRow } from '@/components/admin/MediaListRow';
import { UnusedMediaDashboard } from '@/components/admin/UnusedMediaDashboard';
import { UsageDetailsModal } from '@/components/admin/UsageDetailsModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useMediaList } from '@/hooks/useMediaList';
import { useMediaUsage } from '@/hooks/useMediaUsage';
import { useMediaStats } from '@/hooks/useMediaStats';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Upload, 
  Edit, 
  Trash2, 
  Image as ImageIcon, 
  RefreshCw, 
  Heart, 
  MapPin, 
  Camera,
  Replace,
  Video,
  ExternalLink,
  HardDrive,
  Filter,
  Search,
  MoreVertical,
  Copy,
  Download,
  LayoutGrid,
  LayoutList
} from 'lucide-react';

interface GalleryImage {
  id: string;
  title: string;
  image_url: string;
  video_url?: string;
  caption?: string;
  alt_text?: string;
  location?: string;
  guest_name?: string;
  guest_handle?: string;
  likes_count?: number;
  category_id: string;
  media_type: 'image' | 'video';
  source_type: 'upload' | 'external' | 'mirrored' | 'hardcoded';
  is_hardcoded: boolean;
  hardcoded_key?: string;
  sort_order: number;
  gallery_categories?: {
    name: string;
    slug: string;
  };
  image_categories?: Array<{
    category_id: string;
    gallery_categories: {
      name: string;
      slug: string;
    };
  }>;
}

interface GalleryCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

const MediaManagement = () => {
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMigrating, setIsMigrating] = useState(false);
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [selectedMediaForUsage, setSelectedMediaForUsage] = useState<GalleryImage | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    image: GalleryImage | null;
    usages: any[];
  }>({ open: false, image: null, usages: [] });
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 25,
  });
  const [filters, setFilters] = useState<{
    mediaType: 'image' | 'video' | 'all';
    sourceType: 'upload' | 'external' | 'mirrored' | 'hardcoded' | 'all';
    categoryId: string;
    categorySlug?: string;
    searchTerm: string;
    usageFilter: 'all' | 'used' | 'unused';
  }>({
    mediaType: 'all',
    sourceType: 'all',
    categoryId: '',
    categorySlug: undefined,
    searchTerm: '',
    usageFilter: 'all'
  });
  const { toast } = useToast();

  const { data: allImages = [], isLoading, refetch } = useMediaList(filters);
  const { data: mediaStats, isLoading: statsLoading } = useMediaStats();

  // Paginate images
  const totalPages = Math.ceil(allImages.length / pagination.perPage);
  const startIndex = (pagination.page - 1) * pagination.perPage;
  const endIndex = startIndex + pagination.perPage;
  const images = allImages.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('gallery_categories')
        .select('*')
        .order('sort_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  };

  const handleSaveImage = async (imageData: Partial<GalleryImage>) => {
    try {
      if (editingImage) {
        // Update existing image
        const { error: updateError } = await supabase
          .from('gallery_images')
          .update(imageData)
          .eq('id', editingImage.id);

        if (updateError) throw updateError;
        
        toast({
          title: "Success",
          description: "Media updated successfully. Categories will auto-update based on usage.",
        });
      } else {
        // Insert new image
        const insertData = {
          title: imageData.title || '',
          image_url: imageData.image_url || '',
          video_url: imageData.video_url,
          category: 'gallery',
          caption: imageData.caption,
          location: imageData.location,
          guest_name: imageData.guest_name,
          guest_handle: imageData.guest_handle,
          likes_count: imageData.likes_count || 0,
          sort_order: imageData.sort_order || 0,
          media_type: imageData.media_type || 'image',
          source_type: imageData.source_type || 'upload',
          hardcoded_key: imageData.hardcoded_key,
          is_hardcoded: imageData.is_hardcoded || false,
          alt_text: (imageData as any).alt_text
        };
        
        const { error: insertError } = await supabase
          .from('gallery_images')
          .insert([insertData]);

        if (insertError) throw insertError;
        
        toast({
          title: "Success",
          description: "Media added. Categories will be assigned when you use it in content.",
        });
      }

      setIsDialogOpen(false);
      setEditingImage(null);
      refetch();
    } catch (error) {
      console.error('Error saving media:', error);
      toast({
        title: "Error",
        description: "Failed to save media",
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = async (image: GalleryImage, usages: any[]) => {
    // Safety check for hardcoded media
    if (image.is_hardcoded) {
      toast({
        title: "Cannot Delete Hardcoded Media",
        description: "This media is hardcoded and referenced in the application code. Deletion is blocked to prevent breaking the site.",
        variant: "destructive",
      });
      return;
    }

    // If media has usages, show confirmation with details
    if (usages.length > 0) {
      setDeleteConfirmation({ open: true, image, usages });
      return;
    }

    // Direct delete for unused media
    await performDelete(image.id);
  };

  const performDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Media deleted successfully",
      });
      
      setDeleteConfirmation({ open: false, image: null, usages: [] });
      refetch();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    // Check if any hardcoded media is selected
    const hardcodedSelected = allImages.filter(
      img => selectedItems.includes(img.id) && img.is_hardcoded
    );
    
    if (hardcodedSelected.length > 0) {
      toast({
        title: "Cannot Delete Hardcoded Media",
        description: `${hardcodedSelected.length} selected items are hardcoded and cannot be deleted. Please deselect them first.`,
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Delete ${selectedItems.length} selected items?`)) return;

    try {
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `${selectedItems.length} items deleted successfully`,
      });
      
      setSelectedItems([]);
      refetch();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete selected items",
        variant: "destructive",
      });
    }
  };

  const handleSelectAllUnused = () => {
    // This would need to be implemented with usage checking
    toast({
      title: "Select All Unused",
      description: "This feature requires checking usage for all media items...",
    });
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'upload': return <Upload className="w-3 h-3" />;
      case 'external': return <ExternalLink className="w-3 h-3" />;
      case 'hardcoded': return <HardDrive className="w-3 h-3" />;
      default: return <Camera className="w-3 h-3" />;
    }
  };

  const getMediaTypeIcon = (mediaType: string) => {
    return mediaType === 'video' ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />;
  };

  const handleMigrateExistingMedia = async () => {
    // Migration function kept for potential re-use, but button removed from UI
    if (!confirm('This will import all existing images from Blog Posts, Spa Services, Activities, Room Types, Packages, Meals, and Pages into Media Management. Continue?')) {
      return;
    }

    setIsMigrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-existing-media');

      if (error) throw error;

      toast({
        title: "Migration Complete!",
        description: data.message,
      });

      refetch();
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Migration Failed",
        description: error.message || "Failed to migrate existing media",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Media Management</h1>
          <p className="text-muted-foreground">Centralized media library for all website assets</p>
        </div>
        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedItems.length})
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={async () => {
              toast({
                title: "Checking for duplicates...",
                description: "Scanning media library",
              });
              
              // Find duplicates by URL
              const urlCounts = allImages.reduce((acc, img) => {
                acc[img.image_url] = (acc[img.image_url] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              
              const duplicates = Object.entries(urlCounts)
                .filter(([_, count]) => count > 1)
                .map(([url, count]) => ({
                  url,
                  count,
                  images: allImages.filter(img => img.image_url === url)
                }));
              
              if (duplicates.length > 0) {
                toast({
                  title: `⚠️ Found ${duplicates.length} duplicate URL${duplicates.length > 1 ? 's' : ''}`,
                  description: "Check console for details",
                  variant: "destructive",
                });
                console.log('Duplicate images:', duplicates);
              } else {
                toast({
                  title: "✓ No duplicates",
                  description: "All images have unique URLs",
                });
              }
            }}
          >
            <Copy className="w-4 h-4 mr-2" />
            Check Duplicates
          </Button>
          <Button onClick={() => {
            setEditingImage(null);
            setIsDialogOpen(true);
          }}>
            <Upload className="w-4 h-4 mr-2" />
            Add Media
          </Button>
        </div>
      </div>

      {/* Usage Statistics Dashboard */}
      {mediaStats && !statsLoading && <UnusedMediaDashboard stats={mediaStats} />}
      {statsLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Calculating usage statistics...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search media by title or caption..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Select value={filters.mediaType} onValueChange={(value: any) => setFilters({ ...filters, mediaType: value })}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.sourceType} onValueChange={(value: any) => setFilters({ ...filters, sourceType: value })}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="upload">Uploaded</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="hardcoded">Hardcoded</SelectItem>
                  <SelectItem value="mirrored">Mirrored</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.categoryId || "all-categories"} 
                onValueChange={(value) => {
                  const selectedCategory = categories.find(c => c.id === value);
                  setFilters({ 
                    ...filters, 
                    categoryId: value === "all-categories" ? "" : value,
                    categorySlug: selectedCategory?.slug 
                  });
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.usageFilter} 
                onValueChange={(value: 'all' | 'used' | 'unused') => setFilters({ ...filters, usageFilter: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Usage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Media</SelectItem>
                  <SelectItem value="used">Used Only</SelectItem>
                  <SelectItem value="unused">Unused Only</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? <LayoutList className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Grid/List View */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      ) : images.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {images.map((image) => (
                <MediaCard
                  key={image.id}
                  image={image}
                  selected={selectedItems.includes(image.id)}
                  onSelect={(checked) => {
                    if (checked) {
                      setSelectedItems([...selectedItems, image.id]);
                    } else {
                      setSelectedItems(selectedItems.filter(id => id !== image.id));
                    }
                  }}
                  onEdit={() => {
                    setEditingImage(image as GalleryImage);
                    setIsDialogOpen(true);
                  }}
                  onDelete={(usages) => handleDeleteImage(image as GalleryImage, usages)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedItems.length === images.length && images.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems(images.map(img => img.id));
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-20">Preview</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Used In</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {images.map((image) => (
                    <MediaListRow
                      key={image.id}
                      image={image}
                      selected={selectedItems.includes(image.id)}
                      onSelect={(checked) => {
                        if (checked) {
                          setSelectedItems([...selectedItems, image.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== image.id));
                        }
                      }}
                      onEdit={() => {
                        setEditingImage(image as GalleryImage);
                        setIsDialogOpen(true);
                      }}
                      onDelete={(usages) => handleDeleteImage(image as GalleryImage, usages)}
                    />
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Pagination Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Items per page:</span>
                  <Select
                    value={pagination.perPage.toString()}
                    onValueChange={(value) => setPagination({ ...pagination, perPage: parseInt(value), page: 1 })}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, allImages.length)} of {allImages.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Media Found</h3>
            <p className="text-muted-foreground mb-4">
              {Object.values(filters).some(f => f && f !== 'all') 
                ? 'No media matches your current filters.' 
                : 'Start building your media library by adding your first asset.'}
            </p>
            <Button onClick={() => {
              setEditingImage(null);
              setIsDialogOpen(true);
            }}>
              <Upload className="h-4 w-4 mr-2" />
              Add First Media
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Media Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingImage ? 'Edit Media' : 'Add New Media'}
            </DialogTitle>
          </DialogHeader>
          <MediaForm
            image={editingImage}
            categories={categories}
            onSave={handleSaveImage}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingImage(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Usage Details Modal */}
      {selectedMediaForUsage && (
        <UsageDetailsModal
          open={usageModalOpen}
          onOpenChange={setUsageModalOpen}
          imageUrl={selectedMediaForUsage.image_url}
          usages={[]}
        />
      )}

      {/* Delete Confirmation with Usage Warning */}
      <AlertDialog 
        open={deleteConfirmation.open} 
        onOpenChange={(open) => !open && setDeleteConfirmation({ open: false, image: null, usages: [] })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media with Active Usages?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This media is currently used in <strong>{deleteConfirmation.usages.length}</strong> location
                {deleteConfirmation.usages.length > 1 ? 's' : ''}:
              </p>
              <div className="bg-muted p-3 rounded-lg space-y-1 max-h-40 overflow-y-auto">
                {deleteConfirmation.usages.slice(0, 5).map((usage, idx) => (
                  <div key={idx} className="text-sm flex items-center gap-2">
                    <Badge variant="secondary">{usage.type}</Badge>
                    <span>{usage.title}</span>
                  </div>
                ))}
                {deleteConfirmation.usages.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ...and {deleteConfirmation.usages.length - 5} more
                  </p>
                )}
              </div>
              <p className="text-destructive font-medium">
                ⚠️ Deleting this media will NOT automatically remove it from these locations.
                This may result in broken images on your website.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmation.image && performDelete(deleteConfirmation.image.id)}
            >
              Delete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Enhanced Media Form Component
interface MediaFormProps {
  image?: GalleryImage | null;
  categories: GalleryCategory[];
  onSave: (data: Partial<GalleryImage>) => void;
  onCancel: () => void;
}

const MediaForm: React.FC<MediaFormProps> = ({ image, categories, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: image?.title || '',
    image_url: image?.image_url || '',
    video_url: image?.video_url || '',
    caption: image?.caption || '',
    alt_text: (image as any)?.alt_text || '',
    location: image?.location || '',
    guest_name: image?.guest_name || '',
    guest_handle: image?.guest_handle || '',
    likes_count: image?.likes_count || 0,
    sort_order: image?.sort_order || 0,
    media_type: image?.media_type || 'image' as 'image' | 'video',
    source_type: image?.source_type || 'upload' as 'upload' | 'external' | 'mirrored' | 'hardcoded',
    hardcoded_key: image?.hardcoded_key || '',
    is_hardcoded: image?.is_hardcoded || false,
  });

  const isGuestCategory = false; // Categories are now auto-assigned based on usage

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Auto-detect media type from URL
  const detectMediaType = (url: string): 'image' | 'video' => {
    const videoIndicators = ['youtube.com', 'youtu.be', 'vimeo.com', '.mp4', '.webm', '.ogg'];
    const isVideo = videoIndicators.some(indicator => url.toLowerCase().includes(indicator));
    return isVideo ? 'video' : 'image';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      {/* Auto-detect media type - no manual input needed */}
      <div>
        <Label>Media Upload *</Label>
        {!formData.video_url && (
          <MediaPicker
            label=""
            value={formData.image_url}
            onChange={(url) => {
              const isExternal = url.startsWith('http://') || url.startsWith('https://');
              const isUpload = url.includes('supabase.co/storage');
              const detectedType = detectMediaType(url);
              
              setFormData({ 
                ...formData, 
                image_url: url,
                video_url: '', // Clear video URL when uploading image
                source_type: isUpload ? 'upload' : isExternal ? 'external' : 'upload',
                media_type: detectedType
              });
            }}
            folder="media"
          />
        )}
        
        {!formData.image_url && (
          <div className="mt-2">
            <Input
              placeholder="Or paste video URL (YouTube, Vimeo, etc.)"
              value={formData.video_url}
              onChange={(e) => {
                const url = e.target.value;
                setFormData({ 
                  ...formData, 
                  video_url: url,
                  image_url: '', // Clear image URL when adding video
                  source_type: 'external',
                  media_type: 'video'
                });
              }}
            />
          </div>
        )}
        
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Badge variant="outline">
            {formData.media_type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
            {formData.media_type} • {formData.source_type}
          </Badge>
          <span>Auto-detected</span>
        </div>
        
        <p className="text-xs text-muted-foreground mt-1">
          Upload an image or paste a video URL - type is detected automatically
        </p>
      </div>

      <div className="p-3 bg-muted rounded-lg text-sm">
        <p className="font-medium mb-1">📂 Categories Auto-Assigned</p>
        <p className="text-muted-foreground text-xs">
          Categories are automatically determined based on where you use this media. 
          For example, if you add this to a blog post, it will be tagged "Blog". 
          Use it in a room, it gets tagged "Rooms".
        </p>
      </div>

      <div>
        <Label htmlFor="alt_text">Alt Text (SEO) *</Label>
        <Input
          id="alt_text"
          value={formData.alt_text}
          onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
          placeholder="Descriptive text for accessibility and SEO"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Describe what's in the image for screen readers and search engines
        </p>
      </div>

      {/* Caption - used in gallery displays */}
      <div>
        <Label htmlFor="caption">Caption (Optional)</Label>
        <Textarea
          id="caption"
          value={formData.caption}
          onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
          rows={2}
          placeholder="Caption displayed below image in galleries"
        />
      </div>

      {/* Guest-specific fields */}
      {isGuestCategory && (
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-semibold">Guest Photo Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guest_name">Guest Name</Label>
              <Input
                id="guest_name"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>
            <div>
              <Label htmlFor="guest_handle">Social Handle</Label>
              <Input
                id="guest_handle"
                value={formData.guest_handle}
                onChange={(e) => setFormData({ ...formData, guest_handle: e.target.value })}
                placeholder="e.g., @johndoe"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="likes_count">Likes Count</Label>
            <Input
              id="likes_count"
              type="number"
              min="0"
              value={formData.likes_count}
              onChange={(e) => setFormData({ ...formData, likes_count: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      )}

      {/* Location - used in some gallery displays */}
      {!isGuestCategory && (
        <div>
          <Label htmlFor="location">Location Tag (Optional)</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Main Pool Area, Garden View"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Location tag for organizing gallery images
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {image ? 'Update Media' : 'Add Media'}
        </Button>
      </div>
    </form>
  );
};

export default MediaManagement;
