-- Add parent_id column and foreign key constraint for navigation sub-menus
ALTER TABLE navigation_items ADD COLUMN IF NOT EXISTS parent_id UUID;

-- Add foreign key constraint to reference parent navigation items
ALTER TABLE navigation_items 
ADD CONSTRAINT navigation_items_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES navigation_items(id) ON DELETE CASCADE;