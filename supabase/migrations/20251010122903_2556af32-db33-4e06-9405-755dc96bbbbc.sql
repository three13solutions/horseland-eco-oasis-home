-- Populate blog_posts table with initial content (using correct underscore categories)
INSERT INTO blog_posts (
  title,
  slug,
  content,
  author,
  category,
  featured_image,
  is_published,
  publish_date,
  meta_title,
  meta_description
) VALUES
(
  '5 Morning Rituals to Start Your Mountain Day',
  '5-morning-rituals-mountain-day',
  E'# Wake Up to the Mountains\n\nThe mountains have a way of teaching us to slow down and appreciate life\'s simple pleasures. At Horseland Mountain Resort, we\'ve observed our guests develop beautiful morning rituals that transform their stay into something truly special.\n\n## 1. Sunrise Meditation on the Terrace\n\nThere\'s something magical about watching the first rays of light paint the mountain peaks. Our terrace offers the perfect sanctuary for morning meditation. The crisp mountain air, the chorus of birds, and the gentle mist create an atmosphere that naturally quiets the mind.\n\n**Try this**: Set your alarm 30 minutes before sunrise. Bring a shawl, sit comfortably, and simply observe the world waking up around you.\n\n## 2. Forest Walk Before Breakfast\n\nMatheran\'s pathways are especially serene in the early morning. The forest is alive with activity - squirrels playing in the trees, birds calling to each other, and the soft rustle of leaves in the breeze.\n\n**Our favorite route**: The Charlotte Lake path offers stunning views and takes about 45 minutes at a leisurely pace.\n\n## 3. Stretching with a View\n\nMany guests tell us they practice yoga differently here - not as exercise, but as a conversation with nature. Our garden provides the perfect space for gentle stretches while breathing in the pure mountain air.\n\n## 4. Tea Time with Mindfulness\n\nWe serve traditional chai made with local spices on our terrace every morning. Guests often share that this simple act of savoring tea while gazing at the mountains has become their most cherished ritual.\n\n## 5. Journaling Your Mountain Thoughts\n\nKeep a journal by your bedside. Those early morning thoughts, when the mind is fresh and the mountains are quiet, often contain profound insights about life and yourself.\n\n---\n\n*"The mountains are calling and I must go." - John Muir*\n\nThese rituals aren\'t about perfection - they\'re about creating space for yourself in the midst of natural beauty. Start with one that resonates with you, and let your own mountain morning ritual evolve naturally.',
  'Maya Patel',
  'spa_wellness',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  true,
  NOW() - INTERVAL '2 days',
  '5 Morning Rituals to Start Your Mountain Day | Horseland Mountain Resort',
  'Discover how our guests create meaningful mornings with sunrise yoga, forest walks, and mindful breakfast practices at Matheran.'
),
(
  'Guest Diary: A Corporate Team''s Digital Detox',
  'corporate-team-digital-detox',
  E'# Disconnecting to Reconnect\n\n*Written by Rahul Sharma, Team Lead at a Bangalore Tech Startup*\n\n## The Challenge\n\nOur team of twelve had been working remotely for two years. While we were productive, something was missing - that spark of spontaneous collaboration, the casual conversations that lead to breakthrough ideas, and most importantly, genuine human connection.\n\n## The Proposal\n\nWhen I suggested a three-day retreat to Matheran with a complete digital detox, the reactions were mixed. "No internet?" "What will we do?" But everyone agreed to give it a try.\n\n## Day 1: The Awkward Beginning\n\nThe first few hours were tough. People kept reaching for phones that weren\'t there. Conversations felt forced. But something shifted during the evening campfire. Without screens to hide behind, we started talking - really talking.\n\nPriya shared her dream of becoming a writer. Aditya talked about his pottery hobby. We learned about each other as people, not just colleagues.\n\n## Day 2: The Breakthrough\n\nMorning forest walks became brainstorming sessions. Away from our usual meeting rooms and video calls, ideas flowed freely. We sketched concepts on paper, used pebbles to represent user flows, and actually listened to each other without the urge to check notifications.\n\nThe spa session in the afternoon wasn\'t just relaxation - it became a masterclass in being present. Our usual lunch meetings transformed into leisurely meals where we noticed the food, the conversations, and the mountain views.\n\n## Day 3: The Transformation\n\nBy the final day, something remarkable had happened. We weren\'t just a team working together - we were a community that genuinely cared about each other. The creative sessions produced three product ideas that we\'re now actually implementing.\n\n## The Return\n\nBack in Bangalore, we made changes:\n- No-notification Thursdays\n- Walking meetings once a week  \n- Mandatory lunch breaks away from desks\n- Monthly one-on-one coffee chats (about life, not work)\n\n## The Lesson\n\nTechnology is powerful, but it can\'t replace the magic of sitting together under the stars, sharing stories, and remembering that behind every work email is a human being with dreams, fears, and stories to tell.\n\nThe mountains didn\'t just give us a break from screens - they gave us back to ourselves and to each other.',
  'Rahul Sharma',
  'guest_stories',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  true,
  NOW() - INTERVAL '1 week',
  'Corporate Team Digital Detox Experience | Guest Story',
  'How a Bangalore tech team rediscovered collaboration and creativity during their three-day digital detox mountain retreat at Matheran.'
),
(
  'The Complete Guide to Monsoon Magic in Matheran',
  'monsoon-magic-matheran-guide',
  E'# When the Mountains Come Alive\n\nIf you\'ve only experienced Matheran during the dry season, you\'ve seen only half its beauty. The monsoon transforms this hill station into an emerald paradise, where waterfalls cascade down every cliff and mist dances through the valleys.\n\n## Why Visit During Monsoon?\n\n### The Landscape Transforms\n- Valleys turn vibrant green\n- Waterfalls appear where none existed before  \n- Cloud formations create mystical landscapes\n- The air is incredibly fresh and pure\n\n### Fewer Crowds\nUnlike the summer rush, monsoon visitors get to experience Matheran\'s peaceful side. The paths are yours to explore, viewpoints become private sanctuaries, and the town returns to its tranquil essence.\n\n## Must-Do Monsoon Experiences\n\n### 1. Waterfall Walks\nThe Louisa Point trail becomes a waterfall gallery during monsoon. Countless streams cascade down the red laterite cliffs, creating a symphony of water sounds.\n\n### 2. Misty Morning Horse Rides\nOur horse rides take on a mystical quality when the mist rolls in. The familiar paths become enchanted trails, and every turn reveals new surprises.\n\n### 3. Cloud Watching from Panorama Point\nDuring monsoon, you don\'t just see clouds from afar - you become part of them. Watch as they flow through the valleys, engulf the mountains, and sometimes sweep right past you.',
  'Vikram Desai',
  'discover_matheran',
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  true,
  NOW() - INTERVAL '2 weeks',
  'Complete Guide to Monsoon in Matheran | Best Time to Visit',
  'Discover why monsoon is the most magical season in Matheran. Complete guide to waterfalls, mist, and mountain magic.'
),
(
  '10 Essential Travel Tips for Your First Matheran Trip',
  'first-time-matheran-travel-tips',
  E'# Planning Your First Matheran Adventure\n\nMatheran is unlike anywhere else in India - it\'s Asia\'s only automobile-free hill station. This makes it wonderfully peaceful but also means you need to plan differently.\n\n## Getting There\n\n### By Train (Most Popular)\nThe Neral to Matheran Toy Train climbs through 281 curves and 5 tunnels. Book early - it\'s popular!\n- Journey time: 2.5 hours\n- Best seats: Window seats on the left going up\n- Pro tip: Morning trains offer better views\n\n## When to Visit\n\n### Peak Season (Oct-May)\n- Perfect weather\n- All viewpoints accessible\n- Higher prices, more crowds\n- Book accommodation in advance\n\n### Monsoon (Jun-Sep)\n- Lush green landscapes\n- Fewer tourists\n- Special charm of misty mountains\n\n## What to Pack\n\n### Essentials\n- Comfortable walking shoes\n- Light woolens (evenings can be cool)\n- Sunscreen and hat\n- Reusable water bottle\n- Cash (limited ATM options)\n\n## Final Pro Tips\n\n1. **Book ahead**: Especially for weekends\n2. **Start early**: Best light, fewer crowds\n3. **Walk don\'t rush**: Matheran rewards slow exploration\n4. **Talk to locals**: They know hidden gems\n5. **Carry a jacket**: Even in summer, evenings are cool',
  'Priya Menon',
  'travel_tips',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  true,
  NOW() - INTERVAL '3 weeks',
  '10 Essential Travel Tips for Your First Matheran Trip | Complete Guide',
  'Planning your first trip to Matheran? Complete guide covering transport, packing, budget, and insider tips for a perfect mountain getaway.'
);