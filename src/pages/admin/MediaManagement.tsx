import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  Edit, 
  Trash2, 
  Image as ImageIcon, 
  RefreshCw, 
  Heart, 
  MapPin, 
  Camera,
  Replace
} from 'lucide-react';

interface GalleryImage {
  id: string;
  title: string;
  image_url: string;
  caption?: string;
  location?: string;
  guest_name?: string;
  guest_handle?: string;
  likes_count?: number;
  category_id: string;
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
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('gallery_categories')
        .select('*')
        .order('sort_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch images
      const { data: imagesData, error: imagesError } = await supabase
        .from('gallery_images')
        .select(`
          *,
          gallery_categories(name, slug)
        `)
        .order('sort_order');

      if (imagesError) throw imagesError;
      setImages(imagesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch gallery data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = async (imageData: Partial<GalleryImage>) => {
    try {
      if (editingImage) {
        // Update existing image
        const { error } = await supabase
          .from('gallery_images')
          .update(imageData)
          .eq('id', editingImage.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Image updated successfully",
        });
      } else {
        // Create new image
        const insertData = {
          title: imageData.title || '',
          image_url: imageData.image_url || '',
          category: 'gallery', // Required field
          category_id: imageData.category_id,
          caption: imageData.caption,
          location: imageData.location,
          guest_name: imageData.guest_name,
          guest_handle: imageData.guest_handle,
          likes_count: imageData.likes_count || 0,
          sort_order: imageData.sort_order || 0,
          is_hardcoded: false
        };
        
        const { error } = await supabase
          .from('gallery_images')
          .insert([insertData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Image added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingImage(null);
      fetchData();
    } catch (error) {
      console.error('Error saving image:', error);
      toast({
        title: "Error",
        description: "Failed to save image",
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const handleReplaceHardcodedImage = (image: GalleryImage) => {
    setEditingImage(image);
    setIsDialogOpen(true);
  };

  const filteredImages = activeTab === 'all' 
    ? images 
    : images.filter(img => img.gallery_categories?.slug === activeTab);

  const getImagesByCategory = (categorySlug: string) => {
    return images.filter(img => img.gallery_categories?.slug === categorySlug);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Media Management</h1>
          <p className="text-muted-foreground">Manage gallery images and media content</p>
        </div>
        <Button onClick={() => {
          setEditingImage(null);
          setIsDialogOpen(true);
        }}>
          <Upload className="w-4 h-4 mr-2" />
          Add New Image
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Images ({images.length})</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category.slug} value={category.slug}>
              {category.name} ({getImagesByCategory(category.slug).length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredImages.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  <div className="relative aspect-video">
                    <img
                      src={image.image_url}
                      alt={image.caption || image.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingImage(image);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {image.is_hardcoded && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReplaceHardcodedImage(image)}
                            className="bg-orange-500 text-white hover:bg-orange-600"
                          >
                            <Replace className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteImage(image.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {image.is_hardcoded && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs">
                        Hardcoded
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate">{image.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{image.caption}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Camera className="w-3 h-3 mr-1" />
                        {image.gallery_categories?.name}
                      </span>
                      {image.gallery_categories?.slug === 'guests' && image.likes_count && (
                        <span className="flex items-center">
                          <Heart className="w-3 h-3 mr-1 text-red-400" />
                          {image.likes_count}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Image Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingImage ? 'Edit Image' : 'Add New Image'}
              {editingImage?.is_hardcoded && ' (Replace Hardcoded)'}
            </DialogTitle>
          </DialogHeader>
          <ImageForm
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

// Image Form Component
interface ImageFormProps {
  image?: GalleryImage | null;
  categories: GalleryCategory[];
  onSave: (data: Partial<GalleryImage>) => void;
  onCancel: () => void;
}

const ImageForm: React.FC<ImageFormProps> = ({ image, categories, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: image?.title || '',
    image_url: image?.image_url || '',
    caption: image?.caption || '',
    location: image?.location || '',
    guest_name: image?.guest_name || '',
    guest_handle: image?.guest_handle || '',
    likes_count: image?.likes_count || 0,
    category_id: image?.category_id || categories[0]?.id || '',
    sort_order: image?.sort_order || 0,
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
      </div>

      <div>
        <ImageUpload
          label="Image"
          value={formData.image_url}
          onChange={(url) => setFormData({ ...formData, image_url: url })}
          bucketName="uploads"
          folder="gallery"
        />
      </div>

      <div>
        <Label htmlFor="caption">Caption</Label>
        <Textarea
          id="caption"
          value={formData.caption}
          onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
          rows={2}
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
          {image ? 'Update Image' : 'Add Image'}
        </Button>
      </div>
    </form>
  );
};

export default MediaManagement;