import { useParams, Navigate } from "react-router-dom";
import Navigation from "@/v2/components/Navigation";
import DynamicFooter from "@/v2/components/DynamicFooter";
import CombinedFloating from "@/v2/components/CombinedFloating";
import SEO from "@/components/SEO";
import DOMPurify from "dompurify";
import { getPageBySlug, getMediaUrl } from "@/v2/data";

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = getPageBySlug(slug);

  if (!page || !page.is_published) {
    return <Navigate to="/v2/404" replace />;
  }

  const title = page.title;
  const subtitle = page.subtitle || "";
  const content = page.content || "";

  const renderHero = () => {
    if (page.hero_type === "none" || !page.hero_type) return null;

    if (page.hero_type === "single" && page.hero_image) {
      const heroUrl = getMediaUrl(page.hero_image_key, page.hero_image) || page.hero_image;
      return (
        <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center">
          <img
            src={heroUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg md:text-xl font-body opacity-90 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        </section>
      );
    }

    if (page.hero_type === "carousel" && page.hero_gallery?.length > 0) {
      return (
        <section className="relative h-[60vh] min-h-[500px]">
          <div className="relative h-full">
            {page.hero_gallery.map((image: string, index: number) => (
              <div
                key={index}
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url('${image}')`,
                  opacity: index === 0 ? 1 : 0,
                  transition: 'opacity 0.5s ease-in-out'
                }}
              >
                <div className="absolute inset-0 bg-black/40"></div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white max-w-4xl mx-auto px-4">
              <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-lg md:text-xl font-body opacity-90 max-w-2xl mx-auto">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </section>
      );
    }

    return null;
  };

  const renderContent = () => {
    switch (page.template_type) {
      case "full-width":
        return (
          <div className="w-full">
            <div
              className="prose prose-lg max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
            />
          </div>
        );

      case "centered":
        return (
          <div className="max-w-4xl mx-auto px-4">
            <div
              className="prose prose-lg dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
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
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
              />
            </main>
          </div>
        );

      default:
        return (
          <div
            className="prose prose-lg dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          />
        );
    }
  };

  return (
    <>
      <SEO
        title={page.meta_title || title}
        description={page.meta_description || undefined}
        keywords={page.meta_keywords || undefined}
        ogImage={page.og_image || undefined}
        canonicalUrl={`${window.location.origin}/v2/${page.slug}`}
      />

      <div className="min-h-screen bg-background">
        <Navigation />

        {renderHero()}

        <main className={page.hero_type === "none" || !page.hero_type ? "pt-24 pb-16" : "py-16"}>
          <div className="container mx-auto px-4">
            {(page.hero_type === "none" || !page.hero_type) && (
              <>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
                {subtitle && (
                  <p className="text-xl text-muted-foreground mb-8">{subtitle}</p>
                )}
              </>
            )}
            {renderContent()}
          </div>
        </main>

        <DynamicFooter />
        <CombinedFloating />
      </div>
    </>
  );
}
