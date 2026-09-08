import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { ObraSocial, MonotributoCategoria, PrecioSumaSalud } from './types';

export function useCatalogData() {
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [monotributo, setMonotributo] = useState<MonotributoCategoria[]>([]);
  const [precios, setPrecios] = useState<PrecioSumaSalud[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [obrasRes, monoRes, preciosRes] = await Promise.all([
      supabase.from('obras_sociales').select('*').order('obra_social'),
      supabase.from('monotributo_categorias').select('*').order('orden'),
      supabase.from('precios_sumasalud').select('*'),
    ]);
    setObrasSociales((obrasRes.data ?? []) as ObraSocial[]);
    setMonotributo((monoRes.data ?? []) as MonotributoCategoria[]);
    setPrecios((preciosRes.data ?? []) as PrecioSumaSalud[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { obrasSociales, monotributo, precios, loading, reload: load };
}
