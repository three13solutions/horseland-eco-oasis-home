# Media Management System Guide

## Overview
The centralized Media Management system provides a single location to manage all website assets (images and videos) with usage tracking and safety features.

---

## Key Questions Answered

### 1. **Import Existing Media Button**
**Removed** - This was only needed for initial migration from the old system to the new centralized media library. After the first migration, it's no longer necessary, so the button has been removed from the UI.

### 2. **Source Type & Media Type - Auto-Detection**
Both are now **automatically detected**:

- **Media Type** (image vs video):
  - Automatically set based on whether you upload an image or enter a video URL
  - Toggle buttons allow switching between image and video mode

- **Source Type** (upload/external/hardcoded/mirrored):
  - `upload`: Auto-detected when using Supabase storage upload
  - `external`: Auto-detected when pasting external URLs
  - `hardcoded`: For system-critical images referenced in code (used by developers)
  - `mirrored`: Set during migration (historical data)

**Result**: You no longer manually select these - the system figures it out!

### 3. **Field Usage on Website**

#### **Caption** (Optional)
- **Where used**: Displayed below images in gallery sections
- **Purpose**: Provides context or description for the image
- **Example**: "Sunset view from the main pool area"

#### **Location** (Optional, non-guest images)
- **Where used**: Gallery filtering and organization
- **Purpose**: Tag images by physical location for easier management
- **Example**: "Main Pool Area", "Garden View", "Reception Lobby"

#### **Sort Order** (Removed from form)
- **Why removed**: This is handled automatically by the system
- **Note**: Images are sorted by creation date and can be manually reordered if needed

### 4. **Can an Image Be in Multiple Categories?**

**Currently: NO** - Each image can only belong to ONE category.

The current database schema uses a single `category_id` foreign key, which means:
- ✅ One image → One category
- ❌ One image → Multiple categories

**To support multiple categories**, we would need:
1. Create a junction table: `image_categories` with columns:
   - `image_id` (foreign key to gallery_images)
   - `category_id` (foreign key to gallery_categories)
2. Update queries to use the junction table
3. Update the admin UI to support multi-select for categories

**Question for you**: Do you need images to be in multiple categories? If yes, we can implement this change.

---

## Current Media Management Features

### ✅ Implemented Features

1. **Centralized Library**: All media in one place
2. **Usage Tracking**: See where each image is used across the site
3. **Unused Media Detection**: Easily identify orphaned media
4. **Safety Features**:
   - Blocks deletion of hardcoded media (prevents breaking the site)
   - Warns when deleting media that's in use
   - Shows usage details before deletion
5. **Auto-Detection**: Media type and source type automatically determined
6. **Filters**: By media type, source, category, usage status
7. **Multiple Views**: Grid view and List view
8. **Bulk Operations**: Select and delete multiple items at once

### 📊 Usage Statistics Dashboard

Shows:
- Total media count
- Used vs unused media
- Usage breakdown by content type (pages, blogs, rooms, packages, etc.)
- Media type breakdown (images vs videos)

---

## Workflow Examples

### Adding a New Image

1. Click "Add Media"
2. Enter title (required)
3. Select category (required)
4. Upload image or paste URL
   - System automatically detects if it's upload or external
5. Add alt text for SEO (required)
6. Optionally add caption and location
7. Save

### Finding Unused Media

1. Use the "Usage" filter dropdown
2. Select "Unused Only"
3. Review the list of unused media
4. Select items to delete (if desired)
5. Bulk delete or delete individually

### Before Deleting Media

The system will:
1. Check if media is hardcoded → Block deletion if yes
2. Check if media is used → Show warning with details
3. Display all locations where it's used
4. Require confirmation before proceeding

---

## Best Practices

1. **Always add Alt Text**: Critical for SEO and accessibility
2. **Use descriptive titles**: Makes searching easier
3. **Add captions**: Helps with context in galleries
4. **Tag locations**: Makes organizing images easier
5. **Regular cleanup**: Use the unused media filter monthly to clean up orphaned files
6. **Check usage before deleting**: Always review where media is used

---

## Technical Notes

### Source Types Explained

- **upload**: Files uploaded to Supabase storage (your server)
- **external**: Images hosted elsewhere (like CDNs, external sites)
- **hardcoded**: Images referenced directly in application code (DO NOT DELETE)
- **mirrored**: Legacy images imported during migration

### Category Limitation

Current limitation: One image per category.

If you need an image in multiple categories, you have two options:
1. Duplicate the image and assign to different categories
2. Request implementation of multi-category support (requires DB changes)

---

## Questions to Consider

1. **Multiple Categories**: Do you need images in multiple categories?
2. **Sort Order**: Do you want manual control over image ordering in galleries?
3. **Caption Display**: Should captions always show, or only in certain views?
4. **Location Tags**: Are you using these effectively, or should they be removed?

Let me know your preferences, and we can adjust accordingly!
