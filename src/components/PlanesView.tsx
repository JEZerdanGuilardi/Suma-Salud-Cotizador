import { useState, useMemo } from 'react';
import { useCatalogData } from '@/lib/useCatalogData';
import {
  Building2, Search, Users, Heart, Shield, Globe, Pill, Stethoscope,
  Check, X, Baby, MapPin, Sparkles,
} from 'lucide-react';
import type { ObraSocial } from '@/lib/types';

const TIER_LABELS: Record<string, string> = {
  joven: 'Plan Joven',
  basico: 'Plan Básico',
  intermedio: 'Plan Intermedio',
  premium: 'Plan Premium',
};

const TIER_COLORS: Record<string, string> = {
  joven: 'from-sky-500 to-cyan-600',
  basico: 'from-teal-500 to-emerald-600',
  intermedio: 'from-amber-500 to-orange-600',
  premium: 'from-violet-500 to-fuchsia-600',
};

const TIER_BORDER: Record<string, string> = {
  joven: 'border-sky-500/30',
  basico: 'border-teal-500/30',
  intermedio: 'border-amber-500/30',
  premium: 'border-violet-500/30',
};

export function PlanesView() {
  const { obrasSociales, loading } = useCatalogData();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return obrasSociales.filter((o) =>
      o.obra_social.toLowerCase().includes(search.toLowerCase()) ||
      o.nombre_plan.toLowerCase().includes(search.toLowerCase())
    );
  }, [obrasSociales, search]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Cargando catálogo...</div>;
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Building2 className="w-5 h-5 text-teal-400" /> Catálogo Suma Salud
      </h2>

      {/* Common coverage banner */}
      <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-teal-300 flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4" /> Cobertura base (todos los planes)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-teal-400" /> Atención exclusiva con credencial</div>
          <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-teal-400" /> Consultas en todas las especialidades</div>
          <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-teal-400" /> Urgencias y emergencias 24 hs</div>
          <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-teal-400" /> Internación, cirugía y PMO al 100%</div>
          <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-teal-400" /> Comunidad de beneficios (descuentos)</div>
          <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-teal-400" /> Ingreso: Monotributo, Bono o Particular</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar plan..."
          className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        />
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500">No se encontraron planes.</div>
      )}

      {/* Parto module */}
      <PartoModule />
    </div>
  );
}

function PlanCard({ plan }: { plan: ObraSocial }) {
  return (
    <div className={`bg-slate-900/40 border ${TIER_BORDER[plan.plan_tier]} rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${TIER_COLORS[plan.plan_tier]} px-5 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{plan.nombre_plan}</h3>
            <p className="text-xs text-white/80">{TIER_LABELS[plan.plan_tier]}</p>
          </div>
          {plan.plan_tier === 'intermedio' && (
            <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Recomendado
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/40 rounded-lg p-3 text-center">
            <Users className="w-4 h-4 text-slate-400 mx-auto mb-1" />
            <div className="text-sm font-bold text-white">{plan.limite_personas}</div>
            <div className="text-xs text-slate-500">Integrantes</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 text-center">
            {plan.tiene_coseguro ? (
              <>
                <Stethoscope className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-sm font-bold text-amber-400">Sí</div>
                <div className="text-xs text-slate-500">Coseguro</div>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <div className="text-sm font-bold text-emerald-400">No</div>
                <div className="text-xs text-slate-500">Coseguro</div>
              </>
            )}
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 text-center">
            <Pill className="w-4 h-4 text-teal-400 mx-auto mb-1" />
            <div className="text-sm font-bold text-teal-400">{plan.descuento_medicamentos}%</div>
            <div className="text-xs text-slate-500">Meds. desc.</div>
          </div>
        </div>

        {/* Age restriction for Plan 18-30 */}
        {plan.plan_tier === 'joven' && (
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2 text-xs text-sky-300">
            Edad requerida: {plan.edad_minima} a {plan.edad_maxima} años
          </div>
        )}

        {/* Coseguros detail */}
        {plan.tiene_coseguro && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Coseguros</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <CoseguroRow label="Consultas" value={plan.coseguro_consulta} />
              <CoseguroRow label="Guardias" value={plan.coseguro_guardia} />
              <CoseguroRow label="Laboratorio" value={plan.coseguro_laboratorio} />
              {plan.coseguro_imagenes && <CoseguroRow label="Imágenes" value={plan.coseguro_imagenes} />}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Beneficios</h4>
          <div className="space-y-1.5 text-xs">
            <FeatureRow icon={<Heart className="w-3.5 h-3.5" />} text={plan.salud_reproductiva} />
            <FeatureRow icon={<Globe className="w-3.5 h-3.5" />} text={plan.territorio} />
            <FeatureRow icon={<MapPin className="w-3.5 h-3.5" />} text={plan.cartilla} />
            {plan.alianzas && <FeatureRow icon={<Shield className="w-3.5 h-3.5" />} text={plan.alianzas} />}
          </div>
        </div>

        {/* Modalidades */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          <ModBadge active={plan.acepta_prepago} label="Particular" />
          <ModBadge active={plan.acepta_monotributo} label="Monotributo" />
          <ModBadge active={plan.acepta_bono} label="Bono de Sueldo" />
        </div>
      </div>
    </div>
  );
}

function CoseguroRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-800/30 rounded px-2.5 py-1.5">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-2 text-slate-300">
      <span className="text-teal-400 flex-shrink-0 mt-0.5">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function ModBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
        active ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : 'bg-slate-800/50 text-slate-600'
      }`}
    >
      {active ? <Check className="w-3 h-3 inline mr-1" /> : <X className="w-3 h-3 inline mr-1" />}
      {label}
    </span>
  );
}

function PartoModule() {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Baby className="w-5 h-5" /> Módulo de Parto
        </h3>
        <p className="text-xs text-white/80 mt-1">Para mujeres con embarazos avanzados que desean ingresar a la obra social</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PartoPrice label="Parto Normal" value="$3.450.000" />
          <PartoPrice label="Cesárea" value="$3.700.000" />
          <PartoPrice label="Cesárea + Tripsia" value="$4.300.000" />
          <PartoPrice label="Prestadores superadores" value="$4.300.000" />
        </div>
        <div className="bg-slate-800/40 rounded-lg p-3 text-xs text-slate-400 space-y-1">
          <p>Valores de Julio 2026.</p>
          <p>Pago: total en un solo pago con tarjeta de crédito o débito al momento de ingresar. No se admiten cuotas.</p>
        </div>
      </div>
    </div>
  );
}

function PartoPrice({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/40 rounded-lg p-3 flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-sm font-bold text-rose-300">{value}</span>
    </div>
  );
}
