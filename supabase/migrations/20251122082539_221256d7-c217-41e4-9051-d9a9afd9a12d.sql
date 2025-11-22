-- Add parent_id to faq_categories for hierarchical structure
ALTER TABLE faq_categories 
ADD COLUMN parent_id UUID REFERENCES faq_categories(id) ON DELETE CASCADE;

-- Add index for parent lookups
CREATE INDEX idx_faq_categories_parent_id ON faq_categories(parent_id);

-- Insert the 4 fixed parent categories
INSERT INTO faq_categories (id, title, icon, sort_order, is_active, parent_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Before You Book', 'BookOpen', 1, true, NULL),
  ('00000000-0000-0000-0000-000000000002', 'During Your Stay', 'Hotel', 2, true, NULL),
  ('00000000-0000-0000-0000-000000000003', 'Experiences & Activities', 'TreePine', 3, true, NULL),
  ('00000000-0000-0000-0000-000000000004', 'Policies & Guest Support', 'Shield', 4, true, NULL)
ON CONFLICT (id) DO NOTHING;