-- Add comprehensive English translations for all homepage components
INSERT INTO translations (language_code, section, key, value) VALUES
-- Welcome section - additional keys
('en', 'welcome', 'welcome.features.noiseEscape.title', 'Zero-noise hill station escape'),
('en', 'welcome', 'welcome.features.noiseEscape.description', 'Complete tranquility away from city chaos'),
('en', 'welcome', 'welcome.features.forestViews.title', 'Forest-backed views & soulfully curated stays'),
('en', 'welcome', 'welcome.features.forestViews.description', 'Panoramic vistas with thoughtful hospitality'),
('en', 'welcome', 'welcome.features.wholesome.title', 'Wholesome buffets, thoughtfully prepared to avoid waste'),
('en', 'welcome', 'welcome.features.wholesome.description', 'Sustainable dining with locally sourced ingredients'),
('en', 'welcome', 'welcome.stats.years', 'Years of Excellence'),
('en', 'welcome', 'welcome.stats.guests', 'Happy Guests'),
('en', 'welcome', 'welcome.stats.ecoFriendly', 'Eco-Friendly'),
('en', 'welcome', 'welcome.stats.rating', 'Guest Rating'),

-- Matheran section
('en', 'matheran', 'matheran.title', 'Why Matheran?'),
('en', 'matheran', 'matheran.description', 'India''s first eco-sensitive hill station offers a unique blend of heritage and nature, creating an unparalleled mountain escape experience.'),
('en', 'matheran', 'matheran.features.noVehicles.title', 'No Vehicles'),
('en', 'matheran', 'matheran.features.noVehicles.description', 'Car-free zone'),
('en', 'matheran', 'matheran.features.redEarth.title', 'Red Earth Trails'),
('en', 'matheran', 'matheran.features.redEarth.description', 'Ancient pathways'),
('en', 'matheran', 'matheran.features.horseRides.title', 'Horse Rides'),
('en', 'matheran', 'matheran.features.horseRides.description', 'Traditional transport'),
('en', 'matheran', 'matheran.features.toyTrain.title', 'Toy Train'),
('en', 'matheran', 'matheran.features.toyTrain.description', 'Heritage railway'),
('en', 'matheran', 'matheran.learnMore', 'Learn About Matheran'),

-- Stay section
('en', 'stay', 'stay.title', 'Your Perfect Stay'),
('en', 'stay', 'stay.titleHighlight', 'Awaits'),
('en', 'stay', 'stay.description', 'Thoughtfully designed accommodations that blend comfort with nature''s tranquility. Each room tells a story of comfort, elegance, and natural beauty - find accommodation that matches your mountain getaway dreams'),
('en', 'stay', 'stay.mostPopular', 'Most Popular'),
('en', 'stay', 'stay.startingFrom', 'Starting from'),
('en', 'stay', 'stay.perNight', '/night'),
('en', 'stay', 'stay.viewDetails', 'View Details'),
('en', 'stay', 'stay.undecided.title', 'Can''t decide? We''ll help you choose!'),
('en', 'stay', 'stay.undecided.description', 'Call us for personalized recommendations based on your needs and budget.'),
('en', 'stay', 'stay.undecided.call', 'Call: +91 98765 43210'),
('en', 'stay', 'stay.undecided.whatsapp', 'WhatsApp us'),
('en', 'stay', 'stay.undecided.viewAll', 'View All Accommodations'),

-- Additional experiences content
('en', 'experiences', 'experiences.explore', 'Explore'),
('en', 'experiences', 'experiences.premiumExperience', 'Premium Experience'),
('en', 'experiences', 'experiences.activities.title', 'Mountain Adventures'),
('en', 'experiences', 'experiences.activities.subtitle', 'Embrace the Wild'),
('en', 'experiences', 'experiences.activities.description', 'From horseback rides along red-earth trails to guided forest walks and heritage toy train journeys, discover Matheran''s natural wonders through curated adventures.'),
('en', 'experiences', 'experiences.dining.title', 'Culinary Excellence'),
('en', 'experiences', 'experiences.dining.subtitle', 'Buffet Only, Cooked with Purpose'),
('en', 'experiences', 'experiences.dining.description', 'Our zero-waste kitchen philosophy meets gourmet excellence. Savor locally-sourced ingredients transformed into memorable dining experiences with panoramic mountain views.'),
('en', 'experiences', 'experiences.wellness.title', 'Spa & Wellness'),
('en', 'experiences', 'experiences.wellness.subtitle', 'Rejuvenate Your Soul'),
('en', 'experiences', 'experiences.wellness.description', 'Ancient Ayurvedic traditions meet modern wellness techniques in our mountain spa. Experience therapeutic treatments designed to restore balance and vitality.'),

-- Additional reviews content  
('en', 'reviews', 'reviews.stats.averageRating', 'Average Rating'),
('en', 'reviews', 'reviews.stats.happyGuests', 'Happy Guests'),
('en', 'reviews', 'reviews.stats.wouldReturn', 'Would Return'),
('en', 'reviews', 'reviews.stats.startingPrice', 'Starting Price'),
('en', 'reviews', 'reviews.cta.title', 'Join Our Happy Guests'),
('en', 'reviews', 'reviews.cta.description', 'Continue to read more stories on TripAdvisor 4.8/5 and Google Reviews 4.9/5 or Book your stay today and create your own memorable experience in Matheran.'),
('en', 'reviews', 'reviews.cta.bookStay', 'Book Your Stay'),
('en', 'reviews', 'reviews.cta.viewAllReviews', 'View All Reviews')

ON CONFLICT (language_code, section, key) DO UPDATE SET 
value = EXCLUDED.value,
updated_at = now();