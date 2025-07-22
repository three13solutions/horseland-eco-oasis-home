
import React from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import HeroSectionV5 from '../components/v5/HeroSectionV5';
import WelcomeAndMatheranV5 from '../components/v5/WelcomeAndMatheranV5';
import StayPreviewV5 from '../components/v5/StayPreviewV5';
import ExperiencesTeaserV5 from '../components/v5/ExperiencesTeaserV5';
import PackagesPreviewV5 from '../components/v5/PackagesPreviewV5';
import GuestReviewsV5 from '../components/v5/GuestReviewsV5';
import TrustedByV5 from '../components/v5/TrustedByV5';
import GalleryV5 from '../components/v5/GalleryV5';
import JournalPreviewV5 from '../components/v5/JournalPreviewV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';

const IndexV5 = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      <HeroSectionV5 />
      <WelcomeAndMatheranV5 />
      <StayPreviewV5 />
      <ExperiencesTeaserV5 />
      <PackagesPreviewV5 />
      <GuestReviewsV5 />
      <TrustedByV5 />
      <GalleryV5 />
      <JournalPreviewV5 />
      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default IndexV5;
