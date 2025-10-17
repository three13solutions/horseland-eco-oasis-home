import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import MediaAsset from '@/components/MediaAsset';
import SEO from '../components/SEO';
import { generateArticleSchema, generateBreadcrumbSchema } from '../lib/seo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowLeft, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { format } from 'date-fns';
import { useContentTranslation } from '@/hooks/useContentTranslation';
import { useTranslation } from 'react-i18next';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  category: string;
  featured_image?: string;
  featured_image_key?: string;
  meta_title?: string;
  meta_description?: string;
  publish_date: string;
  created_at: string;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { i18n } = useTranslation();
  const { getTranslation } = useContentTranslation('blog');
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadPost();
    }
  }, [slug]);

  const loadPost = async () => {
    try {
      // Load the post
      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (postError) throw postError;
      
      if (!postData) {
        setPost(null);
        setLoading(false);
        return;
      }

      setPost(postData);

      // Load related posts (same category, excluding current post)
      const { data: relatedData, error: relatedError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('category', postData.category)
        .eq('is_published', true)
        .neq('id', postData.id)
        .order('publish_date', { ascending: false })
        .limit(3);

      if (relatedError) throw relatedError;
      setRelatedPosts(relatedData || []);

    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = post?.title || '';
    
    const shareUrls: { [key: string]: string } = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationV5 />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">The blog post you're looking for doesn't exist.</p>
          <Link to="/journal">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Journal
            </Button>
          </Link>
        </div>
        <DynamicFooter />
      </div>
    );
  }

  // Get translated content
  const translatedTitle = getTranslation(`blog.${post.slug}.title`, post.title);
  const translatedContent = getTranslation(`blog.${post.slug}.content`, post.content);
  const translatedMetaTitle = getTranslation(`blog.${post.slug}.meta_title`, post.meta_title || post.title);
  const translatedMetaDescription = getTranslation(`blog.${post.slug}.meta_description`, post.meta_description || post.content.substring(0, 160));

  const articleSchema = generateArticleSchema({
    title: translatedMetaTitle,
    description: translatedMetaDescription,
    author: post.author,
    publishedDate: post.publish_date,
    modifiedDate: post.created_at,
    imageUrl: post.featured_image || '/lovable-uploads/11ec8802-2ca9-4b77-bfc6-a8c0e23527e4.png',
    url: window.location.href
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: window.location.origin },
    { name: 'Journal', url: `${window.location.origin}/journal` },
    { name: translatedTitle, url: window.location.href }
  ]);

  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [articleSchema, breadcrumbSchema]
  };

  return (
    <>
      <SEO
        title={translatedMetaTitle}
        description={translatedMetaDescription}
        ogImage={post.featured_image}
        canonicalUrl={window.location.href}
        schema={combinedSchema}
        type="article"
        publishedTime={post.publish_date}
        author={post.author}
      />
      
      <div className="min-h-screen bg-background">
        <NavigationV5 />
        
        {/* Hero Banner */}
        {post.featured_image && (
          <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
            <MediaAsset
              hardcodedKey={post.featured_image_key || ''}
              fallbackUrl={post.featured_image}
              alt={translatedTitle}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
            
            <div className="relative z-10 h-full flex items-end pb-16">
              <div className="max-w-4xl mx-auto px-4 w-full">
                <Badge className="mb-4">
                  {post.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Badge>
                <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-4 leading-tight">
                  {translatedTitle}
                </h1>
                <div className="flex items-center gap-6 text-white/90">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(post.publish_date), 'MMMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Breadcrumbs */}
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link to="/journal" className="hover:text-foreground">Journal</Link>
            <span>/</span>
            <span className="text-foreground">{translatedTitle}</span>
          </div>
        </div>

        {/* Article Header */}
        <article className="max-w-4xl mx-auto px-4 py-8">
          {!post.featured_image && (
            <header className="mb-8">
              <Badge className="mb-4">
                {post.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Badge>
              
              <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight">
                {translatedTitle}
              </h1>
              
              <div className="flex items-center gap-6 text-muted-foreground mb-8">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(post.publish_date), 'MMMM dd, yyyy')}</span>
                </div>
              </div>
            </header>
          )}

          {/* Social Share Buttons */}
          <div className="flex items-center gap-4 py-4 border-y mb-8">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share:
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShare('facebook')}
              className="gap-2"
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShare('twitter')}
              className="gap-2"
            >
              <Twitter className="w-4 h-4" />
              Twitter
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShare('linkedin')}
              className="gap-2"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </Button>
          </div>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed">
              {translatedContent}
            </div>
          </div>

          {/* Back to Journal */}
          <div className="mt-12 pt-8 border-t">
            <Link to="/journal">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Journal
              </Button>
            </Link>
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="py-16 bg-muted/30">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-3xl font-heading font-bold mb-8">Related Stories</h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    to={`/journal/${relatedPost.slug}`}
                    className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group"
                  >
                    {relatedPost.featured_image && (
                      <div className="relative h-48 overflow-hidden">
                        <MediaAsset
                          hardcodedKey={relatedPost.featured_image_key || ''}
                          fallbackUrl={relatedPost.featured_image}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(relatedPost.publish_date), 'MMM dd, yyyy')}
                      </div>
                      
                      <h3 className="text-lg font-heading font-semibold mb-2 text-foreground leading-tight group-hover:text-primary transition-colors">
                        {relatedPost.title}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {relatedPost.content.substring(0, 120)}...
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <DynamicFooter />
        <CombinedFloatingV5 />
      </div>
    </>
  );
};

export default BlogPost;
