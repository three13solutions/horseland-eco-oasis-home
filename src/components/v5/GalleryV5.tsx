import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Heart, MapPin, Eye, ArrowRight, Share } from 'lucide-react';

const GalleryV5 = () => {
  const [activeTab, setActiveTab] = useState('hotel');

  const hotelImages = [
    { url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop", caption: "Swimming Pool Paradise", location: "Main Pool Area" },
    { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=400&fit=crop", caption: "Deluxe Mountain Suite", location: "Premium Wing" },
    { url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop", caption: "Grand Buffet Dining", location: "Main Restaurant" },
    { url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=400&fit=crop", caption: "Executive Bedroom", location: "Heritage Block" },
    { url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=400&fit=crop", caption: "Spa & Wellness Center", location: "Wellness Wing" },
    { url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=400&fit=crop", caption: "Horse Riding Arena", location: "Adventure Zone" },
    { url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=400&fit=crop", caption: "Reception & Lobby", location: "Main Building" },
    { url: "https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=400&h=400&fit=crop", caption: "Valley View Lounge", location: "Central Lobby" },
    { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop", caption: "Mountain Sunset", location: "Panorama Point" }
  ];

  const guestImages = [
    { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop", caption: "Perfect honeymoon at Horseland! 💕", likes: 234, guest: "@priya_travels" },
    { url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=400&fit=crop", caption: "Family time by the pool 👨‍👩‍👧‍👦", likes: 189, guest: "@sharma_family" },
    { url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop", caption: "Couple enjoying breakfast buffet ✨", likes: 156, guest: "@wellness_seeker" },
    { url: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&h=400&fit=crop", caption: "Morning horse ride adventure 🐎", likes: 298, guest: "@mountain_lover" },
    { url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=400&fit=crop", caption: "Friends at the spa retreat 🧘‍♀️", likes: 167, guest: "@adventure_duo" },
    { url: "https://images.unsplash.com/photo-1524230572899-a752b3835840?w=400&h=400&fit=crop", caption: "Swimming pool selfie time! 🏊‍♀️", likes: 203, guest: "@zen_traveler" },
    { url: "https://images.unsplash.com/photo-1514315384763-ba401779410f?w=400&h=400&fit=crop", caption: "Group dining experience 🍽️", likes: 178, guest: "@equestrian_life" },
    { url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop", caption: "Sunset view from our room 🌅", likes: 245, guest: "@nature_healer" },
    { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", caption: "Best vacation memories made! 📸", likes: 267, guest: "@early_bird_explorer" }
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
              <div className={`w-full overflow-hidden ${
                index === 0 ? 'aspect-[3/2] md:aspect-[3/2]' : 'aspect-[4/3]'
              }`}>
                <img
                  src={image.url}
                  alt={activeTab === 'hotel' ? (image as any).caption : (image as any).caption}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              
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

        {/* Share Your Horseland Moments - V2 style with V3 buttons */}
        <div className="text-center mt-12 p-6 md:p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
            Share Your Horseland Moments
          </h3>
          <p className="text-muted-foreground mb-6">
            Tag us @horselandresort and use #MatheranMoments to be featured in our gallery
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center">
              <Camera className="w-4 h-4 mr-2" />
              View Full Gallery
            </button>
            <button className="border border-primary text-primary px-6 py-3 rounded-xl font-semibold hover:bg-primary/10 transition-all flex items-center justify-center">
              Follow @horselandresort
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GalleryV5;