/*
Replace cotizaciones pipeline stages with the new sales funnel.
*/

ALTER TABLE public.cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_etapa_check;

UPDATE public.cotizaciones SET etapa = CASE etapa
  WHEN 'Consulta' THEN 'Nuevo'
  WHEN 'Nueva' THEN 'Nuevo'
  WHEN 'Cotizado' THEN 'Cotización enviada'
  WHEN 'Cerrada' THEN 'Cerrado ganado'
  WHEN 'Perdida' THEN 'Cerrado perdido'
  ELSE etapa
END;

ALTER TABLE public.cotizaciones
  ALTER COLUMN etapa SET DEFAULT 'Nuevo';

ALTER TABLE public.cotizaciones ADD CONSTRAINT cotizaciones_etapa_check
  CHECK (etapa IN (
    'Nuevo',
    'Contactado',
    'Cotización enviada',
    'En seguimiento',
    'Reunión agendada',
    'Cerrado ganado',
    'Cerrado perdido'
  ));
