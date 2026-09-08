-- Add edad_conyuge and edades_hijos to cotizaciones for per-person pricing
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS edad_conyuge int;
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS edades_hijos int[] DEFAULT '{}';

-- Drop grilla_compleja table (no longer used)
DROP TABLE IF EXISTS public.grilla_compleja CASCADE;
