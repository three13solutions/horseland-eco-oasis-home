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

  // Create infinite loop by duplicating images
  const displayImages = [...images, ...images, ...images];
  const centerOffset = images.length;

  const handlePrev = () => {
    setCurrentIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const handleImageClick = (index: number) => {
    const actualIndex = index % images.length;
    const currentActual = currentIndex % images.length;
    
    if (actualIndex !== currentActual) {
      handleNext();
    }
  };

  // Reset to center set when reaching boundaries
  useEffect(() => {
    if (currentIndex <= 0) {
      setTimeout(() => setCurrentIndex(centerOffset), 500);
    } else if (currentIndex >= images.length * 2) {
      setTimeout(() => setCurrentIndex(centerOffset), 500);
    }
  }, [currentIndex, centerOffset, images.length]);

  // Initialize at center
  useEffect(() => {
    if (images.length > 0 && currentIndex === 0) {
      setCurrentIndex(centerOffset);
    }
  }, [images.length, centerOffset]);

  return (
    <div className="relative group h-[200px]">
      <div className="overflow-hidden h-full">
        <div 
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 280}px)` }}
        >
          {displayImages.map((image, index) => (
            <div
              key={`${image.id}-${index}`}
              className="flex-shrink-0 w-[280px] h-[200px] relative group/item cursor-pointer"
              onClick={() => handleImageClick(index)}
            >
              <img
                src={image.image_url}
                alt={image.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
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
      <Button
        variant="outline"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
        onClick={handlePrev}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
        onClick={handleNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DiningGalleryCollage;
