import React, { useState } from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import FooterV5 from '../components/v5/FooterV5';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowRight } from 'lucide-react';

const Journal = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Stories' },
    { id: 'travel-tips', name: 'Travel Tips' },
    { id: 'guest-stories', name: 'Guest Stories' },
    { id: 'spa-wellness', name: 'Spa & Wellness' },
    { id: 'discover-matheran', name: 'Discover Matheran' }
  ];

  const posts = [
    {
      id: 'red-mud-trails',
      title: 'Walking the Red Mud Trails: A Photographer\'s Journey',
      category: 'discover-matheran',
      author: 'Rhea Sharma',
      date: 'March 15, 2024',
      readTime: '5 min read',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      excerpt: 'Discover the unique red mud trails of Matheran through the lens of a professional photographer, capturing the essence of this vehicle-free hill station.',
      tags: ['Photography', 'Nature', 'Trails']
    },
    {
      id: 'ayurvedic-wellness',
      title: 'The Ancient Science of Ayurveda in Modern Mountain Spa',
      category: 'spa-wellness',
      author: 'Dr. Priya Nair',
      date: 'March 12, 2024',
      readTime: '7 min read',
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      excerpt: 'How traditional Ayurvedic practices blend seamlessly with contemporary wellness techniques in our mountain spa setting.',
      tags: ['Ayurveda', 'Wellness', 'Spa']
    },
    {
      id: 'family-bonding',
      title: 'A Family\'s First Visit: Creating Memories That Last',
      category: 'guest-stories',
      author: 'The Kulkarni Family',
      date: 'March 10, 2024',
      readTime: '4 min read',
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      excerpt: 'A heartwarming account of a Mumbai family\'s first mountain getaway and how Horseland became their annual tradition.',
      tags: ['Family', 'Memories', 'Tradition']
    },
    {
      id: 'packing-guide',
      title: 'Essential Packing Guide for Your Hill Station Getaway',
      category: 'travel-tips',
      author: 'Travel Desk',
      date: 'March 8, 2024',
      readTime: '6 min read',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      excerpt: 'A comprehensive guide on what to pack for your mountain retreat, considering weather, activities, and local customs.',
      tags: ['Packing', 'Tips', 'Travel']
    },
    {
      id: 'monsoon-magic',
      title: 'Monsoon Magic: Why Matheran Transforms in the Rains',
      category: 'discover-matheran',
      author: 'Naturalist Guide Team',
      date: 'March 5, 2024',
      readTime: '8 min read',
      image: 'https://images.unsplash.com/photo-1500673922987-e212871fec22?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      excerpt: 'Experience the dramatic transformation of Matheran during monsoon season, when waterfalls cascade and forests come alive.',
      tags: ['Monsoon', 'Nature', 'Seasons']
    },
    {
      id: 'digital-detox',
      title: 'The Art of Digital Detox: Disconnecting to Reconnect',
      category: 'spa-wellness',
      author: 'Wellness Team',
      date: 'March 2, 2024',
      readTime: '5 min read',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      excerpt: 'Learn how stepping away from digital devices during your mountain retreat can lead to profound personal transformation.',
      tags: ['Digital Detox', 'Mindfulness', 'Wellness']
    }
  ];

  const filteredPosts = activeCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === activeCategory);

  const featuredPost = posts[0];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')"
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Mountain Stories & Insights
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            Tales from the hills, wellness wisdom, and travel inspiration
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-heading font-bold mb-8 text-foreground">Featured Story</h2>
          
          <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative">
                <img 
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  className="w-full h-64 md:h-full object-cover"
                />
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                  Featured
                </Badge>
              </div>
              
              <div className="p-8 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {featuredPost.author}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {featuredPost.date}
                  </div>
                  <span>{featuredPost.readTime}</span>
                </div>
                
                <h3 className="text-2xl md:text-3xl font-heading font-bold mb-4 text-foreground leading-tight">
                  {featuredPost.title}
                </h3>
                
                <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {featuredPost.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <Button className="font-body">
                    Read More <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'outline'}
                onClick={() => setActiveCategory(category.id)}
                className="font-body"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.slice(1).map((post) => (
              <article key={post.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="relative">
                  <img 
                    src={post.image}
                    alt={post.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-heading font-semibold mb-3 text-foreground leading-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="text-muted-foreground font-body text-sm mb-4 leading-relaxed">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {post.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{post.readTime}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
            Stay Updated
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-8">
            Subscribe to our journal for the latest stories, travel tips, and mountain insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border rounded-lg font-body focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button className="font-body">
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      <FooterV5 />
      <FloatingElementsV5 />
    </div>
  );
};

export default Journal;