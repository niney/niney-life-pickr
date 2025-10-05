/**
 * Database entity types
 */

export interface RestaurantDB {
  id: number;
  place_id: string;
  name: string;
  place_name: string | null;
  category: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  business_hours: string | null;
  lat: number | null;
  lng: number | null;
  url: string;
  crawled_at: string;
  created_at: string;
  updated_at: string;
}

export interface MenuDB {
  id: number;
  restaurant_id: number;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  created_at: string;
}

/**
 * Input types for database operations
 */
export interface RestaurantInput {
  place_id: string;
  name: string;
  place_name: string | null;
  category: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  business_hours: string | null;
  lat: number | null;
  lng: number | null;
  url: string;
  crawled_at: string;
}

export interface MenuInput {
  restaurant_id: number;
  name: string;
  description?: string | null;
  price: string;
  image?: string | null;
}
