import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  category: string;
  featured_image?: string;
  meta_description?: string;
  publish_date: string;
}

const JournalPreviewV5 = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('publish_date', { ascending: false })
        .limit(2);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExcerpt = (content: string, metaDescription?: string) => {
    if (metaDescription) return metaDescription;
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.substring(0, 150) + '...';
  };

  const getReadTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
    return format(date, 'MMM dd, yyyy');
  };

  if (loading) {
    return (
      <section className="py-12 md:py-16 bg-muted/10">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-muted-foreground">Loading stories...</p>
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="py-12 md:py-16 bg-muted/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            From the <span className="text-primary">Journal</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Discover Matheran, Horseland through Stories, insights, and inspiration from our mountain sanctuary
          </p>
        </div>

        {/* Mobile: Vertical Stack */}
        <div className="md:hidden space-y-6">
          {posts.map((post) => (
            <article 
              key={post.id} 
              className="bg-background rounded-lg border border-border/50 overflow-hidden shadow-sm cursor-pointer"
              onClick={() => navigate(`/journal/${post.slug}`)}
            >
              <img
                src={post.featured_image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'}
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
                    {getReadTime(post.content)}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2 leading-tight">
                  {post.title}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {getExcerpt(post.content, post.meta_description)}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <User className="w-3 h-3 mr-1" />
                    {post.author} • {getRelativeDate(post.publish_date)}
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
            <article 
              key={post.id} 
              className="bg-background rounded-lg border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group cursor-pointer"
              onClick={() => navigate(`/journal/${post.slug}`)}
            >
              <div className="relative overflow-hidden">
                <img
                  src={post.featured_image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'}
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
                  {getReadTime(post.content)}
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {getExcerpt(post.content, post.meta_description)}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="w-4 h-4 mr-2" />
                    <span>{post.author} • {getRelativeDate(post.publish_date)}</span>
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
          <Button 
            variant="outline" 
            className="group"
            onClick={() => navigate('/journal')}
          >
            Explore All Stories
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default JournalPreviewV5;