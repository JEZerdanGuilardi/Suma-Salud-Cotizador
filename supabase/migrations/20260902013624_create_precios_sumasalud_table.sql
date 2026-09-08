/*
# Create precios_sumasalud table for per-person age-based pricing
*/
CREATE TABLE IF NOT EXISTS public.precios_sumasalud (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_plan text NOT NULL,
  grupo text NOT NULL,
  tipo_persona text NOT NULL,
  edad_minima int NOT NULL DEFAULT 0,
  edad_maxima int NOT NULL DEFAULT 120,
  precio numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.precios_sumasalud ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_precios_sumasalud" ON public.precios_sumasalud
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_precios_sumasalud" ON public.precios_sumasalud
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_precios_sumasalud" ON public.precios_sumasalud
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_precios_sumasalud" ON public.precios_sumasalud
  FOR DELETE TO authenticated USING (true);
