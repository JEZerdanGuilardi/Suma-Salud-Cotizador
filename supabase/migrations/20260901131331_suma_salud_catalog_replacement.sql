/*
# Suma Salud: New 4-plan catalog + coverage details

Replaces the old multi-obra-social catalog with Suma Salud's 4 commercial plans.
Adds coverage detail columns to obras_sociales and seeds the new data.

## Changes
1. ALTER obras_sociales: add columns for plan tier, integrant limit, coseguro details,
   medication discount, reproductive health, territory, cartilla, alliances, target age range.
2. TRUNCATE and re-seed obras_sociales with the 4 Suma Salud plans.
3. TRUNCATE grilla_compleja (no longer used - Suma Salud uses fixed pricing per plan).
4. TRUNCATE monotributo_categorias and re-seed with current AFIP monotributo health aportes.
*/

-- 1. Add coverage detail columns to obras_sociales
ALTER TABLE public.obras_sociales
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS edad_minima int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS edad_maxima int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coseguro_consulta text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS coseguro_guardia text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS coseguro_laboratorio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS coseguro_imagenes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS descuento_medicamentos int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salud_reproductiva text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS territorio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cartilla text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS alianzas text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tiene_coseguro boolean NOT NULL DEFAULT true;

-- 2. Replace catalog with Suma Salud's 4 plans
TRUNCATE TABLE public.obras_sociales RESTART IDENTITY CASCADE;

INSERT INTO public.obras_sociales
  (obra_social, nombre_plan, costo_base, plan_tier,
   acepta_bono, acepta_monotributo, acepta_prepago, permite_jubilados,
   limite_personas, edad_minima, edad_maxima,
   tiene_coseguro, coseguro_consulta, coseguro_guardia, coseguro_laboratorio, coseguro_imagenes,
   descuento_medicamentos, salud_reproductiva, territorio, cartilla, alianzas)
VALUES
  -- Plan 18-30
  ('Suma Salud', 'Plan 18-30', 0, 'joven',
   true, true, true, false,
   '2', 18, 30,
   true, '$6.000', '$4.000 - $8.000', '$0', '',
   40, 'Cobertura en métodos anticonceptivos', 'Nacional y países limítrofes',
   'Base (Hospital Español, Medikids para niños)', 'Triunfo Seguros, Assist Card'),

  -- Plan 1000
  ('Suma Salud', 'Plan 1000', 0, 'basico',
   true, true, true, false,
   '5', 0, 0,
   true, '$7.000 - $15.000', '$7.000 - $15.000', 'Hasta $4.500', 'Desde $3.500 hasta $30.000',
   40, 'Cobertura en métodos anticonceptivos', 'Nacional y países limítrofes',
   'Base (Clínica Esperanza, Clínica Godoy Cruz, Hospital Santa Isabel, Clínica San Dona)', ''),

  -- Plan 2000
  ('Suma Salud', 'Plan 2000', 0, 'intermedio',
   true, true, true, false,
   '5', 0, 0,
   true, '$6.000 fijo', '$4.000 - $8.000', '$0 (sin cargo)', '',
   40, 'Cobertura en métodos anticonceptivos', 'Nacional y países limítrofes',
   'Ampliada (Hospital Español, Medikids, CER, Clínica del Pilar)', ''),

  -- Plan 3000
  ('Suma Salud', 'Plan 3000', 0, 'premium',
   true, true, true, false,
   '5', 0, 0,
   false, '', '', '', '',
   50, 'DIU sin costo + métodos anticonceptivos', 'Nacional e Internacional',
   'Completa (Hospital Español, Medikids, Clínica Santa Rosa, Clínica Luján, Red Basa)', '');

-- 3. Clear grilla_compleja (no longer used)
TRUNCATE TABLE public.grilla_compleja RESTART IDENTITY CASCADE;

-- 4. Re-seed monotributo categories with current AFIP health aportes (approximate 2026 values)
TRUNCATE TABLE public.monotributo_categorias RESTART IDENTITY CASCADE;

INSERT INTO public.monotributo_categorias (categoria, aporte_titular, aporte_familiar, orden) VALUES
  ('A', 4771, 3181, 1),
  ('B', 5900, 3933, 2),
  ('C', 8200, 5467, 3),
  ('D', 11500, 7667, 4),
  ('E', 16000, 10667, 5),
  ('F', 22000, 14667, 6),
  ('G', 28000, 18667, 7),
  ('H', 36000, 24000, 8),
  ('I', 48000, 32000, 9);
