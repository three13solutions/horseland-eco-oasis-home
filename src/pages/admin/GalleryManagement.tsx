import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Image as ImageIcon, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const GalleryManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/media">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Manage in Media Library
                </Link>
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> To add images to this gallery, go to <Link to="/admin/media" className="text-primary underline">Media Library</Link>, 
                select images, and assign them to the "{categories.find(c => c.id === selectedCategory)?.name}" category.
              </p>
            </div>
            
            {imagesLoading ? (
              <div>Loading images...</div>
            ) : categoryImages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No images in this gallery yet.</p>
                <Button variant="outline" asChild>
                  <Link to="/admin/media">
                    Go to Media Library to Add Images
                  </Link>
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
    </div>
  );
};

export default GalleryManagement;
