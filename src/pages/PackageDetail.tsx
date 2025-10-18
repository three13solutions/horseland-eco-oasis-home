import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationV5 from '@/components/v5/NavigationV5';
import DynamicFooter from '@/components/DynamicFooter';
import CombinedFloatingV5 from '@/components/v5/CombinedFloatingV5';
import MediaAsset from '@/components/MediaAsset';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Clock, Users, Check, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

const PackageDetail = () => {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackageDetail();
  }, [packageId]);

  const loadPackageDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setPackageData(data);
    } catch (error) {
      console.error('Error loading package:', error);
      navigate('/packages');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationV5 />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading package details...</p>
          </div>
        </div>
        <DynamicFooter />
      </div>
    );
  }

  if (!packageData) {
    return null;
  }

  const galleryImages = packageData.gallery_keys || packageData.gallery || [];

  return (
    <>
      <SEO 
        title={`${packageData.title} - Packages`}
        description={packageData.description || packageData.subtitle}
        ogImage={packageData.featured_image || packageData.banner_image}
      />
      
      <div className="min-h-screen bg-background">
        <NavigationV5 />
        
        {/* Hero Section with Gallery */}
        <section className="relative">
          {galleryImages.length > 0 ? (
            <div className="max-w-7xl mx-auto px-4 py-8">
              <Carousel className="w-full">
                <CarouselContent>
                  {galleryImages.map((imageKey: string, index: number) => (
                    <CarouselItem key={index}>
                      <div className="relative h-[500px] rounded-xl overflow-hidden">
                        <MediaAsset
                          hardcodedKey={imageKey}
                          fallbackUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4"
                          alt={`${packageData.title} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </Carousel>
            </div>
          ) : (
            <div className="relative h-[500px]">
              <MediaAsset
                hardcodedKey={packageData.featured_image_key || packageData.banner_image_key || ''}
                fallbackUrl={packageData.featured_image || packageData.banner_image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'}
                alt={packageData.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
          )}
        </section>

        {/* Package Details */}
        <section className="py-12">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    {packageData.is_featured && (
                      <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                    )}
                    <Badge variant="secondary">{packageData.package_type}</Badge>
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
                    {packageData.title}
                  </h1>
                  
                  {packageData.subtitle && (
                    <p className="text-xl text-muted-foreground mb-6">
                      {packageData.subtitle}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 mb-6">
                    {packageData.duration_days && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-5 w-5" />
                        <span>{packageData.duration_days} Days</span>
                      </div>
                    )}
                    {packageData.max_guests && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-5 w-5" />
                        <span>Max {packageData.max_guests} Guests</span>
                      </div>
                    )}
                  </div>

                  <p className="text-lg leading-relaxed text-muted-foreground">
                    {packageData.description}
                  </p>
                </div>

                {/* Inclusions */}
                {packageData.inclusions && packageData.inclusions.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-2xl font-heading font-bold mb-4">What's Included</h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {packageData.inclusions.map((inclusion: string, index: number) => (
                          <div key={index} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{inclusion}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* FAQs */}
                {packageData.faqs && packageData.faqs.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-2xl font-heading font-bold mb-4">Frequently Asked Questions</h3>
                      <div className="space-y-4">
                        {packageData.faqs.map((faq: any, index: number) => (
                          <div key={index}>
                            <h4 className="font-semibold mb-2">{faq.question}</h4>
                            <p className="text-muted-foreground">{faq.answer}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Booking Card */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24 border-primary/20">
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Starting from</div>
                      <div className="text-3xl font-bold text-primary">
                        ₹{packageData.weekday_price?.toLocaleString()}
                      </div>
                      {packageData.weekend_price && packageData.weekend_price !== packageData.weekday_price && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Weekend: ₹{packageData.weekend_price?.toLocaleString()}
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground mt-1">per package</div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {packageData.duration_days} Days / {packageData.duration_days - 1} Nights
                        </span>
                      </div>
                      {packageData.max_guests && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Up to {packageData.max_guests} guests
                          </span>
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => navigate(`/booking?packageId=${packageData.id}`)}
                    >
                      Book This Package
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/contact')}
                    >
                      Contact for Custom Package
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Questions? Our team is here to help customize your perfect getaway.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <DynamicFooter />
        <CombinedFloatingV5 />
      </div>
    </>
  );
};

export default PackageDetail;
