-- Add normalized_name column to menus table for AI-processed menu names
ALTER TABLE menus ADD COLUMN normalized_name TEXT;

-- Create index for normalized_name to improve query performance
CREATE INDEX IF NOT EXISTS idx_menus_normalized_name ON menus(normalized_name);
