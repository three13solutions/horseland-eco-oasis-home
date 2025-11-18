import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Heart, MapPin, Eye, ArrowRight, Share, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const GalleryV5 = () => {
  const [activeTab, setActiveTab] = useState('hotel');
  const [galleryImages, setGalleryImages] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch gallery images from database
  useEffect(() => {
    fetchGalleryImages();
  }, []);

  const fetchGalleryImages = async () => {
    try {
      setLoading(true);
      
      // Fetch images from specific gallery categories
      const { data: hotelData, error: hotelError } = await supabase
        .from('image_categories')
        .select(`
          image_id,
          gallery_images!inner(
            id,
            title,
            image_url,
            caption,
            location,
            likes_count,
            guest_handle,
            guest_name,
            sort_order,
            alt_text
          ),
          gallery_categories!inner(slug, name)
        `)
        .eq('gallery_categories.slug', 'hotel-photos')
        .order('gallery_images(sort_order)', { ascending: true });

      const { data: guestData, error: guestError } = await supabase
        .from('image_categories')
        .select(`
          image_id,
          gallery_images!inner(
            id,
            title,
            image_url,
            caption,
            location,
            likes_count,
            guest_handle,
            guest_name,
            sort_order,
            alt_text
          ),
          gallery_categories!inner(slug, name)
        `)
        .eq('gallery_categories.slug', 'guest-photos')
        .order('gallery_images(sort_order)', { ascending: true });
      
      if (hotelError || guestError) {
        console.error('Error fetching gallery images:', hotelError || guestError);
        setGalleryImages([]);
      } else {
        // Transform data to match expected format
        const transformedHotel = (hotelData || []).map(item => ({
          ...item.gallery_images,
          gallery_categories: item.gallery_categories
        }));
        
        const transformedGuests = (guestData || []).map(item => ({
          ...item.gallery_images,
          gallery_categories: item.gallery_categories
        }));
        
        setGalleryImages([...transformedHotel, ...transformedGuests]);
      }
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      setGalleryImages([]);
    } finally {
      setLoading(false);
    }
  };


  // Filter images based on active tab
  const currentImages = galleryImages.filter(img => {
    const categorySlug = img.gallery_categories?.slug;
    if (activeTab === 'hotel') {
      return categorySlug === 'hotel-photos';
    } else if (activeTab === 'guests') {
      return categorySlug === 'guest-photos';
    }
    return false;
  }).slice(0, 16);

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  const navigateImage = (direction) => {
    if (direction === 'next') {
      setSelectedImageIndex((prev) => (prev + 1) % currentImages.length);
    } else {
      setSelectedImageIndex((prev) => (prev - 1 + currentImages.length) % currentImages.length);
    }
  };

  const openInstagram = () => {
    window.open('https://www.instagram.com/horseland_matheran/', '_blank');
  };

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

        {/* 4x4 Gallery Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {currentImages.map((image, index) => (
            <div
              key={image.id || index}
              className="group relative overflow-hidden rounded-lg cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              onClick={() => handleImageClick(index)}
            >
              <div className="w-full aspect-video overflow-hidden">
                <img
                  src={image.image_url}
                  alt={image.caption || image.title}
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              
              {/* Overlay with info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 right-4">
                  {activeTab === 'hotel' ? (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-white" />
                        <span className="text-white text-sm font-medium">{image.caption}</span>
                      </div>
                      <span className="text-white/80 text-xs">{image.location}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-white text-sm font-medium">{image.caption}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80 text-xs">{image.guest_handle}</span>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4 text-red-400 fill-current" />
                          <span className="text-white text-sm">{image.likes_count}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Eye icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-none w-screen h-screen p-0 m-0 bg-transparent backdrop-blur-xl border-none shadow-none [&>button]:hidden" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, transform: 'none' }}>
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 z-50 p-3 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Previous button */}
              <button
                onClick={() => navigateImage('prev')}
                className="absolute left-4 z-50 p-3 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Next button */}
              <button
                onClick={() => navigateImage('next')}
                className="absolute right-4 z-50 p-3 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Image with fixed aspect ratio */}
              {currentImages[selectedImageIndex] && (
                <div className="relative w-full max-w-5xl px-20">
                  <div className="aspect-video w-full">
                    <img
                      src={currentImages[selectedImageIndex].image_url}
                      alt={currentImages[selectedImageIndex].caption}
                      className="w-full h-full object-cover rounded-lg shadow-2xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Your Horseland Moments - V2 style with V3 buttons */}
        <div className="text-center mt-12 p-6 md:p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
            Share Your Horseland Moments
          </h3>
          <p className="text-muted-foreground mb-6">
            Tag us @horselandresort and use #MatheranMoments to be featured in our gallery
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => {
                setSelectedImageIndex(0);
                setLightboxOpen(true);
              }}
              className="bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center"
            >
              <Camera className="w-4 h-4 mr-2" />
              View Full Gallery
            </button>
            <button 
              onClick={openInstagram}
              className="border border-primary text-primary px-6 py-3 rounded-xl font-semibold hover:bg-primary/10 transition-all flex items-center justify-center"
            >
              Follow @horseland_matheran
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GalleryV5;