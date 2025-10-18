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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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

  // Reset to center set when reaching boundaries
  useEffect(() => {
    if (images.length === 0) return;
    
    const centerOffset = images.length;
    
    if (currentIndex <= 0) {
      setTimeout(() => setCurrentIndex(centerOffset), 500);
    } else if (currentIndex >= images.length * 2) {
      setTimeout(() => setCurrentIndex(centerOffset), 500);
    }
  }, [currentIndex, images.length]);

  // Initialize at center
  useEffect(() => {
    if (images.length > 0 && currentIndex === 0) {
      setCurrentIndex(images.length);
    }
  }, [images.length]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX);
    setScrollLeft(currentIndex);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (startX - x) / 280; // Adjust sensitivity
    const newIndex = Math.round(scrollLeft + walk);
    setCurrentIndex(newIndex);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX);
    setScrollLeft(currentIndex);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX;
    const walk = (startX - x) / 280;
    const newIndex = Math.round(scrollLeft + walk);
    setCurrentIndex(newIndex);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div 
        className="relative group h-[200px] max-w-[1260px] mx-auto overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex gap-2 transition-transform duration-300 ease-out"
          style={{ 
            transform: `translateX(-${currentIndex * 282}px)`,
            transitionDuration: isDragging ? '0ms' : '300ms'
          }}
        >
          {displayImages.map((image, index) => (
            <div
              key={`${image.id}-${index}`}
              className="flex-shrink-0 w-[280px] h-[200px] relative group/item pointer-events-none"
            >
              <img
                src={image.image_url}
                alt={image.title}
                className="w-full h-full object-cover select-none"
                draggable="false"
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

        {/* Navigation Buttons */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm z-10"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm z-10"
          onClick={handleNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DiningGalleryCollage;
