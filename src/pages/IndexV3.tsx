import React from 'react';
import NavigationV3 from '../components/v3/NavigationV3';
import HeroSectionV3 from '../components/v3/HeroSectionV3';
import ValueStorySection from '../components/v3/ValueStorySection';
import AffordableExperiences from '../components/v3/AffordableExperiences';
import ComfortRooms from '../components/v3/ComfortRooms';
import GuestTestimonials from '../components/v3/GuestTestimonials';
import MatheranMemories from '../components/v3/MatheranMemories';
import FooterV3 from '../components/v3/FooterV3';
import FloatingBooking from '../components/v3/FloatingBooking';

const IndexV3 = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV3 />
      <HeroSectionV3 />
      <ValueStorySection />
      <AffordableExperiences />
      <ComfortRooms />
      <GuestTestimonials />
      <MatheranMemories />
      <FooterV3 />
      <FloatingBooking />
    </div>
  );
};

export default IndexV3;