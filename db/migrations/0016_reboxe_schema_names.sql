DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'return_lines'
      AND column_name = 'rebox_category_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'return_lines'
      AND column_name = 'reboxe_category_id'
  ) THEN
    ALTER TABLE public.return_lines
      RENAME COLUMN rebox_category_id TO reboxe_category_id;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF to_regprocedure('public.rebox_unaccent(text)') IS NOT NULL
    AND to_regprocedure('public.reboxe_unaccent(text)') IS NULL THEN
    ALTER FUNCTION public.rebox_unaccent(text) RENAME TO reboxe_unaccent;
  END IF;
END $$;
