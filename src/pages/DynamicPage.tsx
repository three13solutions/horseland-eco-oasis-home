import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NavigationV5 from "@/components/v5/NavigationV5";
import FooterV5 from "@/components/v5/FooterV5";
import CombinedFloatingV5 from "@/components/v5/CombinedFloatingV5";
import SEO from "@/components/SEO";
import { toast } from "sonner";

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_image: string | null;
  template_type: string;
}

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPage(slug);
    }
  }, [slug]);

  const fetchPage = async (pageSlug: string) => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", pageSlug)
        .eq("is_published", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setNotFound(true);
        } else {
          throw error;
        }
      } else {
        setPage(data);
      }
    } catch (error: any) {
      toast.error("Failed to load page: " + error.message);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound || !page) {
    return <Navigate to="/404" replace />;
  }

  const renderContent = () => {
    const content = page.content || "";

    switch (page.template_type) {
      case "full-width":
        return (
          <div className="w-full">
            <div
              className="prose prose-lg max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        );

      case "centered":
        return (
          <div className="max-w-4xl mx-auto px-4">
            <div
              className="prose prose-lg dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        );

      case "with-sidebar":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <h3 className="font-semibold text-lg">Table of Contents</h3>
                <nav className="space-y-2">
                  {/* Add dynamic TOC generation here if needed */}
                  <p className="text-sm text-muted-foreground">
                    Navigation items would appear here
                  </p>
                </nav>
              </div>
            </aside>
            <main className="lg:col-span-3">
              <div
                className="prose prose-lg dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </main>
          </div>
        );

      default:
        return (
          <div
            className="prose prose-lg dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
    }
  };

  return (
    <>
      <SEO
        title={page.meta_title || page.title}
        description={page.meta_description || undefined}
        keywords={page.meta_keywords || undefined}
        ogImage={page.og_image || undefined}
        canonicalUrl={`${window.location.origin}/${page.slug}`}
      />

      <div className="min-h-screen bg-background">
        <NavigationV5 />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-8">{page.title}</h1>
            {renderContent()}
          </div>
        </main>

        <FooterV5 />
        <CombinedFloatingV5 />
      </div>
    </>
  );
}
