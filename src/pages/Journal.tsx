import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import SEO from '../components/SEO';
import { generateBreadcrumbSchema } from '../lib/seo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  category: string;
  featured_image?: string;
  publish_date: string;
  created_at: string;
}

const POSTS_PER_PAGE = 9;

const Journal = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  const categories = [
    { id: 'all', name: 'All Stories' },
    { id: 'travel-tips', name: 'Travel Tips' },
    { id: 'guest-stories', name: 'Guest Stories' },
    { id: 'spa-wellness', name: 'Spa & Wellness' },
    { id: 'discover-matheran', name: 'Discover Matheran' }
  ];

  useEffect(() => {
    loadPosts();
  }, [activeCategory, currentPage]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('blog_posts')
        .select('*', { count: 'exact' })
        .eq('is_published', true)
        .order('publish_date', { ascending: false });

      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE - 1);

      if (error) throw error;

      setPosts(data || []);
      setTotalPosts(count || 0);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const featuredPost = posts[0];
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: window.location.origin },
    { name: 'Journal', url: window.location.href }
  ]);

  return (
    <>
      <SEO
        title="Journal & Stories"
        description="Tales from the hills, wellness wisdom, and travel inspiration. Read our latest stories, guest experiences, and discover Matheran through our journal."
        keywords="Matheran blog, travel journal, guest stories, wellness tips, Matheran travel guide"
        schema={breadcrumbSchema}
      />
      
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
      {!loading && featuredPost && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-heading font-bold mb-8 text-foreground">Featured Story</h2>
            
            <Link to={`/journal/${featuredPost.slug}`}>
              <div className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="relative">
                    <img 
                      src={featuredPost.featured_image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                      alt={featuredPost.title}
                      className="w-full h-64 md:h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                        {format(new Date(featuredPost.publish_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-heading font-bold mb-4 text-foreground leading-tight group-hover:text-primary transition-colors">
                      {featuredPost.title}
                    </h3>
                    
                    <p className="text-muted-foreground font-body mb-6 leading-relaxed line-clamp-3">
                      {featuredPost.content}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        {featuredPost.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </Badge>
                      
                      <Button className="font-body">
                        Read More <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

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
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No posts found in this category.</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.slice(1).map((post) => (
                  <Link 
                    key={post.id} 
                    to={`/journal/${post.slug}`}
                    className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="relative">
                      <img 
                        src={post.featured_image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
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
                          {format(new Date(post.publish_date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-heading font-semibold mb-3 text-foreground leading-tight group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      
                      <p className="text-muted-foreground font-body text-sm mb-4 leading-relaxed line-clamp-2">
                        {post.content}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {post.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </Badge>
                        
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-12">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
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

        <DynamicFooter />
        <FloatingElementsV5 />
      </div>
    </>
  );
};

export default Journal;