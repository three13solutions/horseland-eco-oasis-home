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
          .eq('category_id', category.id);

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

  return (
    <div className="relative overflow-x-auto h-[240px] -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="flex gap-3 px-4 sm:px-6 lg:px-8">
        {images.map((image, index) => (
          <div
            key={`${image.id}-${index}`}
            className="flex-shrink-0 w-[180px] h-[240px] relative group"
          >
            <img
              src={image.image_url}
              alt={image.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white font-body font-semibold text-xs">{image.title}</p>
                {image.caption && (
                  <p className="text-white/80 font-body text-[10px] mt-1">{image.caption}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiningGalleryCollage;
