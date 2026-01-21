-- Add rawContent field to Book table for full-text search
-- This field stores the extracted text content from uploaded files
-- Enables searching within book content, not just metadata

-- Add the column (nullable so existing books aren't affected)
ALTER TABLE "Book" ADD COLUMN "rawContent" TEXT;

-- Create a full-text search index on rawContent for fast searching
-- Uses PostgreSQL's built-in text search with English language
CREATE INDEX "Book_rawContent_search_idx" ON "Book" USING gin(to_tsvector('english', COALESCE("rawContent", '')));

-- Create a trigram index for fuzzy/partial matching (optional but recommended)
-- Requires pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Book_rawContent_trgm_idx" ON "Book" USING gin("rawContent" gin_trgm_ops);

-- Comments
COMMENT ON COLUMN "Book"."rawContent" IS 'Extracted full text content for search';
COMMENT ON INDEX "Book_rawContent_search_idx" IS 'Full-text search index using ts_vector';
COMMENT ON INDEX "Book_rawContent_trgm_idx" IS 'Trigram index for fuzzy matching';
