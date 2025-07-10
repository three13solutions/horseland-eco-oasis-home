
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const GallerySection = () => {
  const [activeTab, setActiveTab] = useState('official');

  const officialPhotos = [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1615729947596-a598e5de0ab3?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1439886183900-e79ec0057170?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=300&h=300&fit=crop'
  ];

  const ugcPhotos = [
    'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1439886183900-e79ec0057170?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1615729947596-a598e5de0ab3?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&h=300&fit=crop'
  ];

  const currentPhotos = activeTab === 'official' ? officialPhotos : ugcPhotos;

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
                Official Photos
              </Button>
              <Button
                variant={activeTab === 'ugc' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('ugc')}
                className="px-6"
              >
                Guest Photos
              </Button>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          {currentPhotos.map((photo, index) => (
            <Card key={index} className="overflow-hidden group cursor-pointer">
              <div className="aspect-square overflow-hidden">
                <img
                  src={photo}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </Card>
          ))}
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
