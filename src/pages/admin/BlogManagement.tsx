import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Save, Edit, FileText, Eye, Languages, Copy, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { format } from 'date-fns';
import { TranslationField } from '@/components/admin/TranslationField';
import RichTextEditor from '@/components/admin/RichTextEditor';
import DOMPurify from 'dompurify';

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  category: string;
  featured_image?: string;
  featured_image_key?: string;
  meta_title?: string;
  meta_description?: string;
  is_published: boolean;
  publish_date?: string;
  created_at?: string;
}

const categories = [
  'travel-tips',
  'guest-stories',
  'spa-wellness',
  'discover-matheran',
  'events',
  'news'
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
];

const BlogManagement = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translations, setTranslations] = useState<{ [key: string]: string }>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [sortColumn, setSortColumn] = useState<'title' | 'created_at' | 'is_published'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [formData, setFormData] = useState<BlogPost>({
    title: '',
    slug: '',
    content: '',
    author: '',
    category: 'travel-tips',
    featured_image: '',
    featured_image_key: '',
    meta_title: '',
    meta_description: '',
    is_published: false,
    publish_date: ''
  });

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Error",
        description: "Failed to load blog posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
      meta_title: prev.meta_title || title
    }));
  };

  const loadTranslations = async (postSlug: string, languageCode: string) => {
    if (languageCode === 'en') {
      setTranslations({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('translations')
        .select('key, value')
        .eq('section', 'blog')
        .eq('language_code', languageCode)
        .like('key', `blog.${postSlug}.%`);

      if (error) throw error;

      const translationMap: { [key: string]: string } = {};
      data?.forEach((item) => {
        const field = item.key.replace(`blog.${postSlug}.`, '');
        translationMap[field] = item.value;
      });

      setTranslations(translationMap);
    } catch (error) {
      console.error('Error loading translations:', error);
      setTranslations({});
    }
  };

  const saveTranslations = async (postSlug: string, languageCode: string) => {
    if (languageCode === 'en') return;

    try {
      const translationEntries = [
        { key: 'title', value: translations.title },
        { key: 'content', value: translations.content },
        { key: 'meta_title', value: translations.meta_title },
        { key: 'meta_description', value: translations.meta_description },
      ].filter(entry => entry.value);

      for (const entry of translationEntries) {
        await supabase
          .from('translations')
          .upsert({
            language_code: languageCode,
            section: 'blog',
            key: `blog.${postSlug}.${entry.key}`,
            value: entry.value,
          }, {
            onConflict: 'language_code,section,key'
          });
      }
    } catch (error) {
      console.error('Error saving translations:', error);
      throw error;
    }
  };

  const handleAutoTranslateAll = async () => {
    if (!formData.slug || selectedLanguage === 'en') return;

    setIsTranslating(true);
    try {
      const fields = [
        { key: 'title', value: formData.title },
        { key: 'content', value: formData.content },
        { key: 'meta_title', value: formData.meta_title },
        { key: 'meta_description', value: formData.meta_description },
      ];

      const translatedData: { [key: string]: string } = {};

      for (const field of fields) {
        if (!field.value) continue;

        const { data, error } = await supabase.functions.invoke('auto-translate', {
          body: {
            text: field.value,
            targetLanguage: selectedLanguage,
            sourceLanguage: 'en',
          },
        });

        if (error) throw error;
        translatedData[field.key] = data.translatedText;
      }

      setTranslations(prev => ({ ...prev, ...translatedData }));
      toast({
        title: "Success",
        description: "All fields auto-translated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to auto-translate: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.slug || !formData.content || !formData.author) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Sanitize and normalize content before saving
      const sanitizedContent = DOMPurify.sanitize(formData.content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel']
      });

      const postData = {
        ...formData,
        content: sanitizedContent,
        meta_title: formData.meta_title || formData.title,
        publish_date: formData.is_published && !formData.publish_date 
          ? new Date().toISOString() 
          : formData.publish_date
      };

      if (editingPost?.id) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editingPost.id);

        if (error) throw error;

        // Save translations for non-English languages
        if (selectedLanguage !== 'en') {
          await saveTranslations(formData.slug, selectedLanguage);
        }

        toast({
          title: "Success",
          description: selectedLanguage === 'en' 
            ? "Blog post updated successfully" 
            : `Blog post updated and ${LANGUAGES.find(l => l.code === selectedLanguage)?.name} translation saved`
        });
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([postData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Blog post created successfully"
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: "Error",
        description: "Failed to save blog post",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData(post);
    setSelectedLanguage('en');
    setTranslations({});
    setIsDialogOpen(true);
    if (post.slug) {
      loadTranslations(post.slug, 'en');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Blog post deleted successfully"
      });

      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete blog post",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      author: '',
      category: 'travel-tips',
      featured_image: '',
      featured_image_key: '',
      meta_title: '',
      meta_description: '',
      is_published: false,
      publish_date: ''
    });
    setEditingPost(null);
    setSelectedLanguage('en');
    setTranslations({});
  };

  const handleLanguageChange = async (languageCode: string) => {
    setSelectedLanguage(languageCode);
    if (formData.slug && languageCode !== 'en') {
      await loadTranslations(formData.slug, languageCode);
    } else {
      setTranslations({});
    }
  };

  const handleSort = (column: 'title' | 'created_at' | 'is_published') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedPosts = [...posts].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at || 0).getTime();
        bValue = new Date(b.created_at || 0).getTime();
        break;
      case 'is_published':
        aValue = a.is_published ? 1 : 0;
        bValue = b.is_published ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: 'title' | 'created_at' | 'is_published' }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-4 h-4 ml-2 text-muted-foreground" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-2" /> : 
      <ArrowDown className="w-4 h-4 ml-2" />;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Blog Management
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage journal posts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
              <DialogDescription>
                {editingPost ? 'Update your blog post details' : 'Add a new blog post to your journal'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Language Tabs */}
              {editingPost && (
                <Tabs value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <div className="flex items-center justify-between mb-4">
                    <TabsList className="grid grid-cols-7 w-full max-w-3xl">
                      {LANGUAGES.slice(0, 7).map((lang) => (
                        <TabsTrigger key={lang.code} value={lang.code} className="text-xs">
                          <span className="mr-1">{lang.flag}</span>
                          {lang.code.toUpperCase()}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {selectedLanguage !== 'en' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAutoTranslateAll}
                        disabled={isTranslating}
                      >
                        {isTranslating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Languages className="w-4 h-4 mr-2" />
                        )}
                        Auto-translate All
                      </Button>
                    )}
                  </div>
                  
                  <TabsList className="grid grid-cols-7 w-full max-w-3xl mb-4">
                    {LANGUAGES.slice(7).map((lang) => (
                      <TabsTrigger key={lang.code} value={lang.code} className="text-xs">
                        <span className="mr-1">{lang.flag}</span>
                        {lang.code.toUpperCase()}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}

              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedLanguage === 'en' ? (
                    <>
                      <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          placeholder="Enter post title"
                        />
                      </div>

                      <div>
                        <Label htmlFor="slug">Slug *</Label>
                        <Input
                          id="slug"
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                          placeholder="post-url-slug"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          URL: /journal/{formData.slug || 'post-slug'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="author">Author *</Label>
                          <Input
                            id="author"
                            value={formData.author}
                            onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                            placeholder="Author name"
                          />
                        </div>

                        <div>
                          <Label htmlFor="category">Category *</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="content">Content *</Label>
                        <RichTextEditor
                          value={formData.content}
                          onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                          placeholder="Write your post content..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <TranslationField
                        label="Title"
                        translationKey={`blog.${formData.slug}.title`}
                        slug={formData.slug}
                        languageCode={selectedLanguage}
                        englishValue={formData.title}
                        currentValue={translations.title || ''}
                        onValueChange={(value) => setTranslations(prev => ({ ...prev, title: value }))}
                        rows={2}
                      />

                      <TranslationField
                        label="Content"
                        translationKey={`blog.${formData.slug}.content`}
                        slug={formData.slug}
                        languageCode={selectedLanguage}
                        englishValue={formData.content}
                        currentValue={translations.content || ''}
                        onValueChange={(value) => setTranslations(prev => ({ ...prev, content: value }))}
                        isTextarea={true}
                        rows={10}
                      />

                      <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                        <p><strong>Note:</strong> Author and Category cannot be translated as they are metadata fields.</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Featured Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Featured Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <MediaPicker
                    label="Featured Image"
                    value={formData.featured_image || ''}
                    onChange={async (url) => {
                      setFormData(prev => ({ ...prev, featured_image: url }));
                      // Fetch and save the hardcoded_key
                      const { data } = await supabase
                        .from('gallery_images')
                        .select('hardcoded_key')
                        .eq('image_url', url)
                        .single();
                      if (data?.hardcoded_key) {
                        setFormData(prev => ({ ...prev, featured_image_key: data.hardcoded_key }));
                      }
                    }}
                    categorySlug="blog"
                    folder="blog"
                  />
                </CardContent>
              </Card>

              {/* SEO Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">SEO Settings</CardTitle>
                  <CardDescription>Optimize for search engines</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedLanguage === 'en' ? (
                    <>
                      <div>
                        <Label htmlFor="meta_title">Meta Title</Label>
                        <Input
                          id="meta_title"
                          value={formData.meta_title}
                          onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                          placeholder="SEO title (defaults to post title)"
                          maxLength={60}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formData.meta_title?.length || 0}/60 characters
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="meta_description">Meta Description</Label>
                        <Textarea
                          id="meta_description"
                          value={formData.meta_description}
                          onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                          placeholder="Brief description for search results"
                          rows={3}
                          maxLength={160}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formData.meta_description?.length || 0}/160 characters
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <TranslationField
                        label="Meta Title"
                        translationKey={`blog.${formData.slug}.meta_title`}
                        slug={formData.slug}
                        languageCode={selectedLanguage}
                        englishValue={formData.meta_title || ''}
                        currentValue={translations.meta_title || ''}
                        onValueChange={(value) => setTranslations(prev => ({ ...prev, meta_title: value }))}
                        rows={2}
                      />

                      <TranslationField
                        label="Meta Description"
                        translationKey={`blog.${formData.slug}.meta_description`}
                        slug={formData.slug}
                        languageCode={selectedLanguage}
                        englishValue={formData.meta_description || ''}
                        currentValue={translations.meta_description || ''}
                        onValueChange={(value) => setTranslations(prev => ({ ...prev, meta_description: value }))}
                        isTextarea={true}
                        rows={3}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Publishing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Publishing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is_published">Publish Status</Label>
                      <p className="text-sm text-muted-foreground">
                        {formData.is_published ? 'Post is live' : 'Post is in draft'}
                      </p>
                    </div>
                    <Switch
                      id="is_published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                    />
                  </div>

                  {formData.is_published && (
                    <div>
                      <Label htmlFor="publish_date">Publish Date</Label>
                      <Input
                        id="publish_date"
                        type="datetime-local"
                        value={formData.publish_date ? format(new Date(formData.publish_date), "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, publish_date: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingPost ? 'Update Post' : 'Create Post'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
          <CardDescription>Manage your blog posts and articles</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center">
                    Title
                    <SortIcon column="title" />
                  </div>
                </TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('is_published')}
                >
                  <div className="flex items-center">
                    Status
                    <SortIcon column="is_published" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Created Date
                    <SortIcon column="created_at" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No posts yet. Create your first blog post!
                  </TableCell>
                </TableRow>
              ) : (
                sortedPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>{post.author}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {post.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.is_published ? 'default' : 'secondary'}>
                        {post.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {post.created_at ? format(new Date(post.created_at), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {post.is_published && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/journal/${post.slug}`, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(post)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(post.id!)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlogManagement;
