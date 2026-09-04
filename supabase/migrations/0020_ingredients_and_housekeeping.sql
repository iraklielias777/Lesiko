-- Product ingredients, and two advisor follow-ups.

-- Every product page rendered the same fabricated INCI list. Real ingredients
-- are per product, per language, and optional — the tab hides when empty.
alter table public.products
  add column if not exists ingredients    text,
  add column if not exists ingredients_ka text;

-- Migration 0018 created pg_trgm in `public`, which the database linter flags.
-- The extension's operator classes move with it; the trigram indexes keep
-- working because they reference the opclass by identity, not by name.
alter extension pg_trgm set schema extensions;
