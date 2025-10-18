import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GalleryImage {
  id: string;
  image_url: string;
  title: string;
  caption?: string;
}

const DiningGalleryCollage = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    const fetchDiningGallery = async () => {
      // Fetch dining gallery category
      const { data: category } = await supabase
        .from('gallery_categories')
        .select('id')
        .eq('slug', 'dining')
        .eq('is_active', true)
        .single();

      if (category) {
        // Fetch images linked to dining gallery
        const { data: imageLinks } = await supabase
          .from('image_categories')
          .select(`
            gallery_images (
              id,
              image_url,
              title,
              caption
            )
          `)
          .eq('category_id', category.id)
          .limit(6);

        if (imageLinks) {
          const fetchedImages = imageLinks
            .map((link: any) => link.gallery_images)
            .filter(Boolean);
          setImages(fetchedImages);
        }
      }
    };

    fetchDiningGallery();
  }, []);

  if (images.length === 0) {
    return null;
  }

  // Display first 6 images in creative grid
  const displayImages = images.slice(0, 6);

  return (
    <div className="relative h-full min-h-[400px]">
      {/* Creative Collage Grid */}
      <div className="grid grid-cols-3 grid-rows-3 gap-2 h-full">
        {/* Large image - top left spanning 2x2 */}
        {displayImages[0] && (
          <div className="col-span-2 row-span-2 relative overflow-hidden rounded-lg group">
            <img 
              src={displayImages[0].image_url} 
              alt={displayImages[0].title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Top right - medium */}
        {displayImages[1] && (
          <div className="row-span-2 relative overflow-hidden rounded-lg group">
            <img 
              src={displayImages[1].image_url} 
              alt={displayImages[1].title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Bottom row - 3 small images */}
        {displayImages[2] && (
          <div className="relative overflow-hidden rounded-lg group">
            <img 
              src={displayImages[2].image_url} 
              alt={displayImages[2].title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {displayImages[3] && (
          <div className="relative overflow-hidden rounded-lg group">
            <img 
              src={displayImages[3].image_url} 
              alt={displayImages[3].title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {displayImages[4] && (
          <div className="relative overflow-hidden rounded-lg group">
            <img 
              src={displayImages[4].image_url} 
              alt={displayImages[4].title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {/* Decorative overlay element */}
      <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export default DiningGalleryCollage;
