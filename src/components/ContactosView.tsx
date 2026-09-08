import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Contacto, ContactoEstado } from '@/lib/types';
import {
  Phone, Plus, X, Trash2, ChevronLeft, ChevronRight,
  CalendarDays, Users, MessageSquare, Pencil,
} from 'lucide-react';

const ESTADOS: ContactoEstado[] = [
  'A contactar', 'Contactado', 'Respondio', 'No responde', 'No interesado', 'No se puede actualmente',
];

const ESTADO_COLORS: Record<ContactoEstado, string> = {
  'A contactar': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'Contactado': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Respondio': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'No responde': 'bg-red-500/15 text-red-300 border-red-500/30',
  'No interesado': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'No se puede actualmente': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const AR_TZ = 'America/Argentina/Buenos_Aires';

function arTodayParts(): { year: number; month: number; day: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);
  return { year, month, day };
}

function toDateStr(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${day}`;
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function ContactosView() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [currentDate, setCurrentDate] = useState(() => {
    const { year, month } = arTodayParts();
    return new Date(year, month, 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContacto, setEditingContacto] = useState<Contacto | null>(null);

  const loadContactos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('fecha', selectedDate)
      .order('creado_en', { ascending: true });
    if (error) { console.error(error); }
    setContactos((data ?? []) as Contacto[]);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    loadContactos();
  }, [loadContactos]);

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }
  function goToToday() {
    const { year, month, day } = arTodayParts();
    const today = new Date(year, month, 1);
    setCurrentDate(today);
    setSelectedDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const todayStr = toDateStr(new Date());

  // Group contactos by seller for admin
  const groupedBySeller = isAdmin ? (() => {
    const groups: Record<string, Contacto[]> = {};
    for (const c of contactos) {
      const key = c.email_vendedor || 'Sin vendedor';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return groups;
  })() : null;

  async function deleteContacto(id: string) {
    if (!confirm('¿Eliminar este contacto?')) return;
    const { error } = await supabase.from('contactos').delete().eq('id', id);
    if (error) { console.error(error); return; }
    loadContactos();
  }

  function openNew() {
    setEditingContacto(null);
    setShowForm(true);
  }

  function openEdit(c: Contacto) {
    setEditingContacto(c);
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-teal-400" /> Contactos
        </h2>
        {!isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" /> Nuevo contacto
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToToday} className="text-sm font-medium text-white capitalize hover:text-teal-400 transition-all">
              {currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: AR_TZ })}
            </button>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={i} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                      : isToday
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25'
                        : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day view */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-white capitalize">{formatDateLong(selectedDate)}</h3>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500">Cargando...</div>
          ) : contactos.length === 0 ? (
            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-lg">
              {isAdmin ? 'Sin contactos registrados este día.' : 'Sin contactos este día. Agrega uno nuevo.'}
            </div>
          ) : isAdmin && groupedBySeller ? (
            <div className="space-y-4">
              {Object.entries(groupedBySeller).map(([seller, items]) => (
                <div key={seller} className="border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-medium text-teal-400">{seller}</span>
                    <span className="text-xs text-slate-500">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((c) => (
                      <ContactoCard
                        key={c.id}
                        contacto={c}
                        showSeller={false}
                        onDelete={() => deleteContacto(c.id)}
                        onEdit={() => openEdit(c)}
                        canEdit={false}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {contactos.map((c) => (
                <ContactoCard
                  key={c.id}
                  contacto={c}
                  showSeller={false}
                  onDelete={() => deleteContacto(c.id)}
                  onEdit={() => openEdit(c)}
                  canEdit={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && !isAdmin && (
        <ContactoForm
          editing={editingContacto}
          fecha={selectedDate}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadContactos(); }}
        />
      )}
    </div>
  );
}

function ContactoCard({
  contacto, showSeller, onDelete, onEdit, canEdit,
}: {
  contacto: Contacto;
  showSeller: boolean;
  onDelete: () => void;
  onEdit: () => void;
  canEdit: boolean;
}) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={`tel:${contacto.celular}`}
            className="flex items-center gap-2 text-white font-medium hover:text-teal-400 transition-all"
          >
            <Phone className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>{contacto.celular}</span>
          </a>
          {showSeller && (
            <div className="text-xs text-teal-400 mt-1">{contacto.email_vendedor}</div>
          )}
          <div className="mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${ESTADO_COLORS[contacto.estado]}`}>
              {contacto.estado}
            </span>
          </div>
          {contacto.observaciones && (
            <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-400">
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{contacto.observaciones}</span>
            </div>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactoForm({
  editing, fecha, onClose, onSaved,
}: {
  editing: Contacto | null;
  fecha: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [celular, setCelular] = useState(editing?.celular ?? '');
  const [estado, setEstado] = useState<ContactoEstado>(editing?.estado ?? 'A contactar');
  const [observaciones, setObservaciones] = useState(editing?.observaciones ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!celular.trim()) {
      alert('Ingresa un número de celular.');
      return;
    }
    setSaving(true);
    const payload = {
      fecha,
      celular: celular.trim(),
      estado,
      observaciones: observaciones.trim(),
    };

    let saveError: string | null = null;
    if (editing) {
      const { error } = await supabase.from('contactos').update(payload).eq('id', editing.id);
      saveError = error?.message ?? null;
    } else {
      const { error } = await supabase.from('contactos').insert(payload);
      saveError = error?.message ?? null;
    }
    setSaving(false);
    if (saveError) alert(saveError);
    else onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white">
            {editing ? 'Editar contacto' : 'Nuevo contacto'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Número de celular</label>
            <input
              type="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              placeholder="Ej: 3511234567"
            />
            {celular && (
              <a
                href={`tel:${celular}`}
                className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 mt-2"
              >
                <Phone className="w-3.5 h-3.5" /> Llamar ahora
              </a>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Estado del contacto</label>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEstado(e)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-all border ${
                    estado === e
                      ? ESTADO_COLORS[e] + ' ring-2 ring-offset-1 ring-offset-slate-900 ring-teal-500/30'
                      : 'bg-slate-800/40 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 resize-none"
              placeholder="Ej: Faltan 2 meses para que se cambie"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium py-2.5 rounded-lg transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar contacto'}
          </button>
        </div>
      </div>
    </div>
  );
}
