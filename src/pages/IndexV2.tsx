
import React from 'react';
import NavigationV2 from '../components/v2/NavigationV2';
import HeroSectionV2 from '../components/v2/HeroSectionV2';
import BrandStorySection from '../components/v2/BrandStorySection';
import ExperienceShowcase from '../components/v2/ExperienceShowcase';
import RoomsGallery from '../components/v2/RoomsGallery';
import TestimonialsWall from '../components/v2/TestimonialsWall';
import MatheranMoments from '../components/v2/MatheranMoments';
import FooterV2 from '../components/v2/FooterV2';
import FloatingElements from '../components/v2/FloatingElements';

const IndexV2 = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV2 />
      <HeroSectionV2 />
      <BrandStorySection />
      <ExperienceShowcase />
      <RoomsGallery />
      <TestimonialsWall />
      <MatheranMoments />
      <FooterV2 />
      <FloatingElements />
    </div>
  );
};

export default IndexV2;
