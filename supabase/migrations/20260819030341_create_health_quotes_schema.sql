/*
# Health Insurance Quote Management System

Creates a full multi-tenant schema for a health insurance quote management app
with role-based access (vendedores / administradores).

1. New Tables
- `profiles`: extends auth.users with a role (admin/vendedor) and display name.
- `obras_sociales` (catálogo): health insurance plans with cost, accepted payment modalities, retired admission, person limit.
- `monotributo_categorias`: official monotributo categories A-I with titular aporte and familiar extra.
- `grilla_compleja`: complex pricing matrix for Plan 200/300 by modality, family structure, and age ranges.
- `cotizaciones`: quotes created by sellers, with full calculation inputs and results, stage tracking.

2. Security
- RLS enabled on every table.
- profiles: authenticated users can read all profiles (needed for admin view & seller names); users update only their own.
- cotizaciones: sellers see/edit only their own rows (matched by user_id); admins see all, can update/delete all.
- Catalog tables (obras_sociales, monotributo_categorias, grilla_compleja): read-only for authenticated; only admins can write.
- A SECURITY DEFINER function `is_admin()` checks raw_app_meta_data.role === 'admin'.

3. Notes
- Owner column `user_id` on cotizaciones defaults to auth.uid() so inserts succeed even when the client omits it.
- `email_vendedor` is denormalized from profiles for reporting convenience.
*/

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Profiles (role + display name)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin','vendedor')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Obras Sociales (Catálogo de Planes)
CREATE TABLE IF NOT EXISTS public.obras_sociales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_social text NOT NULL,
  nombre_plan text NOT NULL,
  costo_base numeric(12,2) NOT NULL DEFAULT 0,
  acepta_bono boolean NOT NULL DEFAULT false,
  acepta_monotributo boolean NOT NULL DEFAULT false,
  acepta_prepago boolean NOT NULL DEFAULT false,
  permite_jubilados boolean NOT NULL DEFAULT false,
  limite_personas text NOT NULL DEFAULT 'sin limite',
  creado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.obras_sociales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obras_select_auth" ON public.obras_sociales;
CREATE POLICY "obras_select_auth" ON public.obras_sociales
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "obras_insert_admin" ON public.obras_sociales;
CREATE POLICY "obras_insert_admin" ON public.obras_sociales
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "obras_update_admin" ON public.obras_sociales;
CREATE POLICY "obras_update_admin" ON public.obras_sociales
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "obras_delete_admin" ON public.obras_sociales;
CREATE POLICY "obras_delete_admin" ON public.obras_sociales
  FOR DELETE TO authenticated USING (public.is_admin());

-- Monotributo Categorías (A-I)
CREATE TABLE IF NOT EXISTS public.monotributo_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL UNIQUE,
  aporte_titular numeric(12,2) NOT NULL DEFAULT 0,
  aporte_familiar numeric(12,2) NOT NULL DEFAULT 0,
  orden int NOT NULL DEFAULT 0
);
ALTER TABLE public.monotributo_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mono_select_auth" ON public.monotributo_categorias;
CREATE POLICY "mono_select_auth" ON public.monotributo_categorias
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mono_insert_admin" ON public.monotributo_categorias;
CREATE POLICY "mono_insert_admin" ON public.monotributo_categorias
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "mono_update_admin" ON public.monotributo_categorias;
CREATE POLICY "mono_update_admin" ON public.monotributo_categorias
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "mono_delete_admin" ON public.monotributo_categorias;
CREATE POLICY "mono_delete_admin" ON public.monotributo_categorias
  FOR DELETE TO authenticated USING (public.is_admin());

-- Grilla Compleja (Plan 200/300)
CREATE TABLE IF NOT EXISTS public.grilla_compleja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_matriz text NOT NULL,
  plan text NOT NULL,
  modalidad text NOT NULL,
  estructura text NOT NULL,
  precio_29 numeric(12,2) NOT NULL DEFAULT 0,
  precio_39 numeric(12,2) NOT NULL DEFAULT 0,
  precio_49 numeric(12,2) NOT NULL DEFAULT 0,
  precio_59 numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.grilla_compleja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grilla_select_auth" ON public.grilla_compleja;
CREATE POLICY "grilla_select_auth" ON public.grilla_compleja
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "grilla_insert_admin" ON public.grilla_compleja;
CREATE POLICY "grilla_insert_admin" ON public.grilla_compleja
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "grilla_update_admin" ON public.grilla_compleja;
CREATE POLICY "grilla_update_admin" ON public.grilla_compleja
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "grilla_delete_admin" ON public.grilla_compleja;
CREATE POLICY "grilla_delete_admin" ON public.grilla_compleja
  FOR DELETE TO authenticated USING (public.is_admin());

-- Cotizaciones
CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email_vendedor text NOT NULL DEFAULT '',
  edad_mayor int NOT NULL DEFAULT 0,
  tiene_conyuge boolean NOT NULL DEFAULT false,
  cantidad_hijos int NOT NULL DEFAULT 0,
  es_jubilado boolean NOT NULL DEFAULT false,
  aplica_afinidad boolean NOT NULL DEFAULT false,
  dia_del_mes int NOT NULL DEFAULT 1,
  modalidad_pago text NOT NULL DEFAULT 'Prepago' CHECK (modalidad_pago IN ('Prepago','Monotributo','Bono de sueldo')),
  bono_item_obra_social numeric(12,2) NOT NULL DEFAULT 0,
  monotributo_categoria text NOT NULL DEFAULT '',
  prepago_presupuesto numeric(12,2) NOT NULL DEFAULT 0,
  hijos_excedentes int NOT NULL DEFAULT 0,
  costo_hijos_extra numeric(12,2) NOT NULL DEFAULT 0,
  precio_total numeric(12,2) NOT NULL DEFAULT 0,
  plan_id uuid REFERENCES public.obras_sociales(id) ON DELETE SET NULL,
  obra_social text NOT NULL DEFAULT '',
  nombre_plan text NOT NULL DEFAULT '',
  etapa text NOT NULL DEFAULT 'Nueva' CHECK (etapa IN ('Nueva','Contactado','Cotizado','Cerrada','Perdida')),
  cliente_nombre text NOT NULL DEFAULT '',
  notas text NOT NULL DEFAULT '',
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cotizaciones_user ON public.cotizaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_etapa ON public.cotizaciones(etapa);

DROP POLICY IF EXISTS "cot_select_own_or_admin" ON public.cotizaciones;
CREATE POLICY "cot_select_own_or_admin" ON public.cotizaciones
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "cot_insert_own" ON public.cotizaciones;
CREATE POLICY "cot_insert_own" ON public.cotizaciones
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cot_update_own_or_admin" ON public.cotizaciones;
CREATE POLICY "cot_update_own_or_admin" ON public.cotizaciones
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "cot_delete_own_or_admin" ON public.cotizaciones;
CREATE POLICY "cot_delete_own_or_admin" ON public.cotizaciones
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Trigger: set email_vendedor from profile on insert
CREATE OR REPLACE FUNCTION public.set_email_vendedor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_vendedor = '' THEN
    SELECT email INTO NEW.email_vendedor FROM public.profiles WHERE id = NEW.user_id;
  END IF;
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_email_vendedor ON public.cotizaciones;
CREATE TRIGGER trg_set_email_vendedor
  BEFORE INSERT OR UPDATE ON public.cotizaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_email_vendedor();
