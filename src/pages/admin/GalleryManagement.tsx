import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Image as ImageIcon, Trash2, ExternalLink, Plus, Upload, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

const GalleryManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { uploadMedia, uploading } = useMediaUpload();

  // Fetch only gallery-type categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['gallery-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_categories')
        .select('*')
        .eq('category_type', 'gallery')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch images for selected category
  const { data: categoryImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['category-images', selectedCategory],
    enabled: !!selectedCategory,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_categories')
        .select(`
          *,
          gallery_images (*)
        `)
        .eq('category_id', selectedCategory);
      
      if (error) throw error;
      return data.map(item => item.gallery_images);
    },
  });

  // Fetch all available images for picker (always load for better UX)
  const { data: allImages = [] } = useQuery({
    queryKey: ['all-images', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('gallery_images')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });


  // Link images to gallery mutation
  const linkImagesMutation = useMutation({
    mutationFn: async ({ imageIds, categoryId }: { imageIds: string[]; categoryId: string }) => {
      // Check which images are already linked
      const { data: existing } = await supabase
        .from('image_categories')
        .select('image_id')
        .eq('category_id', categoryId)
        .in('image_id', imageIds);
      
      const existingIds = existing?.map(e => e.image_id) || [];
      const newImageIds = imageIds.filter(id => !existingIds.includes(id));
      
      if (newImageIds.length === 0) {
        toast({
          title: 'Already Added',
          description: 'Selected images are already in this gallery',
        });
        return;
      }
      
      const links = newImageIds.map(imageId => ({
        image_id: imageId,
        category_id: categoryId,
      }));
      
      const { error } = await supabase
        .from('image_categories')
        .insert(links);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-images'] });
      toast({
        title: 'Success',
        description: 'Images added to gallery',
      });
      setShowMediaPicker(false);
      setSelectedImageIds([]);
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedCategory) return;
    
    const category = categories.find(c => c.id === selectedCategory);
    
    for (const file of Array.from(files)) {
      const result = await uploadMedia(file, {
        folder: 'gallery',
        category: category?.slug || 'gallery',
        categoryId: selectedCategory,
        title: file.name.split('.')[0],
      });
      
      if (result) {
        // Auto-link uploaded image to the gallery
        await linkImagesMutation.mutateAsync({ 
          imageIds: [result.id], 
          categoryId: selectedCategory 
        });
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['category-images'] });
    queryClient.invalidateQueries({ queryKey: ['all-images'] });
    
    // Reset file input
    event.target.value = '';
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImageIds(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleAddSelectedImages = () => {
    if (selectedCategory && selectedImageIds.length > 0) {
      linkImagesMutation.mutate({ 
        imageIds: selectedImageIds, 
        categoryId: selectedCategory 
      });
    }
  };

  // Link/Unlink image mutation
  const unlinkImageMutation = useMutation({
    mutationFn: async ({ imageId, categoryId }: { imageId: string; categoryId: string }) => {
      const { error } = await supabase
        .from('image_categories')
        .delete()
        .eq('image_id', imageId)
        .eq('category_id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-images'] });
      toast({
        title: 'Success',
        description: 'Image removed from gallery',
      });
    },
  });


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Public Galleries</h1>
          <p className="text-muted-foreground mt-1">
            View and organize images in your public-facing galleries
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/categories">
            Manage Categories
          </Link>
        </Button>
      </div>

      {categoriesLoading ? (
        <div>Loading galleries...</div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Galleries Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create gallery categories to organize your public-facing images
            </p>
            <Button asChild>
              <Link to="/admin/categories">
                Create Gallery Category
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(category => (
            <Card key={category.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {category.slug}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {category.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {category.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    View Images
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link to="/admin/media">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Gallery Images View Dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                Gallery Images - {categories.find(c => c.id === selectedCategory)?.name}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setShowMediaPicker(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Images
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/media">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Media Library
                  </Link>
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            
            {imagesLoading ? (
              <div>Loading images...</div>
            ) : categoryImages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No images in this gallery yet.</p>
                <Button onClick={() => setShowMediaPicker(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Images
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {categoryImages.map((image: any) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.image_url}
                      alt={image.title}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => unlinkImageMutation.mutate({
                          imageId: image.id,
                          categoryId: selectedCategory!,
                        })}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Picker Dialog */}
      <Dialog open={showMediaPicker} onOpenChange={setShowMediaPicker}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Add Images to {categories.find(c => c.id === selectedCategory)?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-4 items-center mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="gallery-file-upload"
              />
              <Button asChild disabled={uploading}>
                <label htmlFor="gallery-file-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload New'}
                </label>
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px] w-full">
            <div className="grid grid-cols-4 gap-4 p-4 pr-4">
              {allImages.map((image: any) => {
                const isSelected = selectedImageIds.includes(image.id);
                const isAlreadyInGallery = categoryImages.some((img: any) => img.id === image.id);
                
                return (
                  <div
                    key={image.id}
                    className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary'
                        : isAlreadyInGallery
                        ? 'border-green-500 opacity-50'
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                    onClick={() => !isAlreadyInGallery && toggleImageSelection(image.id)}
                  >
                    {image.media_type === 'video' ? (
                      <video
                        src={image.video_url || image.image_url}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <img
                        src={image.image_url}
                        alt={image.title}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-8 h-8 text-primary" />
                      </div>
                    )}
                    {isAlreadyInGallery && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-500" />
                      </div>
                    )}
                    <div className="p-2 bg-background/95">
                      <p className="text-xs truncate">{image.title}</p>
                      {isAlreadyInGallery && (
                        <p className="text-xs text-green-600">Already in gallery</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedImageIds.length} image{selectedImageIds.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMediaPicker(false);
                  setSelectedImageIds([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSelectedImages}
                disabled={selectedImageIds.length === 0 || linkImagesMutation.isPending}
              >
                {linkImagesMutation.isPending ? 'Adding...' : `Add ${selectedImageIds.length || ''} Image${selectedImageIds.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryManagement;
