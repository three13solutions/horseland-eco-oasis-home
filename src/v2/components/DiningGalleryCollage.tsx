import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { galleryImages, galleryCategories } from '@/v2/data';

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
    const diningCategory = galleryCategories.find((c) => c.slug === 'dining' && c.is_active !== false);
    if (diningCategory) {
      const fetchedImages = galleryImages
        .filter((img) => img.category_id === diningCategory.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((img) => ({
          id: img.id,
          image_url: img.image_url,
          title: img.title,
          caption: img.caption,
        }));
      setImages(fetchedImages);
    }
  }, []);

  useEffect(() => {
    if (images.length === 0) return;

    const centerOffset = images.length;

    if (currentIndex <= 0) {
      setTimeout(() => setCurrentIndex(centerOffset), 500);
    } else if (currentIndex >= images.length * 2) {
      setTimeout(() => setCurrentIndex(centerOffset), 500);
    }
  }, [currentIndex, images.length]);

  useEffect(() => {
    if (images.length > 0 && currentIndex === 0) {
      setCurrentIndex(images.length);
    }
  }, [images.length]);

  if (images.length === 0) {
    return null;
  }

  const displayImages = [...images, ...images, ...images];

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
    const walk = (startX - x) / 360;
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
    const walk = (startX - x) / 360;
    const newIndex = Math.round(scrollLeft + walk);
    setCurrentIndex(newIndex);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div
        className="relative group h-[280px] max-w-[1400px] mx-auto overflow-hidden cursor-grab active:cursor-grabbing rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex gap-3"
          style={{
            transform: `translateX(-${currentIndex * 363}px)`,
            transition: isDragging ? 'none' : 'transform 500ms cubic-bezier(0.4, 0.0, 0.2, 1)'
          }}
        >
          {displayImages.map((image, index) => (
            <div
              key={`${image.id}-${index}`}
              className="flex-shrink-0 w-[360px] h-[280px] relative group/item pointer-events-none rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <img
                src={image.image_url}
                alt={image.title}
                className="w-full h-full object-cover select-none"
                draggable="false"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-body font-semibold text-sm">{image.title}</p>
                  {image.caption && (
                    <p className="text-white/90 font-body text-xs mt-1">{image.caption}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm z-10 shadow-lg hover:scale-110"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm z-10 shadow-lg hover:scale-110"
          onClick={handleNext}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default DiningGalleryCollage;
