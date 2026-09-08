import { useState } from 'react';
import { useCatalogData } from '@/lib/useCatalogData';
import { formatCurrency } from '@/lib/calculations';
import { Calculator, Table2, Info } from 'lucide-react';

export function MonotributoView() {
  const { monotributo, loading } = useCatalogData();
  const [categoria, setCategoria] = useState('A');
  const [familiares, setFamiliares] = useState(0);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Cargando...</div>;
  }

  const cat = monotributo.find((m) => m.categoria === categoria);
  const aporteTitular = cat ? Number(cat.aporte_titular) : 0;
  const aporteFamiliar = cat ? Number(cat.aporte_familiar) : 0;
  const totalFamiliar = aporteFamiliar * familiares;
  const totalAportes = aporteTitular + totalFamiliar;

  const minAporte = Math.min(...monotributo.map((m) => Number(m.aporte_titular)));
  const maxAporte = Math.max(...monotributo.map((m) => Number(m.aporte_titular)));

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Table2 className="w-5 h-5 text-teal-400" /> Monotributo Oficial
      </h2>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Info className="w-4 h-4" /> Aporte inicial mínimo (Cat. A)
          </div>
          <div className="text-2xl font-bold text-teal-400">{formatCurrency(minAporte)}</div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Info className="w-4 h-4" /> Aporte máximo (Cat. I)
          </div>
          <div className="text-2xl font-bold text-teal-400">{formatCurrency(maxAporte)}</div>
        </div>
      </div>

      {/* Official table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left font-medium px-4 py-3">Categoría</th>
                <th className="text-right font-medium px-4 py-3">Aporte Titular</th>
                <th className="text-right font-medium px-4 py-3">Aporte Familiar</th>
              </tr>
            </thead>
            <tbody>
              {monotributo.map((m) => (
                <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{m.categoria}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(Number(m.aporte_titular))}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(Number(m.aporte_familiar))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculator */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-teal-400" /> Calculadora de Aportes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              {monotributo.map((m) => (
                <option key={m.id} value={m.categoria}>Categoría {m.categoria}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Familiares a cargo</label>
            <input
              type="number"
              min={0}
              max={10}
              value={familiares}
              onChange={(e) => setFamiliares(Number(e.target.value))}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/40 rounded-lg p-3">
            <div className="text-xs text-slate-400">Titular</div>
            <div className="text-lg font-semibold text-white mt-1">{formatCurrency(aporteTitular)}</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3">
            <div className="text-xs text-slate-400">Familiares ({familiares})</div>
            <div className="text-lg font-semibold text-white mt-1">{formatCurrency(totalFamiliar)}</div>
          </div>
          <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3">
            <div className="text-xs text-teal-300">Total mensual</div>
            <div className="text-lg font-bold text-teal-400 mt-1">{formatCurrency(totalAportes)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
