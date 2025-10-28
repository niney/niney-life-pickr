-- Add index on name column for faster restaurant name searches
-- This improves performance for LIKE queries, especially prefix searches
CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants(name);
