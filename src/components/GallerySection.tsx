
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMediaList } from '@/hooks/useMediaList';
import { Skeleton } from '@/components/ui/skeleton';

const GallerySection = () => {
  const [activeTab, setActiveTab] = useState('official');

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
              <Card key={photo.id} className="overflow-hidden group cursor-pointer">
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
          <Button variant="outline" size="lg">
            View Full Gallery
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
