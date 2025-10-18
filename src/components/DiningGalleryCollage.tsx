import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GalleryImage {
  id: string;
  image_url: string;
  title: string;
  caption?: string;
}

const DiningGalleryCollage = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const itemsToShow = 5;
  const maxIndex = Math.max(0, images.length - itemsToShow);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  return (
    <div className="relative group h-[240px] -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="overflow-hidden h-full">
        <div 
          className="flex gap-3 transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * (180 + 12)}px)` }}
        >
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

      {/* Navigation Buttons */}
      {currentIndex > 0 && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      
      {currentIndex < maxIndex && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
          onClick={handleNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default DiningGalleryCollage;
