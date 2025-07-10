
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Heart, MapPin, ArrowRight } from 'lucide-react';

interface OfficialPhoto {
  url: string;
  caption: string;
}

interface GuestPhoto {
  url: string;
  caption: string;
  likes: number;
}

const MatheranMoments = () => {
  const [activeTab, setActiveTab] = useState('official');

  const officialPhotos: OfficialPhoto[] = [
    { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop', caption: 'Sunrise at Echo Point' },
    { url: 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=400&fit=crop', caption: 'Mountain Spa Experience' },
    { url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=400&fit=crop', caption: 'Forest Trail Adventures' },
    { url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&h=400&fit=crop', caption: 'Heritage Toy Train' },
    { url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&h=400&fit=crop', caption: 'Valley View Suite' },
    { url: 'https://images.unsplash.com/photo-1615729947596-a598e5de0ab3?w=400&h=400&fit=crop', caption: 'Horse Riding Trails' },
    { url: 'https://images.unsplash.com/photo-1439886183900-e79ec0057170?w=400&h=400&fit=crop', caption: 'Dining with Views' },
    { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=400&fit=crop', caption: 'Monsoon Magic' },
    { url: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&h=400&fit=crop', caption: 'Wildlife Encounters' }
  ];

  const guestPhotos: GuestPhoto[] = [
    { url: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&h=400&fit=crop', caption: '@anjali_travels', likes: 234 },
    { url: 'https://images.unsplash.com/photo-1439886183900-e79ec0057170?w=400&h=400&fit=crop', caption: '@wanderlust_couple', likes: 189 },
    { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=400&fit=crop', caption: '@mountain_seeker', likes: 156 },
    { url: 'https://images.unsplash.com/photo-1615729947596-a598e5de0ab3?w=400&h=400&fit=crop', caption: '@nature_lover_in', likes: 298 },
    { url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&h=400&fit=crop', caption: '@spa_enthusiast', likes: 167 },
    { url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&h=400&fit=crop', caption: '@eco_traveler', likes: 203 },
    { url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=400&fit=crop', caption: '@adventure_duo', likes: 178 },
    { url: 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=400&fit=crop', caption: '@horseland_fan', likes: 245 },
    { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop', caption: '@sunrise_chaser', likes: 267 }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Matheran
            <span className="block text-primary italic">Moments</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Discover the beauty through our lens and our guests' unforgettable captures
          </p>
          
          {/* Tab Switcher */}
          <div className="inline-flex bg-muted/50 rounded-full p-2 mb-8">
            <button
              onClick={() => setActiveTab('official')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 ${
                activeTab === 'official'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span className="font-medium">Official Gallery</span>
            </button>
            <button
              onClick={() => setActiveTab('guest')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 ${
                activeTab === 'guest'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart className="w-5 h-5" />
              <span className="font-medium">Guest Stories</span>
            </button>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {activeTab === 'official' ? (
            officialPhotos.map((photo, index) => (
              <div
                key={index}
                className="group relative aspect-square overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">{photo.caption}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            guestPhotos.map((photo, index) => (
              <div
                key={index}
                className="group relative aspect-square overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-medium">{photo.caption}</span>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4 text-red-400 fill-current" />
                          <span className="text-white text-sm">{photo.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Instagram CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Share Your Horseland Moments
            </h3>
            <p className="text-muted-foreground mb-6">
              Tag us @horselandresort and use #MatheranMoments to be featured in our gallery
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                <Camera className="w-4 h-4 mr-2" />
                View Full Gallery
              </Button>
              <Button variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                Follow @horselandresort
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MatheranMoments;
