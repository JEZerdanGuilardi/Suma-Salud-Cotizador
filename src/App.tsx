import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LoginScreen } from '@/components/LoginScreen';
import { CotizacionesView } from '@/components/CotizacionesView';
import { PlanesView } from '@/components/PlanesView';
import { MonotributoView } from '@/components/MonotributoView';
import { supabase } from '@/lib/supabase';
import type { Cotizacion, Profile } from '@/lib/types';
import {
  FileText, Building2, Table2, LogOut, Loader2, Users, TrendingUp, Phone,
  X, CheckCircle2, Target, Award, BarChart3, Clock, DollarSign, Trophy,
  AlertTriangle, PieChart, Calendar as CalendarIcon, Upload, CalendarClock, PhoneCall, Trash2, FileSpreadsheet,
  User, MessageSquare, Briefcase, ChevronLeft, ChevronRight, Plus, ShieldCheck, UserPlus, Mail, Lock
} from 'lucide-react';

type Tab = 'cotizaciones' | 'planes' | 'monotributo' | 'contactos' | 'admin';

function AppContent() {
  const { session, profile, loading, signOut } = useAuth();
  
  const [tab, setTab] = useState<Tab>('cotizaciones'); 
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loadingCots, setLoadingCots] = useState(true);

  const currentRole = profile?.role || 'vendedor';
  const isJefe = currentRole === 'jefe';
  const isSupervisor = currentRole === 'supervisor';
  const isSenior = currentRole === 'vendedor_senior';

  const loadCotizaciones = useCallback(async () => {
    setLoadingCots(true);
    const { data, error } = await supabase.from('cotizaciones').select('*').order('creado_en', { ascending: false });
    if (!error && data) setCotizaciones(data as Cotizacion[]);
    setLoadingCots(false);
  }, []);

  useEffect(() => { if (session) loadCotizaciones(); }, [session, loadCotizaciones]);

  if (loading) return <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  if (!session || !profile) return <LoginScreen />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'cotizaciones', label: 'Cotizaciones', icon: <FileText className="w-4 h-4" />, show: true },
    { id: 'planes', label: 'Planes', icon: <Building2 className="w-4 h-4" />, show: true },
    { id: 'monotributo', label: 'Monotributo', icon: <Table2 className="w-4 h-4" />, show: true },
    { id: 'contactos', label: 'Bases y Leads', icon: <CalendarIcon className="w-4 h-4" />, show: true },
    { id: 'admin', label: isJefe || isSupervisor ? 'Gerencia y Control' : 'Mi Progreso', icon: <BarChart3 className="w-4 h-4" />, show: true },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-200">
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-600 flex items-center justify-center shadow-md border border-blue-500/30">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white hidden sm:block tracking-wide">Suma Salud</span>
            </div>

            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {tabs.filter((t) => t.show).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    tab === t.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {t.icon}
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-white font-medium leading-tight">{profile.full_name || profile.email}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{currentRole.replace('_', ' ')}</div>
              </div>
              <button onClick={() => signOut()} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Cerrar sesión"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'cotizaciones' && <CotizacionesView cotizaciones={cotizaciones} onReload={loadCotizaciones} />}
        {tab === 'planes' && <PlanesView />}
        {tab === 'monotributo' && <MonotributoView />}
        {tab === 'contactos' && <ContactosManager profile={profile} />}
        {tab === 'admin' && (
          isJefe ? <JefeView cotizaciones={cotizaciones} onReload={loadCotizaciones} /> : 
          isSupervisor ? <SupervisorView cotizaciones={cotizaciones} onReload={loadCotizaciones} profile={profile} /> : 
          <VendedorPerformanceView cotizaciones={cotizaciones} profileEmail={profile.email} role={currentRole} />
        )}
      </main>
    </div>
  );
}

// ==========================================
// 📅 MÓDULO DE CONTACTOS Y CALENDARIO
// ==========================================
function ContactosManager({ profile }: { profile: Profile }) {
  const isJefeOrSup = profile.role === 'jefe' || profile.role === 'supervisor';
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [vendedores, setVendedores] = useState<Profile[]>([]);
  const [selectedVendedores, setSelectedVendedores] = useState<string[]>([]);
  const [pastedData, setPastedData] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadMode, setLoadMode] = useState<'individual' | 'masiva'>(isJefeOrSup ? 'masiva' : 'individual');
  const [singleLead, setSingleLead] = useState({
    nombre: '', telefono: '', edad: '', modalidad: 'Prepago', notas: '', asignadoA: isJefeOrSup ? 'auto' : profile.email
  });

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getSafeDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const loadLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('leads').select('*').order('creado_en', { ascending: false });
    if (!isJefeOrSup) query = query.ilike('asignado', profile.email);
    const { data, error } = await query;
    if (!error && data) setLeads(data);
    setLoading(false);
  }, [isJefeOrSup, profile.email]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => {
    if (isJefeOrSup) {
      supabase.from('profiles').select('*').in('role', ['vendedor', 'vendedor_senior']).then(({ data }) => {
        if (data) {
          setVendedores(data);
          setSelectedVendedores(data.map(v => v.email)); 
        }
      });
    }
  }, [isJefeOrSup]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) setPastedData(prev => prev ? prev + '\n' + text : text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const handleBulkLoad = async () => {
    if (!pastedData.trim()) return alert("Pegá los datos o subí un archivo CSV primero.");
    if (isJefeOrSup && selectedVendedores.length === 0) return alert("Seleccioná al menos un vendedor.");

    setSaving(true);
    const lines = pastedData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newLeads = [];
    let turnIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t-]/);
      const nombre = parts[0]?.trim() || `Contacto Desconocido ${Math.floor(Math.random()*1000)}`;
      const telefono = parts[1]?.trim() || 'Sin teléfono';
      const asignadoA = isJefeOrSup ? selectedVendedores[turnIndex % selectedVendedores.length] : profile.email;
      const fechaAgenda = getSafeDateString(selectedDate);

      newLeads.push({
        nombre, telefono, asignado: asignadoA || 'Sin asignar', estado: 'Nuevo', modalidad: 'Prepago',
        fecha_agenda: fechaAgenda
      });
      turnIndex++;
    }

    const { error } = await supabase.from('leads').insert(newLeads);
    setSaving(false);
    
    if (error) {
      alert(`Error al guardar: ${error.message}`);
    } else {
      setPastedData('');
      loadLeads();
    }
  };

  const handleSingleLoad = async () => {
    if (!singleLead.telefono.trim()) return alert("El teléfono es obligatorio.");
    setSaving(true);
    
    let asignadoA = singleLead.asignadoA;
    if (isJefeOrSup && asignadoA === 'auto') {
      asignadoA = vendedores.length > 0 ? vendedores[Math.floor(Math.random() * vendedores.length)].email : profile.email;
    }

    const payload = {
      nombre: singleLead.nombre.trim() || 'Sin nombre',
      telefono: singleLead.telefono.trim(),
      edad: singleLead.edad.trim(),
      modalidad: singleLead.modalidad,
      notas: singleLead.notas.trim(),
      asignado: asignadoA,
      estado: 'Nuevo',
      fecha_agenda: getSafeDateString(selectedDate)
    };

    const { error } = await supabase.from('leads').insert([payload]);
    setSaving(false);

    if (error) {
      alert(`Error al guardar: ${error.message}`);
    } else {
      setSingleLead({ nombre: '', telefono: '', edad: '', modalidad: 'Prepago', notas: '', asignadoA: isJefeOrSup ? 'auto' : profile.email });
      loadLeads();
    }
  };

  const handleEstadoChange = async (id: string, nuevoEstado: string) => {
    setLeads(leads.map(l => l.id === id ? { ...l, estado: nuevoEstado } : l));
    await supabase.from('leads').update({ estado: nuevoEstado }).eq('id', id);
  };

  const handleFechaChange = async (id: string, nuevaFecha: string) => {
    setLeads(leads.map(l => l.id === id ? { ...l, fecha_agenda: nuevaFecha } : l));
    await supabase.from('leads').update({ fecha_agenda: nuevaFecha }).eq('id', id);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("¿Eliminar este contacto?")) return;
    setLeads(leads.filter(l => l.id !== id));
    await supabase.from('leads').delete().eq('id', id);
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  
  const getDaysArray = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
  };

  const isSelected = (day: number) => {
    return day === selectedDate.getDate() && currentMonth.getMonth() === selectedDate.getMonth() && currentMonth.getFullYear() === selectedDate.getFullYear();
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  };

  const formatMonthYear = (date: Date) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[date.getMonth()]} De ${date.getFullYear()}`;
  };

  const formatFullDate = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${days[date.getDay()]}, ${date.getDate()} De ${months[date.getMonth()]} De ${date.getFullYear()}`;
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m, d] = e.target.value.split('-');
    if (y && m && d) {
      const newDate = new Date(Number(y), Number(m) - 1, Number(d));
      setSelectedDate(newDate);
      setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1)); 
    }
  };

  const strSelectedDate = getSafeDateString(selectedDate);
  const misLeads = (isJefeOrSup ? leads : leads.filter(l => (l.asignado || '').toLowerCase() === profile.email.toLowerCase()))
                   .filter(l => l.fecha_agenda === strSelectedDate || (!l.fecha_agenda && isToday(selectedDate.getDate())));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-blue-400" /> Suma Salud - Gestión de Bases
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">Asignación de datos, agendamiento de fechas y recordatorios.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 xl:col-span-4 bg-[#0f1523] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
            <div className="text-base font-semibold text-white">{formatMonthYear(currentMonth)}</div>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white"><ChevronRight className="w-5 h-5"/></button>
          </div>

          <div className="grid grid-cols-7 gap-y-4 text-center">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="text-xs font-medium text-slate-500">{d}</div>
            ))}
            {getDaysArray().map((day, index) => {
              if (!day) return <div key={`empty-${index}`}></div>;
              const isSel = isSelected(day);
              const isTod = isToday(day);
              return (
                <div key={day} className="flex justify-center">
                  <button
                    onClick={() => handleDayClick(day)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm transition-all ${
                      isSel ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] font-bold' : isTod ? 'border border-blue-500/50 text-blue-400 font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6 border-b border-slate-800 pb-4">
            <div className="flex gap-2">
              <button onClick={() => setLoadMode('individual')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${loadMode === 'individual' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}>Carga Individual</button>
              {isJefeOrSup && <button onClick={() => setLoadMode('masiva')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${loadMode === 'masiva' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}>Carga Masiva</button>}
            </div>
          </div>

          {loadMode === 'individual' ? (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-400 mb-1">Nombre</label><input type="text" value={singleLead.nombre} onChange={(e) => setSingleLead({...singleLead, nombre: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none" placeholder="Ej: Juan Perez" /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono</label><input type="text" value={singleLead.telefono} onChange={(e) => setSingleLead({...singleLead, telefono: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none" placeholder="261..." /></div>
                <div><label className="block text-xs font-semibold text-blue-400 mb-1">Fecha Agenda</label><input type="date" value={getSafeDateString(selectedDate)} onChange={handleDateInputChange} className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2.5 text-sm text-blue-300 focus:border-blue-500 outline-none" /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1">Modalidad</label><select value={singleLead.modalidad} onChange={(e) => setSingleLead({...singleLead, modalidad: e.target.value})} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"><option value="Prepago">Prepago</option><option value="Relación de Dependencia">Relación de Dependencia</option><option value="Monotributo">Monotributo</option></select></div>
              </div>
              <div className="flex-1"><label className="block text-xs font-semibold text-slate-400 mb-1">Notas</label><textarea value={singleLead.notas} onChange={(e) => setSingleLead({...singleLead, notas: e.target.value})} className="w-full h-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 resize-none min-h-[80px] outline-none" placeholder='Observaciones...' /></div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                {isJefeOrSup && (
                  <div className="flex items-center gap-2 w-full sm:w-auto"><label className="text-sm text-slate-400">Asignar a:</label><select value={singleLead.asignadoA} onChange={(e) => setSingleLead({...singleLead, asignadoA: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"><option value="auto">Reparto Automático</option>{vendedores.map(v => <option key={v.id} value={v.email}>{v.full_name || v.email}</option>)}</select></div>
                )}
                <button onClick={handleSingleLoad} disabled={saving} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <UserPlus className="w-4 h-4"/>} Guardar Contacto</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 h-full">
              <div className="flex-1 space-y-3 flex flex-col">
                <div className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl">
                  <CalendarIcon className="w-4 h-4 text-blue-400"/>
                  <div className="text-xs text-slate-300 flex-1">Los contactos masivos se agendarán para el día:</div>
                  <input type="date" value={getSafeDateString(selectedDate)} onChange={handleDateInputChange} className="bg-slate-900 border border-blue-500/50 rounded-lg px-2 py-1 text-xs text-blue-300 focus:border-blue-400 outline-none" />
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">Pegar lista o cargar archivo delimitado por comas:</span>
                  <input type="file" accept=".csv,.txt" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" /> Subir archivo .CSV
                  </button>
                </div>

                <textarea value={pastedData} onChange={(e) => setPastedData(e.target.value)} className="w-full flex-1 bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono resize-none min-h-[120px] outline-none" placeholder={`Ejemplo:\nJuan Perez, 2614567890`} />
              </div>
              {isJefeOrSup && (
                <div className="w-full md:w-64 space-y-3 border-l border-slate-800 md:pl-6 flex flex-col">
                  <label className="text-sm font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-amber-400"/> Reparto Equitativo a:</label>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                    {vendedores.map(v => (
                      <label key={v.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={selectedVendedores.includes(v.email)} onChange={(e) => { if (e.target.checked) setSelectedVendedores([...selectedVendedores, v.email]); else setSelectedVendedores(selectedVendedores.filter(mail => mail !== v.email)); }} className="rounded bg-slate-800 border-slate-600 text-blue-500" /> <span className="truncate">{v.full_name || v.email}</span></label>
                    ))}
                  </div>
                  <button onClick={handleBulkLoad} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4">{saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Users className="w-4 h-4"/>} Repartir Lote</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0f1523] border border-slate-800 rounded-2xl p-6 shadow-xl min-h-[250px] w-full">
        <h3 className="text-base font-semibold text-white mb-5">{formatFullDate(selectedDate)} <span className="text-sm font-normal text-slate-400 ml-2">({misLeads.length} agendados)</span></h3>
        
        <div className="space-y-4">
          {loading ? (
             <div className="text-center py-8 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto"/></div>
          ) : misLeads.length === 0 ? (
             <div className="text-center py-10 text-slate-500">No hay agendamientos para esta fecha.</div>
          ) : (
            misLeads.map(lead => {
              const statusColors: Record<string, string> = {
                'Nuevo': 'border-sky-500/30 bg-sky-500/10 text-sky-400',
                'No responde': 'border-red-500/30 bg-red-500/10 text-red-400',
                'Llamar luego': 'border-amber-500/30 bg-amber-500/10 text-amber-400',
                'En gestión': 'border-violet-500/30 bg-violet-500/10 text-violet-400',
                'Descartado': 'border-slate-500/30 bg-slate-500/10 text-slate-400'
              };

              const cleanPhone = lead.telefono.replace(/\D/g, '');
              const waLink = `https://wa.me/${cleanPhone.startsWith('54') ? cleanPhone : '549' + cleanPhone}`;
              const telLink = `tel:${cleanPhone}`;

              return (
                <div key={lead.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                      <div className="text-base font-bold text-white">{lead.nombre !== 'Sin nombre' ? lead.nombre : 'Contacto sin nombre'}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <a href={telLink} className="flex items-center gap-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"><Phone className="w-3.5 h-3.5" /> Llamar</a>
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</a>
                        <span className="text-slate-400 text-sm ml-1">{lead.telefono}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(lead.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <select value={lead.estado} onChange={async (e) => { const val = e.target.value; setLeads(leads.map(l => l.id === lead.id ? { ...l, estado: val } : l)); await supabase.from('leads').update({ estado: val }).eq('id', lead.id); }} className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer font-medium ${statusColors[lead.estado] || statusColors['Nuevo']}`}>
                      <option value="Nuevo" className="bg-slate-900">Nuevo</option><option value="No responde" className="bg-slate-900">No responde</option><option value="En gestión" className="bg-slate-900">En gestión</option><option value="Llamar luego" className="bg-slate-900">Llamar luego</option><option value="Descartado" className="bg-slate-900">Descartado</option>
                    </select>

                    <div className="text-xs text-slate-400 flex items-center gap-x-3 gap-y-1">
                      <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-500" /><input type="date" value={lead.fecha_agenda || getSafeDateString(new Date())} onChange={(e) => handleFechaChange(lead.id, e.target.value)} className="bg-transparent text-slate-300 focus:outline-none w-[100px]" title="Mover a otra fecha" />
                      </div>
                      {lead.edad && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500" /> {lead.edad} años</span>}
                    </div>
                  </div>

                  {lead.notas && (<div className="text-sm text-slate-400 flex gap-2.5 mt-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50"><MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" /><span className="leading-relaxed italic">{lead.notas}</span></div>)}
                  {isJefeOrSup && <div className="text-[10px] text-slate-600 mt-3 pt-3 border-t border-slate-800/50 font-medium">Asignado a: {lead.asignado}</div>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 👑 PANEL DE JEFE (Visión Global y Finanzas)
// ==========================================
function JefeView({ cotizaciones, onReload }: { cotizaciones: Cotizacion[]; onReload: () => void }) {
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');

  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => { if (data) setProfiles(data); });
  }, [showCreateUser]);

  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>();
    cotizaciones.forEach(c => {
      const date = new Date(c.creado_en);
      meses.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(meses).sort().reverse();
  }, [cotizaciones]);

  const dataFiltrada = useMemo(() => {
    if (selectedMonth === 'Todos') return cotizaciones;
    return cotizaciones.filter(c => {
      const date = new Date(c.creado_en);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
    });
  }, [cotizaciones, selectedMonth]);

  const ganadas = dataFiltrada.filter(c => c.etapa === 'Cerrado ganado');
  const perdidas = dataFiltrada.filter(c => c.etapa === 'Cerrado perdido');
  const winRate = ganadas.length > 0 ? Math.round((ganadas.length / (ganadas.length + perdidas.length)) * 100) : 0;
  const volumenTotal = ganadas.reduce((acc, c) => acc + Number(c.precio_total || 0), 0);

  const statsVendedores: Record<string, { ganadas: number; comisiones: number; nombre: string }> = {};
  const planesVendidos: Record<string, number> = {};

  ganadas.forEach(c => {
    const planName = `${c.obra_social} - ${c.nombre_plan}`;
    planesVendidos[planName] = (planesVendidos[planName] || 0) + 1;

    const email = c.email_vendedor || 'Desconocido';
    if (!statsVendedores[email]) {
      const prof = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
      statsVendedores[email] = { ganadas: 0, comisiones: 0, nombre: prof?.full_name || email };
    }
    
    statsVendedores[email].ganadas += 1;
    const prof = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    const umbral = prof?.role === 'supervisor' ? 10 : (prof?.role === 'vendedor_senior' ? 10 : 10);
    if (statsVendedores[email].ganadas > umbral) {
      statsVendedores[email].comisiones += (Number(c.precio_total || 0) * 0.5);
    }
  });

  const totalComisionesEstimadas = Object.values(statsVendedores).reduce((acc, v) => acc + v.comisiones, 0);
  const leaderboard = Object.values(statsVendedores).sort((a, b) => b.ganadas - a.ganadas).slice(0, 3);
  const topPlanes = Object.entries(planesVendidos).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const equipos = useMemo(() => {
    const supervisores = profiles.filter(p => p.role === 'supervisor');
    return supervisores.map(sup => {
      const vendedores = profiles.filter(p => p.supervisor_id === sup.id);
      const miembros = [sup, ...vendedores];
      const emailsMiembros = miembros.map(m => m.email.toLowerCase());

      const ganadasEquipo = ganadas.filter(c => emailsMiembros.includes((c.email_vendedor || '').toLowerCase()));
      const volumenEquipo = ganadasEquipo.reduce((acc, c) => acc + Number(c.precio_total || 0), 0);

      const desgloseMiembros = miembros.map(m => {
        const ventasMiembro = ganadasEquipo.filter(c => (c.email_vendedor || '').toLowerCase() === m.email.toLowerCase());
        const volumen = ventasMiembro.reduce((acc, c) => acc + Number(c.precio_total || 0), 0);
        return { ...m, ventas: ventasMiembro.length, volumen };
      }).sort((a, b) => b.ventas - a.ventas);

      return { supervisor: sup, totalGanadas: ganadasEquipo.length, volumenEquipo, miembros: desgloseMiembros };
    }).sort((a, b) => b.totalGanadas - a.totalGanadas);
  }, [profiles, ganadas]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-400" /> Visión General Directiva</h2>
          <p className="text-sm text-slate-400 mt-0.5">Control financiero, conversión y estrategia corporativa.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 text-sm text-white rounded-xl focus:outline-none focus:border-blue-500">
              <option value="Todos">Histórico Completo</option>{mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={() => setShowCreateUser(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-lg"><ShieldCheck className="w-4 h-4" /> Gestor de Roles</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-sky-950/40 border border-slate-800 p-5 rounded-2xl shadow-lg"><div className="text-sm text-slate-400 flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-sky-400"/> Volumen de Ventas</div><div className="text-3xl font-bold text-white">${volumenTotal.toLocaleString('es-AR')}</div></div>
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-slate-800 p-5 rounded-2xl shadow-lg"><div className="text-sm text-slate-400 flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-400"/> Comisiones (Est.)</div><div className="text-3xl font-bold text-emerald-400">${totalComisionesEstimadas.toLocaleString('es-AR')}</div></div>
        <div className="bg-gradient-to-br from-slate-900 to-amber-950/40 border border-slate-800 p-5 rounded-2xl shadow-lg"><div className="text-sm text-slate-400 flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-amber-400"/> Win Rate</div><div className="text-3xl font-bold text-white">{winRate}% <span className="text-sm font-normal text-slate-500 ml-1">efectividad</span></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400"/> Top Vendedores del Período</h3>
          <div className="space-y-3">
            {leaderboard.map((v, i) => (
              <div key={v.nombre} className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-900 ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-300' : 'bg-amber-700'}`}>{i + 1}</div>
                  <div><div className="text-sm font-medium text-white">{v.nombre}</div><div className="text-xs text-emerald-400 font-semibold">Comisión: ${v.comisiones.toLocaleString('es-AR')}</div></div>
                </div>
                <div className="text-xl font-bold text-white">{v.ganadas} <span className="text-xs font-normal text-slate-500">ventas</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-purple-400"/> Planes más vendidos</h3>
          <div className="space-y-4">
            {topPlanes.map(([plan, count]) => (
              <div key={plan}>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-300 font-medium truncate pr-4">{plan}</span><span className="text-white font-bold flex-shrink-0">{count} cierres</span></div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden"><div className="bg-purple-500 h-full rounded-full" style={{ width: `${(count / topPlanes[0][1]) * 100}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {equipos.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400"/> Rendimiento por Equipos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipos.map(equipo => (
              <div key={equipo.supervisor.id} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-end mb-4 pb-3 border-b border-slate-800/50">
                  <div><div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-0.5">Equipo de</div><div className="text-base font-bold text-white">{equipo.supervisor.full_name || equipo.supervisor.email}</div></div>
                  <div className="text-right"><div className="text-xl font-bold text-emerald-400 leading-none mb-1">{equipo.totalGanadas} <span className="text-xs text-slate-500 font-normal">cierres</span></div><div className="text-xs font-medium text-slate-400">Volumen: ${equipo.volumenEquipo.toLocaleString('es-AR')}</div></div>
                </div>
                <div className="space-y-2">
                  {equipo.miembros.map(m => {
                    const maxVentasEquipo = Math.max(...equipo.miembros.map(x => x.ventas), 1);
                    const width = (m.ventas / maxVentasEquipo) * 100;
                    return (
                      <div key={m.id} className="relative">
                        <div className="flex justify-between items-center text-sm mb-1 relative z-10 px-1"><span className="text-slate-300 truncate pr-2">{m.full_name || m.email} {m.id === equipo.supervisor.id && <span className="text-[10px] text-cyan-500 font-semibold ml-1">(Líder)</span>}</span><span className="text-white font-medium">{m.ventas}</span></div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden"><div className={`h-full rounded-full ${m.id === equipo.supervisor.id ? 'bg-cyan-500/50' : 'bg-slate-700'}`} style={{ width: `${width}%` }}></div></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CotizacionesView cotizaciones={dataFiltrada} onReload={onReload} hideMetrics={true} />
      {showCreateUser && <RolesManagerModal onClose={() => setShowCreateUser(false)} onSaved={() => {setShowCreateUser(false); onReload();}} />}
    </div>
  );
}

// ==========================================
// 🕵️‍♂️ PANEL DE SUPERVISOR (Control Operativo)
// ==========================================
function SupervisorView({ cotizaciones, onReload, profile }: { cotizaciones: Cotizacion[]; onReload: () => void; profile: Profile }) {
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [equipoProfiles, setEquipoProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('*').eq('supervisor_id', profile.id).then(({ data }) => {
      if (data) setEquipoProfiles(data);
    });
  }, [profile.id]);

  const emailsEquipo = equipoProfiles.map(p => p.email.toLowerCase());
  const cotizacionesEquipo = cotizaciones.filter(c => emailsEquipo.includes((c.email_vendedor || '').toLowerCase()) || c.email_vendedor?.toLowerCase() === profile.email.toLowerCase());

  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>();
    cotizacionesEquipo.forEach(c => {
      const date = new Date(c.creado_en);
      meses.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(meses).sort().reverse();
  }, [cotizacionesEquipo]);

  const dataFiltrada = useMemo(() => {
    if (selectedMonth === 'Todos') return cotizacionesEquipo;
    return cotizacionesEquipo.filter(c => {
      const date = new Date(c.creado_en);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
    });
  }, [cotizacionesEquipo, selectedMonth]);

  const congeladas = dataFiltrada.filter(c => {
    if (c.etapa !== 'Cotización enviada') return false;
    const diffDays = Math.floor((new Date().getTime() - new Date(c.creado_en).getTime()) / (1000 * 3600 * 24));
    return diffDays >= 4;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Users className="w-6 h-6 text-blue-400" /> Control de Mi Equipo</h2><p className="text-sm text-slate-400 mt-0.5">Rendimiento, alertas y empuje operativo de vendedores a cargo.</p></div>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 text-sm text-white rounded-xl focus:outline-none focus:border-blue-500">
            <option value="Todos">Histórico Completo</option>{mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-blue-400"/> Progreso hacia la Meta por Vendedor</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800/80"><th className="text-left py-2 font-medium">Vendedor</th><th className="text-center py-2 font-medium">Meta</th><th className="text-center py-2 font-medium">Cierres</th><th className="text-center py-2 font-medium">Estado</th></tr>
              </thead>
              <tbody>
                {equipoProfiles.map(v => {
                  const ganadas = dataFiltrada.filter(c => c.email_vendedor?.toLowerCase() === v.email.toLowerCase() && c.etapa === 'Cerrado ganado').length;
                  const meta = v.role === 'vendedor_senior' ? 20 : 15;
                  const porcentaje = (ganadas / meta) * 100;
                  const color = porcentaje >= 100 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : porcentaje >= 50 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20';
                  
                  return (
                    <tr key={v.id} className="border-b border-slate-800/50 last:border-0">
                      <td className="py-3 text-white font-medium">{v.full_name || v.email}</td><td className="py-3 text-center text-slate-400">{meta}</td><td className="py-3 text-center font-bold text-white">{ganadas}</td>
                      <td className="py-3 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>{porcentaje >= 100 ? 'Logrado' : porcentaje >= 50 ? 'En camino' : 'Atrasado'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-red-950/20 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400"/> Fichas Congeladas</h3>
          <p className="text-xs text-slate-400 mb-4">Enviadas hace más de 4 días sin respuesta.</p>
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[250px] pr-1">
            {congeladas.map(c => {
               const days = Math.floor((new Date().getTime() - new Date(c.creado_en).getTime()) / (1000 * 3600 * 24));
               return (
                <div key={c.id} className="bg-slate-950/60 p-3 rounded-xl border border-red-900/30">
                  <div className="flex justify-between items-start mb-1"><span className="text-sm font-medium text-white truncate pr-2">{c.cliente_nombre}</span><span className="text-xs font-bold text-red-400 whitespace-nowrap">{days} días</span></div>
                  <div className="text-xs text-slate-400 truncate">Vend: {c.email_vendedor}</div>
                </div>
               )
            })}
            {congeladas.length === 0 && <div className="text-sm text-emerald-500/80 text-center py-6 flex flex-col items-center gap-2"><CheckCircle2 className="w-6 h-6"/> Todo al día.</div>}
          </div>
        </div>
      </div>
      <CotizacionesView cotizaciones={dataFiltrada} onReload={onReload} hideMetrics={true} />
    </div>
  );
}

// ==========================================
// 🚀 PANEL DE VENDEDOR (Mi Progreso)
// ==========================================
function VendedorPerformanceView({ cotizaciones, profileEmail, role }: { cotizaciones: Cotizacion[]; profileEmail: string; role: string }) {
  const misCotizaciones = cotizaciones.filter(c => c.email_vendedor?.toLowerCase() === profileEmail.toLowerCase());
  const misGanadas = misCotizaciones.filter(c => c.etapa === 'Cerrado ganado');
  const totalVentas = misGanadas.length;

  let objetivoMeta = 15;
  let umbralComision = 10;
  if (role === 'supervisor') objetivoMeta = 10;
  else if (role === 'vendedor_senior') objetivoMeta = 20;

  const porcentajeMeta = Math.min(Math.round((totalVentas / objetivoMeta) * 100), 100);
  let totalComisionableEstimada = 0;
  misGanadas.forEach((venta, index) => {
    if (index >= umbralComision) totalComisionableEstimada += Number(venta.precio_total || 0) * 0.5;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Award className="w-6 h-6 text-blue-400" /> Mi Progreso</h2></div></div>

      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-4 top-4 text-blue-500/10 pointer-events-none"><Target className="w-32 h-32" /></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold tracking-wider uppercase"><Target className="w-4 h-4" /> Meta Comercial ({objetivoMeta} Ventas)</div>
            <div className="text-3xl font-bold text-white">{totalVentas} <span className="text-lg text-slate-400 font-normal">/ {objetivoMeta} concretadas</span></div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 min-w-[240px]">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium"><span>Progreso</span><span className="text-blue-300 font-bold">{porcentajeMeta}%</span></div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5"><div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000" style={{ width: `${porcentajeMeta}%` }}></div></div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20"><DollarSign className="w-6 h-6" /></div>
          <div><div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Mis Comisiones</div><div className="text-sm text-slate-300">Total acumulado por ventas y sobreproducción</div></div>
        </div>
        <div className="text-3xl font-bold text-emerald-400 bg-slate-950/80 border border-emerald-500/30 px-6 py-3 rounded-xl shadow-inner min-w-[180px] text-center">
          ${totalComisionableEstimada.toLocaleString('es-AR')}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 🛡️ MODAL DE GESTIÓN DE ROLES (Solución de Seguridad)
// ==========================================
function RolesManagerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS PARA CREACIÓN DE NUEVO USUARIO
  const [isCreating, setIsCreating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('vendedor');

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setProfiles(data);
      setLoading(false);
    });
  }, []);

  const updateRole = async (id: string, role: string) => {
    const { error, data } = await supabase.from('profiles').update({ role }).eq('id', id).select();
    
    if (error) {
      alert(`Error al guardar: ${error.message}`);
    } else if (data?.length === 0) {
      alert("Alerta de Seguridad: Supabase bloqueó el cambio.\n\nVe a Supabase > Authentication > Policies y asegúrate de que el 'Jefe' tenga permisos de UPDATE en la tabla Profiles, o deshabilita temporalmente el RLS de esa tabla para poder editar usuarios.");
    } else {
      setProfiles(profiles.map(p => p.id === id ? { ...p, role } : p));
    }
  };

  const updateSupervisor = async (id: string, supId: string) => {
    const { error, data } = await supabase.from('profiles').update({ supervisor_id: supId || null }).eq('id', id).select();
    
    if (error) {
      alert(`Error al guardar: ${error.message}`);
    } else if (data?.length === 0) {
      alert("Alerta de Seguridad: Supabase bloqueó el cambio por las reglas RLS de tu tabla.");
    } else {
      setProfiles(profiles.map(p => p.id === id ? { ...p, supervisor_id: supId || null } : p));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newFullName) return alert("Completa todos los campos");
    if (newPassword.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");
    
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: {
        data: {
          full_name: newFullName,
          role: newRole,
        }
      }
    });

    if (error) {
      alert(`Error al crear usuario: ${error.message}`);
      setLoading(false);
      return;
    }

    alert("¡Usuario creado con éxito! \n\nNOTA TÉCNICA: Si el sistema te cerró la sesión y entró a la cuenta nueva (pantalla en blanco o cambio de perfil), es el comportamiento estándar de seguridad. Solo cierra sesión y vuelve a entrar con tu cuenta de Jefe.");
    
    const { data: perfiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (perfiles) setProfiles(perfiles);
    
    setIsCreating(false);
    setNewEmail('');
    setNewPassword('');
    setNewFullName('');
    setNewRole('vendedor');
    setLoading(false);
  };

  const supervisores = profiles.filter(p => p.role === 'supervisor');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl my-8 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-400" /> Gestor de Permisos y Roles</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl mb-6 transition-all">
            {isCreating ? (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-400" /> Alta de Nuevo Empleado</h3>
                  <button type="button" onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nombre Completo</label>
                    <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Rol Inicial</label>
                    <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none">
                      <option value="vendedor">Vendedor Inicial</option>
                      <option value="vendedor_senior">Vendedor Senior</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="jefe">Jefe de Ventas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Correo Electrónico (Login)</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Contraseña Provisoria</label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none" minLength={6} required />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg flex justify-center items-center gap-2 mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Crear Usuario'}
                </button>
              </form>
            ) : (
              <button onClick={() => setIsCreating(true)} className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-blue-400 transition-all">
                <UserPlus className="w-4 h-4" /> Registrar un nuevo empleado
              </button>
            )}
          </div>

          {loading && !isCreating ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500"/></div>
          ) : (
            <div className="space-y-4">
              {profiles.map(p => (
                <div key={p.id} className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-white font-bold">{p.full_name || 'Sin nombre'}</div>
                    <div className="text-xs text-slate-400">{p.email}</div>
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <select value={p.role} onChange={(e) => updateRole(p.id, e.target.value)} className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer">
                      <option value="jefe">Jefe de Ventas</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="vendedor_senior">Vendedor Senior</option>
                      <option value="vendedor">Vendedor Inicial</option>
                    </select>

                    {(p.role === 'vendedor' || p.role === 'vendedor_senior') && (
                      <select value={p.supervisor_id || ''} onChange={(e) => updateSupervisor(p.id, e.target.value)} className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer">
                        <option value="">Sin supervisor...</option>
                        {supervisores.map(s => <option key={s.id} value={s.id}>Sup: {s.full_name || s.email}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 px-6 py-4 flex justify-end">
          <button onClick={onSaved} className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2 rounded-xl transition-all">Listo</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}