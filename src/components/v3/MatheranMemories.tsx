import React, { useState } from 'react';
import { Heart, MessageCircle, Share, MapPin, Camera } from 'lucide-react';

const MatheranMemories = () => {
  const [activeTab, setActiveTab] = useState('guest');

  const guestPhotos = [
    { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop', caption: 'Sunrise from our room! 🌅', likes: 45, guest: 'Priya S.' },
    { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=400&fit=crop', caption: 'Cozy room vibes ✨', likes: 32, guest: 'Raj P.' },
    { url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=400&fit=crop', caption: 'Family time in nature 👨‍👩‍👧‍👦', likes: 28, guest: 'Anita K.' },
    { url: 'https://images.unsplash.com/photo-1483884105135-c06ea585bda0?w=400&h=400&fit=crop', caption: 'Perfect mountain weather! 🏔️', likes: 56, guest: 'Vikram S.' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop', caption: 'Morning mist magic ☁️', likes: 41, guest: 'Kavita J.' },
    { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=400&fit=crop', caption: 'Home away from home 🏠', likes: 37, guest: 'Amit V.' }
  ];

  const hotelPhotos = [
    { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=400&fit=crop', caption: 'Our comfortable rooms' },
    { url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=400&fit=crop', caption: 'Family dining area' },
    { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=400&fit=crop', caption: 'Reception & lobby' },
    { url: 'https://images.unsplash.com/photo-1571508601793-5e8f44b7e909?w=400&h=400&fit=crop', caption: 'Garden seating area' },
    { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=400&fit=crop', caption: 'Mountain view terrace' },
    { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400&h=400&fit=crop', caption: 'Breakfast area' }
  ];

  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 md:mb-16">
            <span className="text-primary font-semibold text-sm md:text-base tracking-wider uppercase">
              Memories & Moments
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-4 mb-6">
              See Matheran Through Our Guests' Eyes
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Real moments captured by real guests. This is what your Matheran experience could look like.
            </p>
          </div>

          {/* Tab Navigation - Mobile Friendly */}
          <div className="flex justify-center mb-8 md:mb-12">
            <div className="bg-muted rounded-xl p-1 inline-flex">
              <button
                onClick={() => setActiveTab('guest')}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium transition-all duration-300 ${
                  activeTab === 'guest'
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Camera className="w-4 h-4 mr-2 inline" />
                Guest Photos
              </button>
              <button
                onClick={() => setActiveTab('hotel')}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium transition-all duration-300 ${
                  activeTab === 'hotel'
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MapPin className="w-4 h-4 mr-2 inline" />
                Our Hotel
              </button>
            </div>
          </div>

          {/* Photo Grid - Mobile Optimized */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {(activeTab === 'guest' ? guestPhotos : hotelPhotos).map((photo, index) => (
              <div
                key={index}
                className="group relative bg-card rounded-xl md:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Image */}
                <div className="aspect-square overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                    <p className="text-white text-xs md:text-sm font-medium mb-2">
                      {photo.caption}
                    </p>
                    
                    {activeTab === 'guest' && 'likes' in photo && 'guest' in photo && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-white/80">
                          <div className="flex items-center space-x-1">
                            <Heart className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="text-xs md:text-sm">{photo.likes as number}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="text-xs md:text-sm">{Math.floor((photo.likes as number) / 3)}</span>
                          </div>
                        </div>
                        <span className="text-xs text-white/60">by {photo.guest as string}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile - Always visible caption */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs font-medium">
                    {photo.caption}
                  </p>
                  {activeTab === 'guest' && 'likes' in photo && 'guest' in photo && (
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-2 text-white/80">
                        <Heart className="w-3 h-3" />
                        <span className="text-xs">{photo.likes as number}</span>
                      </div>
                      <span className="text-xs text-white/60">{photo.guest as string}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center mt-12 p-6 md:p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              Create Your Own Matheran Memories
            </h3>
            <p className="text-muted-foreground mb-6">
              Book your stay with us and add your own photos to this collection!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all">
                Book Your Stay
              </button>
              <button className="border border-primary text-primary px-6 py-3 rounded-xl font-semibold hover:bg-primary/10 transition-all flex items-center justify-center">
                <Share className="w-4 h-4 mr-2" />
                Share This
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MatheranMemories;