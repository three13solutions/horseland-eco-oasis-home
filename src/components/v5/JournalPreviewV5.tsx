import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar } from 'lucide-react';

const JournalPreviewV5 = () => {
  const posts = [
    {
      title: "5 Wellness Rituals to Practice in the Mountains",
      excerpt: "Discover ancient practices that connect mind, body, and nature in the serene environment of Matheran's hills...",
      image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&h=300&fit=crop",
      date: "Dec 15, 2024",
      category: "Wellness"
    },
    {
      title: "A Guest's Journey: Finding Peace in Matheran",
      excerpt: "Read Priya's heartfelt account of her solo retreat and how the mountain silence transformed her perspective on life...",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop",
      date: "Dec 12, 2024",
      category: "Guest Stories"
    }
  ];

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            From the <span className="text-primary">Journal</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stories, insights, and inspiration from our mountain sanctuary
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {posts.map((post, index) => (
            <article 
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border/20 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className="relative">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                  {post.category}
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center text-muted-foreground text-sm mb-3">
                  <Calendar className="w-4 h-4 mr-2" />
                  {post.date}
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-3 leading-tight">
                  {post.title}
                </h3>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {post.excerpt}
                </p>
                
                <Button 
                  variant="outline" 
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  Read More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transform hover:scale-105 transition-all duration-300">
            Visit Our Journal
          </Button>
        </div>
      </div>
    </section>
  );
};

export default JournalPreviewV5;