CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE OR REPLACE FUNCTION reboxe_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, value) $$;--> statement-breakpoint
CREATE INDEX "idx_listings_search" ON "listings" USING gin (
  to_tsvector(
    'simple'::regconfig,
    reboxe_unaccent("title" || ' ' || coalesce("description", '') || ' ' || "condition_notes")
  )
) WHERE "status" = 'ACTIVE';
