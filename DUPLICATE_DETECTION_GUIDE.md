# Duplicate Media Detection Guide

## Current Issue
The "Check Duplicates" button only checks for exact URL matches, which misses most duplicates since re-uploaded files get new URLs.

## Recommended Solutions

### 1. **File Hash Method (Best)** ⭐
Calculate a unique hash (MD5/SHA256) of file content to detect exact duplicates regardless of filename or upload time.

**Database Changes:**
```sql
ALTER TABLE gallery_images 
ADD COLUMN file_hash TEXT,
ADD COLUMN file_size BIGINT,
ADD COLUMN original_filename TEXT;

CREATE UNIQUE INDEX idx_gallery_images_hash ON gallery_images(file_hash) 
WHERE file_hash IS NOT NULL;
```

**Pros:**
- 100% accurate for exact file matches
- Works regardless of filename changes
- Industry standard approach

**Cons:**
- Requires hash calculation on upload
- Slightly slower uploads

### 2. **File Size + Dimensions**
Compare file size and image dimensions (width x height).

**Database Changes:**
```sql
ALTER TABLE gallery_images 
ADD COLUMN width INTEGER,
ADD COLUMN height INTEGER,
ADD COLUMN file_size BIGINT;
```

**Pros:**
- Fast comparison
- Useful metadata
- No complex calculations

**Cons:**
- Not 100% reliable (collisions possible)
- Only works well for images

### 3. **Combination Approach (Recommended)**
Use file hash as primary + size/dimensions as secondary check.

## Implementation Priority

**Phase 1:** Add file hash
- Most reliable duplicate detection
- Prevent duplicate uploads automatically

**Phase 2:** Add metadata
- File size, dimensions, original filename
- Enhanced search and filtering

**Phase 3:** Smart detection UI
- Show warnings during upload
- "This file already exists at..."
- Option to replace or keep both

## Code Example

```typescript
// Calculate SHA-256 hash
async function getFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Check before upload
const hash = await getFileHash(file);
const { data: existing } = await supabase
  .from('gallery_images')
  .select('*')
  .eq('file_hash', hash)
  .maybeSingle();

if (existing) {
  // Show duplicate warning with link to existing media
}
```

Would you like me to implement the file hash approach?
