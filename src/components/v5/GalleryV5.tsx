import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Heart, MapPin, Eye } from 'lucide-react';

const GalleryV5 = () => {
  const [activeTab, setActiveTab] = useState('hotel');

  const hotelImages = [
    { url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=400&fit=crop", caption: "Luxury Mountain Suite", location: "Matheran Hills" },
    { url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=400&fit=crop", caption: "Heritage Dining Room", location: "Main Building" },
    { url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=400&fit=crop", caption: "Spa & Wellness Center", location: "Wellness Wing" },
    { url: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop", caption: "Garden Restaurant", location: "Outdoor Terrace" },
    { url: "https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=400&h=400&fit=crop", caption: "Valley View Lounge", location: "Central Lobby" },
    { url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=400&fit=crop", caption: "Horse Riding Arena", location: "Adventure Zone" },
    { url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop", caption: "Sunrise Point View", location: "Echo Point" },
    { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop", caption: "Forest Walking Trail", location: "Nature Reserve" },
    { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop", caption: "Mountain Sunset", location: "Panorama Point" }
  ];

  const guestImages = [
    { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=400&fit=crop", caption: "Perfect honeymoon getaway! 💕", likes: 234, guest: "@priya_travels" },
    { url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=400&fit=crop", caption: "Family time in paradise 👨‍👩‍👧‍👦", likes: 189, guest: "@sharma_family" },
    { url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=400&fit=crop", caption: "Best spa experience ever! ✨", likes: 156, guest: "@wellness_seeker" },
    { url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop", caption: "Morning mist magic 🌫️", likes: 298, guest: "@mountain_lover" },
    { url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop", caption: "Adventure of a lifetime! 🏔️", likes: 167, guest: "@adventure_duo" },
    { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=400&fit=crop", caption: "Peaceful retreat 🧘‍♀️", likes: 203, guest: "@zen_traveler" },
    { url: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=400&fit=crop", caption: "Horseback riding fun! 🐎", likes: 178, guest: "@equestrian_life" },
    { url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=400&fit=crop", caption: "Nature therapy session 🌿", likes: 245, guest: "@nature_healer" },
    { url: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400&h=400&fit=crop", caption: "Sunrise worth waking up for! 🌅", likes: 267, guest: "@early_bird_explorer" }
  ];

  const currentImages = activeTab === 'hotel' ? hotelImages : guestImages;

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Matheran <span className="text-primary">Moments</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Discover the beauty of Matheran through stunning visuals and guest memories through our lens and our guests' unforgettable captures and tags
          </p>

          {/* Tab Navigation - V2 Style */}
          <div className="inline-flex bg-muted/50 rounded-full p-2 mb-8">
            <button
              onClick={() => setActiveTab('hotel')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 ${
                activeTab === 'hotel'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span className="font-medium">Hotel Moments</span>
            </button>
            <button
              onClick={() => setActiveTab('guests')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 ${
                activeTab === 'guests'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart className="w-5 h-5" />
              <span className="font-medium">From Our Guests</span>
            </button>
          </div>
        </div>

        {/* Gallery Grid - V4 Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
          {currentImages.map((image, index) => (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-lg cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                index === 0 ? 'md:col-span-2 md:row-span-2' : ''
              }`}
            >
              <img
                src={image.url}
                alt={activeTab === 'hotel' ? (image as any).caption : (image as any).caption}
                className={`w-full object-cover group-hover:scale-110 transition-transform duration-500 ${
                  index === 0 ? 'h-48 md:h-full' : 'h-32 md:h-48'
                }`}
              />
              
              {/* V3-style Overlay with V2 location info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 right-4">
                  {activeTab === 'hotel' ? (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-white" />
                        <span className="text-white text-sm font-medium">{(image as any).caption}</span>
                      </div>
                      <span className="text-white/80 text-xs">{(image as any).location}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-white text-sm font-medium">{(image as any).caption}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80 text-xs">{(image as any).guest}</span>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4 text-red-400 fill-current" />
                          <span className="text-white text-sm">{(image as any).likes}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* V4-style Eye icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
              </div>
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