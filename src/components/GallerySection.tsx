
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMediaList } from '@/hooks/useMediaList';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const GallerySection = () => {
  const [activeTab, setActiveTab] = useState('official');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: officialPhotos = [], isLoading: officialLoading } = useMediaList({
    categoryId: '', // You'll need to set the actual category ID for official photos
    mediaType: 'image'
  });

  const { data: ugcPhotos = [], isLoading: ugcLoading } = useMediaList({
    sourceType: 'all', // Guest photos from all sources
    mediaType: 'image'
  });

  const currentPhotos = activeTab === 'official' ? officialPhotos : ugcPhotos;
  const isLoading = activeTab === 'official' ? officialLoading : ugcLoading;

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedImageIndex((prev) => (prev === 0 ? currentPhotos.length - 1 : prev - 1));
    } else {
      setSelectedImageIndex((prev) => (prev === currentPhotos.length - 1 ? 0 : prev + 1));
    }
  };

  return (
    <section className="py-16 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Gallery
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Discover the beauty through our lens and our guests' eyes
          </p>
          
          {/* Toggle Buttons */}
          <div className="flex justify-center mb-8">
            <div className="bg-muted rounded-lg p-1">
              <Button
                variant={activeTab === 'official' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('official')}
                className="px-6"
              >
                Official Photos ({officialPhotos.length})
              </Button>
              <Button
                variant={activeTab === 'ugc' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('ugc')}
                className="px-6"
              >
                Guest Photos ({ugcPhotos.length})
              </Button>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square" />
            ))
          ) : (
            currentPhotos.slice(0, 9).map((photo, index) => (
              <Card 
                key={photo.id} 
                className="overflow-hidden group cursor-pointer"
                onClick={() => handleImageClick(index)}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={photo.image_url}
                    alt={photo.caption || photo.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => setIsLightboxOpen(true)}
          >
            View Full Gallery
          </Button>
        </div>

        {/* Lightbox Gallery Modal */}
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-6xl w-full p-0 bg-background">
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute right-4 top-4 z-50 rounded-full bg-background/80 p-2 hover:bg-background transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6">
              {/* Main Image */}
              <div className="relative aspect-video mb-6 bg-muted rounded-lg overflow-hidden">
                <img
                  src={currentPhotos[selectedImageIndex]?.image_url}
                  alt={currentPhotos[selectedImageIndex]?.caption || currentPhotos[selectedImageIndex]?.title}
                  className="w-full h-full object-contain"
                />
                
                {/* Navigation Arrows */}
                <button
                  onClick={() => navigateImage('prev')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-3 hover:bg-background transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => navigateImage('next')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-3 hover:bg-background transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Thumbnail Slider */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {currentPhotos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === selectedImageIndex 
                        ? 'border-primary scale-105' 
                        : 'border-transparent hover:border-muted-foreground/50'
                    }`}
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.caption || photo.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Image Info */}
              {(currentPhotos[selectedImageIndex]?.caption || currentPhotos[selectedImageIndex]?.guest_name) && (
                <div className="mt-4 text-center">
                  {currentPhotos[selectedImageIndex]?.caption && (
                    <p className="text-sm text-muted-foreground">
                      {currentPhotos[selectedImageIndex].caption}
                    </p>
                  )}
                  {currentPhotos[selectedImageIndex]?.guest_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Photo by {currentPhotos[selectedImageIndex].guest_name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default GallerySection;
