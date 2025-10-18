import React from 'react';
import SEO from '../components/SEO';
import NavigationV5 from '../components/v5/NavigationV5';
import HeroSectionV5 from '../components/v5/HeroSectionV5';
import WelcomeAndMatheranV5 from '../components/v5/WelcomeAndMatheranV5';
import StayPreviewV5 from '../components/v5/StayPreviewV5';
import ExperiencesTeaserV5 from '../components/v5/ExperiencesTeaserV5';
import PackagesPreviewV5 from '../components/v5/PackagesPreviewV5';
import GuestReviewsV5 from '../components/v5/GuestReviewsV5';

import GalleryV5 from '../components/v5/GalleryV5';
import JournalPreviewV5 from '../components/v5/JournalPreviewV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import { generateHotelSchema } from '../lib/seo';

const IndexV5 = () => {
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
        <NavigationV5 />
        <HeroSectionV5 />
        <WelcomeAndMatheranV5 />
        <StayPreviewV5 />
        {/* <ExperiencesTeaserV5 /> */}
        {/* <PackagesPreviewV5 /> */}
        <GuestReviewsV5 />
        
        <GalleryV5 />
        <JournalPreviewV5 />
        <DynamicFooter />
        <CombinedFloatingV5 />
      </div>
    </>
  );
};

export default IndexV5;
