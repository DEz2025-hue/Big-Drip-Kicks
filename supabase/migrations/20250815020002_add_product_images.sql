/*
  # Add Product Images Support
  
  This migration adds image support to the products table
  to allow storing product images.
*/

-- Add image_url column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_urls column for multiple images (stored as JSON array)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT '[]';

-- Create storage bucket for product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for product images
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update product images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete product images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);
