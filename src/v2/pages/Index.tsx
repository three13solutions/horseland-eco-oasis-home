import React from 'react';
import SEO from '@/components/SEO';
import Navigation from '@/v2/components/Navigation';
import HeroSection from '@/v2/components/HeroSection';
import WelcomeAndMatheran from '@/v2/components/WelcomeAndMatheran';
import StayPreview from '@/v2/components/StayPreview';
import ExperiencesTeaser from '@/v2/components/ExperiencesTeaser';
import PackagesPreview from '@/v2/components/PackagesPreview';
import GuestReviews from '@/v2/components/GuestReviews';

import Gallery from '@/v2/components/Gallery';
import JournalPreview from '@/v2/components/JournalPreview';
import DynamicFooter from '@/v2/components/DynamicFooter';
import CombinedFloating from '@/v2/components/CombinedFloating';
import { generateHotelSchema } from '@/lib/seo';

const Index = () => {
  const hotelSchema = generateHotelSchema({
    name: "Horseland Eco Oasis",
    description: "Experience sustainable luxury at Horseland Eco Oasis in Matheran. An eco-friendly resort offering comfortable stays, authentic experiences, and breathtaking mountain views.",
    address: {
      street: "Matheran Hill Station",
      city: "Matheran",
      state: "Maharashtra",
      postalCode: "410102",
      country: "India"
    },
    priceRange: "₹₹",
    imageUrl: "/lovable-uploads/11ec8802-2ca9-4b77-bfc6-a8c0e23527e4.png",
    url: typeof window !== 'undefined' ? window.location.origin : ''
  });

  return (
    <>
      <SEO 
        title="Home"
        description="Experience sustainable luxury at Horseland Eco Oasis in Matheran. Book your eco-friendly stay with comfortable rooms, authentic experiences, and breathtaking mountain views."
        keywords="Matheran hotel, eco resort, sustainable luxury, Matheran accommodation, hill station resort, eco-friendly stay"
        schema={hotelSchema}
      />
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Navigation />
        <HeroSection />
        <WelcomeAndMatheran />
        <StayPreview />
        {/* <ExperiencesTeaser /> */}
        {/* <PackagesPreview /> */}
        <GuestReviews />
        
        <Gallery />
        <JournalPreview />
        <DynamicFooter />
        <CombinedFloating />
      </div>
    </>
  );
};

export default Index;
