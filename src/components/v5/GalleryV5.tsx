import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

const GalleryV5 = () => {
  const [activeTab, setActiveTab] = useState('hotel');

  const hotelImages = [
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop"
  ];

  const guestImages = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400&h=400&fit=crop"
  ];

  const currentImages = activeTab === 'hotel' ? hotelImages : guestImages;

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Gallery & <span className="text-primary">Moments</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Discover the beauty of Horseland through stunning visuals and guest memories
          </p>

          {/* Tab Navigation */}
          <div className="flex justify-center space-x-4 mb-8">
            <Button
              variant={activeTab === 'hotel' ? 'default' : 'outline'}
              onClick={() => setActiveTab('hotel')}
              className={`${
                activeTab === 'hotel' 
                  ? 'bg-gradient-to-r from-primary to-accent' 
                  : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
              } transition-all duration-300`}
            >
              Hotel Moments
            </Button>
            <Button
              variant={activeTab === 'guests' ? 'default' : 'outline'}
              onClick={() => setActiveTab('guests')}
              className={`${
                activeTab === 'guests' 
                  ? 'bg-gradient-to-r from-primary to-accent' 
                  : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
              } transition-all duration-300`}
            >
              From Our Guests
            </Button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl mx-auto" style={{maxWidth: '100vw'}}>
          {currentImages.map((image, index) => (
            <div 
              key={index}
              className="aspect-square rounded-2xl overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer"
            >
              <img
                src={image}
                alt={`Gallery image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transform hover:scale-105 transition-all duration-300">
            View Full Gallery
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GalleryV5;