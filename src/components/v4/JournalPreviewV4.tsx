import React from 'react';
import { ArrowRight, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const JournalPreviewV4 = () => {
  const posts = [
    {
      id: 1,
      title: "5 Morning Rituals to Start Your Mountain Day",
      excerpt: "Discover how our guests create meaningful mornings with sunrise yoga, forest walks, and mindful breakfast practices.",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
      category: "Wellness",
      readTime: "4 min read",
      author: "Maya Patel",
      date: "2 days ago"
    },
    {
      id: 2,
      title: "Guest Diary: A Corporate Team's Digital Detox",
      excerpt: "How a Bangalore tech team rediscovered collaboration and creativity during their three-day mountain retreat.",
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
      category: "Guest Stories",
      readTime: "6 min read",
      author: "Team Lead",
      date: "1 week ago"
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-muted/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4">
            From the <span className="text-primary">Journal</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stories, insights, and inspiration from our mountain sanctuary and the guests who find peace here
          </p>
        </div>

        {/* Mobile: Vertical Stack */}
        <div className="md:hidden space-y-6">
          {posts.map((post) => (
            <article key={post.id} className="bg-background rounded-lg border border-border/50 overflow-hidden shadow-sm">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {post.category}
                  </span>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 mr-1" />
                    {post.readTime}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">
                  {post.title}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {post.excerpt}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <User className="w-3 h-3 mr-1" />
                    {post.author} • {post.date}
                  </div>
                  <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80">
                    Read More
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Desktop: Side by Side */}
        <div className="hidden md:grid grid-cols-2 gap-8">
          {posts.map((post) => (
            <article key={post.id} className="bg-background rounded-lg border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group">
              <div className="relative overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 left-4">
                  <span className="text-xs bg-background/90 backdrop-blur-sm text-primary px-3 py-1 rounded-full">
                    {post.category}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center text-xs text-muted-foreground mb-3">
                  <Clock className="w-3 h-3 mr-1" />
                  {post.readTime}
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {post.excerpt}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="w-4 h-4 mr-2" />
                    <span>{post.author} • {post.date}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80 group">
                    Read More
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* All Posts Link */}
        <div className="text-center mt-10">
          <Button variant="outline" className="group">
            Explore All Stories
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default JournalPreviewV4;