-- Migration: Add index for restaurant address search performance
-- Created: 2025-10-29

-- Add index on address column for faster search queries
CREATE INDEX IF NOT EXISTS idx_restaurants_address ON restaurants(address);
