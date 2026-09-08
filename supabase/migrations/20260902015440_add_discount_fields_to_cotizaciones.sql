-- Add discount columns to cotizaciones for manual discount feature
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS tiene_descuento boolean DEFAULT false;
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS descuento_tipo text DEFAULT 'porcentaje';  -- 'porcentaje' or 'monto'
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS descuento_valor numeric DEFAULT 0;
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS precio_original numeric DEFAULT 0;
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS precio_con_descuento numeric DEFAULT 0;
