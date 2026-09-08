/*
# Contactos table + updated etapa constraint
*/

CREATE TABLE IF NOT EXISTS public.contactos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email_vendedor text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  celular text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'A contactar' CHECK (estado IN ('A contactar','Contactado','Respondio','No responde','No interesado','No se puede actualmente')),
  observaciones text NOT NULL DEFAULT '',
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contactos_user ON public.contactos(user_id);
CREATE INDEX IF NOT EXISTS idx_contactos_fecha ON public.contactos(fecha);

DROP POLICY IF EXISTS "contactos_select_own_or_admin" ON public.contactos;
CREATE POLICY "contactos_select_own_or_admin" ON public.contactos
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "contactos_insert_own" ON public.contactos;
CREATE POLICY "contactos_insert_own" ON public.contactos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contactos_update_own_or_admin" ON public.contactos;
CREATE POLICY "contactos_update_own_or_admin" ON public.contactos
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "contactos_delete_own_or_admin" ON public.contactos;
CREATE POLICY "contactos_delete_own_or_admin" ON public.contactos
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.set_contacto_email()
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

DROP TRIGGER IF EXISTS trg_set_contacto_email ON public.contactos;
CREATE TRIGGER trg_set_contacto_email
  BEFORE INSERT OR UPDATE ON public.contactos
  FOR EACH ROW EXECUTE FUNCTION public.set_contacto_email();

-- Drop OLD constraint first, then migrate data, then add new constraint
ALTER TABLE public.cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_etapa_check;
UPDATE public.cotizaciones SET etapa = 'Consulta' WHERE etapa NOT IN ('Consulta','Contactado','Cerrada','Perdida');
ALTER TABLE public.cotizaciones ADD CONSTRAINT cotizaciones_etapa_check
  CHECK (etapa IN ('Consulta','Contactado','Cerrada','Perdida'));
