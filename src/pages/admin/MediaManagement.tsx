import React, { useState, useEffect } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useMediaList } from '@/hooks/useMediaList';
import { useMediaUsage } from '@/hooks/useMediaUsage';
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
  const [filters, setFilters] = useState<{
    mediaType: 'image' | 'video' | 'all';
    sourceType: 'upload' | 'external' | 'mirrored' | 'hardcoded' | 'all';
    categoryId: string;
    categorySlug?: string;
    searchTerm: string;
  }>({
    mediaType: 'all',
    sourceType: 'all',
    categoryId: '',
    categorySlug: undefined,
    searchTerm: ''
  });
  const { toast } = useToast();

  const { data: images = [], isLoading, refetch } = useMediaList(filters);

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
        const { error } = await supabase
          .from('gallery_images')
          .update(imageData)
          .eq('id', editingImage.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Media updated successfully",
        });
      } else {
        const insertData = {
          title: imageData.title || '',
          image_url: imageData.image_url || '',
          video_url: imageData.video_url,
          category: 'gallery',
          category_id: imageData.category_id,
          caption: imageData.caption,
          location: imageData.location,
          guest_name: imageData.guest_name,
          guest_handle: imageData.guest_handle,
          likes_count: imageData.likes_count || 0,
          sort_order: imageData.sort_order || 0,
          media_type: imageData.media_type || 'image',
          source_type: imageData.source_type || 'upload',
          hardcoded_key: imageData.hardcoded_key,
          is_hardcoded: imageData.is_hardcoded || false
        };
        
        const { error } = await supabase
          .from('gallery_images')
          .insert([insertData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Media added successfully",
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

  const handleDeleteImage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

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
          <Button onClick={() => {
            setEditingImage(null);
            setIsDialogOpen(true);
          }}>
            <Upload className="w-4 h-4 mr-2" />
            Add Media
          </Button>
        </div>
      </div>

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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image) => (
            <Card key={image.id} className="overflow-hidden">
              <div className="relative aspect-video">
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedItems.includes(image.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItems([...selectedItems, image.id]);
                      } else {
                        setSelectedItems(selectedItems.filter(id => id !== image.id));
                      }
                    }}
                    className="bg-white/80"
                  />
                </div>
                
                {image.media_type === 'video' ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Video className="w-12 h-12 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={image.image_url}
                    alt={image.caption || image.title}
                    className="w-full h-full object-cover"
                  />
                )}
                
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingImage(image as GalleryImage);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteImage(image.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant="outline" className="bg-white/80 text-xs">
                    {getSourceIcon(image.source_type)}
                  </Badge>
                  {image.is_hardcoded && (
                    <Badge variant="secondary" className="bg-orange-500 text-white text-xs">
                      Key: {image.hardcoded_key}
                    </Badge>
                  )}
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold truncate flex items-center gap-2">
                      {getMediaTypeIcon(image.media_type)}
                      {image.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">{image.caption}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <Camera className="w-3 h-3 mr-1" />
                    {image.gallery_categories?.name || 'Uncategorized'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {image.source_type}
                    </Badge>
                    {image.gallery_categories?.slug === 'guests' && image.likes_count && (
                      <span className="flex items-center">
                        <Heart className="w-3 h-3 mr-1 text-red-400" />
                        {image.likes_count}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && !isLoading && (
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
    category_id: image?.category_id || categories[0]?.id || '',
    sort_order: image?.sort_order || 0,
    media_type: image?.media_type || 'image' as 'image' | 'video',
    source_type: image?.source_type || 'upload' as 'upload' | 'external' | 'mirrored' | 'hardcoded',
    hardcoded_key: image?.hardcoded_key || '',
    is_hardcoded: image?.is_hardcoded || false,
  });

  const selectedCategory = categories.find(cat => cat.id === formData.category_id);
  const isGuestCategory = selectedCategory?.slug === 'guests';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="media_type">Media Type</Label>
          <Select
            value={formData.media_type}
            onValueChange={(value: 'image' | 'video') => setFormData({ ...formData, media_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="source_type">Source Type</Label>
          <Select
            value={formData.source_type}
            onValueChange={(value: any) => setFormData({ ...formData, source_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upload">Upload</SelectItem>
              <SelectItem value="external">External URL</SelectItem>
              <SelectItem value="hardcoded">Hardcoded</SelectItem>
              <SelectItem value="mirrored">Mirrored</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.source_type === 'hardcoded' && (
        <div>
          <Label htmlFor="hardcoded_key">Hardcoded Key</Label>
          <Input
            id="hardcoded_key"
            value={formData.hardcoded_key}
            onChange={(e) => setFormData({ ...formData, hardcoded_key: e.target.value, is_hardcoded: true })}
            placeholder="e.g., hero-background, logo-main"
          />
        </div>
      )}

      {formData.media_type === 'image' ? (
        <div>
          <MediaPicker
            label="Image"
            value={formData.image_url}
            onChange={(url) => setFormData({ ...formData, image_url: url })}
            folder="media"
          />
        </div>
      ) : (
        <div>
          <Label htmlFor="video_url">Video URL</Label>
          <Input
            id="video_url"
            value={formData.video_url}
            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      )}

      <div>
        <Label htmlFor="caption">Caption</Label>
        <Textarea
          id="caption"
          value={formData.caption}
          onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="alt_text">Alt Text (SEO)</Label>
        <Input
          id="alt_text"
          value={formData.alt_text}
          onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
          placeholder="Descriptive text for accessibility and SEO"
        />
      </div>

      {!isGuestCategory ? (
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Main Pool Area"
          />
        </div>
      ) : (
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
            <Label htmlFor="guest_handle">Guest Handle</Label>
            <Input
              id="guest_handle"
              value={formData.guest_handle}
              onChange={(e) => setFormData({ ...formData, guest_handle: e.target.value })}
              placeholder="e.g., @johndoe"
            />
          </div>
        </div>
      )}

      {isGuestCategory && (
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
      )}

      <div>
        <Label htmlFor="sort_order">Sort Order</Label>
        <Input
          id="sort_order"
          type="number"
          min="0"
          value={formData.sort_order}
          onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
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
