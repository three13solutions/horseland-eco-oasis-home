/**
 * Version 2 static content layer.
 *
 * All website content (text, rooms, prices, galleries, activities, spa,
 * dining, blog, policies, FAQ, navigation, settings) lives in the JSON
 * files next to this module. Nothing here talks to Supabase or any CMS —
 * edit the JSON files directly to update the site.
 */

import activitiesData from './activities.json';
import blogPostsData from './blog_posts.json';
import faqCategoriesData from './faq_categories.json';
import faqItemsData from './faq_items.json';
import footerSectionsData from './footer_sections.json';
import galleryCategoriesData from './gallery_categories.json';
import galleryImagesData from './gallery_images.json';
import mealsData from './meals.json';
import navigationItemsData from './navigation_items.json';
import packagesData from './packages.json';
import pagesData from './pages.json';
import policiesData from './policies_content.json';
import roomCategoriesData from './room_categories.json';
import roomTypesData from './room_types.json';
import roomUnitsData from './room_units.json';
import siteSettingsData from './site_settings.json';
import spaServicesData from './spa_services.json';
import translationsData from './translations.json';

export type AnyRecord = Record<string, any>;

export const activities = activitiesData as AnyRecord[];
export const blogPosts = blogPostsData as AnyRecord[];
export const faqCategories = faqCategoriesData as AnyRecord[];
export const faqItems = faqItemsData as AnyRecord[];
export const footerSections = footerSectionsData as AnyRecord[];
export const galleryCategories = galleryCategoriesData as AnyRecord[];
export const galleryImages = galleryImagesData as AnyRecord[];
export const meals = mealsData as AnyRecord[];
export const navigationItems = navigationItemsData as AnyRecord[];
export const packages = packagesData as AnyRecord[];
export const pages = pagesData as AnyRecord[];
export const policiesContent = policiesData as AnyRecord[];
export const roomCategories = roomCategoriesData as AnyRecord[];
export const roomTypes = roomTypesData as AnyRecord[];
export const roomUnits = roomUnitsData as AnyRecord[];
export const siteSettingsRows = siteSettingsData as AnyRecord[];
export const spaServices = spaServicesData as AnyRecord[];
export const translationRows = translationsData as AnyRecord[];

/* ------------------------------------------------------------------ */
/* Site settings                                                       */
/* ------------------------------------------------------------------ */

export const siteSettings: AnyRecord = siteSettingsRows.reduce(
  (acc, row) => ({ ...acc, [row.setting_key]: row.setting_value }),
  {} as AnyRecord
);

export const brand = {
  name: (siteSettings.brand_name as string) || 'HORSELAND',
  descriptor: (siteSettings.brand_descriptor as string) || 'Hotel, Matheran',
  monogram: (siteSettings.brand_monogram as string) || '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png',
  favicon: siteSettings.favicon as string,
  phone: (siteSettings.phone_number as string) || '+919404224600',
  whatsapp: (siteSettings.whatsapp_number as string) || '+919404224600',
  copyright: (siteSettings.copyright_text as string) || 'All Rights Reserved ® Horseland Hotel © 2025',
  credits: (siteSettings.credits as string) || '',
};

/* ------------------------------------------------------------------ */
/* Translations (static, English copy currently shown on the website)  */
/* ------------------------------------------------------------------ */

const translationMap: Record<string, string> = translationRows
  .filter((t) => t.language_code === 'en')
  .reduce((acc, t) => ({ ...acc, [t.key]: t.value }), {} as Record<string, string>);

export const getContent = (key: string, fallback?: string): string =>
  translationMap[key] ?? fallback ?? key;

/* ------------------------------------------------------------------ */
/* Media helpers                                                       */
/* ------------------------------------------------------------------ */

const hardcodedMedia: Record<string, AnyRecord> = galleryImages
  .filter((g) => g.is_hardcoded && g.hardcoded_key)
  .reduce((acc, g) => ({ ...acc, [g.hardcoded_key as string]: g }), {} as Record<string, AnyRecord>);

export const getMedia = (key?: string, fallbackUrl?: string) => {
  if (key && hardcodedMedia[key]) return hardcodedMedia[key];
  if (fallbackUrl) {
    return {
      id: 'fallback',
      title: 'Image',
      image_url: fallbackUrl,
      media_type: 'image',
      source_type: 'hardcoded',
      hardcoded_key: key,
    } as AnyRecord;
  }
  return null;
};

export const getMediaUrl = (key?: string, fallbackUrl?: string): string | undefined =>
  getMedia(key, fallbackUrl)?.image_url ?? fallbackUrl;

/* ------------------------------------------------------------------ */
/* Derived collections                                                 */
/* ------------------------------------------------------------------ */

export const publishedRoomTypes = roomTypes
  .filter((r) => r.is_published)
  .sort((a, b) => (a.base_price || 0) - (b.base_price || 0));

export const activeRoomCategories = roomCategories
  .filter((c) => c.is_active !== false)
  .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

export const getRoomTypeById = (id?: string) => roomTypes.find((r) => r.id === id) || null;

export const getRoomTypesByCategory = (categoryId: string) =>
  publishedRoomTypes.filter((r) => r.category_id === categoryId);

export const activeActivities = activities
  .filter((a) => a.is_active !== false)
  .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

export const getActivityById = (id?: string) => activities.find((a) => a.id === id) || null;

export const activeSpaServices = spaServices.filter((s) => s.is_active !== false);

export const getSpaServiceById = (id?: string) => spaServices.find((s) => s.id === id) || null;

export const activeMeals = meals.filter((m) => m.is_active !== false);

export const activePackages = packages
  .filter((p) => p.is_active !== false)
  .sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));

export const getPackageById = (id?: string) => packages.find((p) => p.id === id) || null;

export const publishedBlogPosts = blogPosts
  .filter((p) => p.is_published)
  .sort((a, b) => new Date(b.publish_date || b.created_at).getTime() - new Date(a.publish_date || a.created_at).getTime());

export const getBlogPostBySlug = (slug?: string) => blogPosts.find((p) => p.slug === slug) || null;

export const publishedPages = pages.filter((p) => p.is_published);

export const getPageBySlug = (slug?: string) => pages.find((p) => p.slug === slug) || null;

export const activePolicies = policiesContent
  .filter((p) => p.is_active !== false)
  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

export const parentFaqCategories = faqCategories
  .filter((c) => c.is_active !== false && !c.parent_id)
  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

export const getFaqSubCategories = (parentId: string) =>
  faqCategories
    .filter((c) => c.is_active !== false && c.parent_id === parentId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

export const getFaqItems = (categoryId: string) =>
  faqItems
    .filter((i) => i.is_active !== false && i.category_id === categoryId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

export const activeGalleryCategories = galleryCategories
  .filter((c) => c.is_active !== false)
  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

export const getGalleryImages = (category?: string) =>
  galleryImages
    .filter((g) => g.media_type !== 'video' || g.video_url)
    .filter((g) => (category ? g.category === category : true))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

export const featuredGalleryImages = galleryImages.filter((g) => g.is_featured);

export const getFooterSection = (key: string) =>
  footerSections.find((s) => s.section_key === key && s.is_active !== false)?.content ?? {};

export const navigation = {
  top: navigationItems
    .filter((n) => n.is_active !== false && !n.parent_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  childrenOf: (parentId: string) =>
    navigationItems
      .filter((n) => n.is_active !== false && n.parent_id === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
};

export const contact = {
  ...(getFooterSection('contact') as AnyRecord),
  phone: ((getFooterSection('contact') as AnyRecord).phone as string) || brand.phone,
  whatsapp: brand.whatsapp,
};

export const social = getFooterSection('social') as AnyRecord;
