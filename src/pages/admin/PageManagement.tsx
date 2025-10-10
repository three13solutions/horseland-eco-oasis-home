import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, Search } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

interface Page {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_image: string | null;
  hero_image: string | null;
  hero_gallery: string[];
  hero_type: string;
  is_published: boolean;
  template_type: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_TYPES = [
  { value: "full-width", label: "Full Width" },
  { value: "with-sidebar", label: "With Sidebar" },
  { value: "centered", label: "Centered Content" },
  { value: "custom", label: "Custom Template" },
];

export default function PageManagement() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    subtitle: "",
    content: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: "",
    hero_image: "",
    hero_gallery: [] as string[],
    hero_type: "single",
    is_published: false,
    template_type: "full-width",
    sort_order: 0,
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setPages((data || []).map(page => ({
        ...page,
        hero_gallery: (page.hero_gallery as string[]) || [],
      })));
    } catch (error: any) {
      toast.error("Failed to fetch pages: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPage) {
        const { error } = await supabase
          .from("pages")
          .update(formData)
          .eq("id", editingPage.id);

        if (error) throw error;
        toast.success("Page updated successfully");
      } else {
        const { error } = await supabase.from("pages").insert([formData]);

        if (error) throw error;
        toast.success("Page created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPages();
    } catch (error: any) {
      toast.error("Failed to save page: " + error.message);
    }
  };

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setFormData({
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle || "",
      content: page.content || "",
      meta_title: page.meta_title || "",
      meta_description: page.meta_description || "",
      meta_keywords: page.meta_keywords || "",
      og_image: page.og_image || "",
      hero_image: page.hero_image || "",
      hero_gallery: page.hero_gallery || [],
      hero_type: page.hero_type || "single",
      is_published: page.is_published,
      template_type: page.template_type,
      sort_order: page.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;

    try {
      const { error } = await supabase.from("pages").delete().eq("id", id);

      if (error) throw error;
      toast.success("Page deleted successfully");
      fetchPages();
    } catch (error: any) {
      toast.error("Failed to delete page: " + error.message);
    }
  };

  const resetForm = () => {
    setEditingPage(null);
    setFormData({
      slug: "",
      title: "",
      subtitle: "",
      content: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      og_image: "",
      hero_image: "",
      hero_gallery: [],
      hero_type: "single",
      is_published: false,
      template_type: "full-width",
      sort_order: 0,
    });
  };

  const filteredPages = pages.filter(
    (page) =>
      page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Page Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create Page
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPage ? "Edit Page" : "Create New Page"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="hero">Hero Banner</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div>
                    <Label htmlFor="title">Page Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="subtitle">Subtitle (optional)</Label>
                    <Input
                      id="subtitle"
                      value={formData.subtitle}
                      onChange={(e) =>
                        setFormData({ ...formData, subtitle: e.target.value })
                      }
                      placeholder="Page subtitle or tagline"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug (URL)</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-"),
                        })
                      }
                      placeholder="about-us"
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      URL: /{formData.slug}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="content">Content (Markdown/HTML)</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      rows={12}
                      placeholder="Enter your page content here..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="hero" className="space-y-4">
                  <div>
                    <Label htmlFor="hero_type">Hero Type</Label>
                    <Select
                      value={formData.hero_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, hero_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Hero</SelectItem>
                        <SelectItem value="single">Single Image</SelectItem>
                        <SelectItem value="carousel">Image Carousel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.hero_type === "single" && (
                    <ImageUpload
                      label="Hero Image"
                      value={formData.hero_image}
                      onChange={(url) =>
                        setFormData({ ...formData, hero_image: url })
                      }
                      bucketName="uploads"
                      folder="hero-images"
                    />
                  )}

                  {formData.hero_type === "carousel" && (
                    <div>
                      <Label>Carousel Images</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Add up to 5 images for the carousel
                      </p>
                      {formData.hero_gallery.map((url, index) => (
                        <div key={index} className="mb-4">
                          <ImageUpload
                            label={`Image ${index + 1}`}
                            value={url}
                            onChange={(newUrl) => {
                              const newGallery = [...formData.hero_gallery];
                              newGallery[index] = newUrl;
                              setFormData({ ...formData, hero_gallery: newGallery });
                            }}
                            bucketName="uploads"
                            folder="hero-images"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              const newGallery = formData.hero_gallery.filter(
                                (_, i) => i !== index
                              );
                              setFormData({ ...formData, hero_gallery: newGallery });
                            }}
                          >
                            Remove Image
                          </Button>
                        </div>
                      ))}
                      {formData.hero_gallery.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              hero_gallery: [...formData.hero_gallery, ""],
                            });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Image
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="seo" className="space-y-4">
                  <div>
                    <Label htmlFor="meta_title">Meta Title</Label>
                    <Input
                      id="meta_title"
                      value={formData.meta_title}
                      onChange={(e) =>
                        setFormData({ ...formData, meta_title: e.target.value })
                      }
                      placeholder="Leave empty to use page title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="meta_description">Meta Description</Label>
                    <Textarea
                      id="meta_description"
                      value={formData.meta_description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          meta_description: e.target.value,
                        })
                      }
                      rows={3}
                      maxLength={160}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {formData.meta_description.length}/160 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="meta_keywords">Meta Keywords</Label>
                    <Input
                      id="meta_keywords"
                      value={formData.meta_keywords}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          meta_keywords: e.target.value,
                        })
                      }
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>

                  <ImageUpload
                    label="OG Image"
                    value={formData.og_image}
                    onChange={(url) =>
                      setFormData({ ...formData, og_image: url })
                    }
                    bucketName="uploads"
                    folder="og-images"
                  />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div>
                    <Label htmlFor="template_type">Template Type</Label>
                    <Select
                      value={formData.template_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, template_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map((template) => (
                          <SelectItem key={template.value} value={template.value}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sort_order: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_published">Published</Label>
                    <Switch
                      id="is_published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_published: checked })
                      }
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPage ? "Update Page" : "Create Page"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search pages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading pages...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      /{page.slug}
                    </TableCell>
                    <TableCell>
                      {TEMPLATE_TYPES.find((t) => t.value === page.template_type)
                        ?.label || page.template_type}
                    </TableCell>
                    <TableCell>
                      {page.is_published ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Eye className="w-4 h-4" /> Published
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <EyeOff className="w-4 h-4" /> Draft
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(page.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(page)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(page.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
