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

  // Duplicate images for seamless loop
  const displayImages = [...images, ...images, ...images];

  return (
    <div className="relative overflow-hidden rounded-lg h-[400px]">
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      <div className="flex gap-4 animate-scroll">
        {displayImages.map((image, index) => (
          <div
            key={`${image.id}-${index}`}
            className="flex-shrink-0 w-[300px] h-[400px] relative group"
          >
            <img
              src={image.image_url}
              alt={image.title}
              className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-body font-semibold text-sm">{image.title}</p>
                {image.caption && (
                  <p className="text-white/80 font-body text-xs mt-1">{image.caption}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gradient overlays for smooth edges */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
};

export default DiningGalleryCollage;
