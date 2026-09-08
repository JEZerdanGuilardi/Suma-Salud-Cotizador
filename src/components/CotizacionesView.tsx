import React, { useState } from 'react';
import type { Cotizacion, CotizacionInput, DescuentoTipo, Etapa, ModalidadPago, ObraSocial, MonotributoCategoria, PrecioSumaSalud, PlanRecomendado } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCatalogData } from '@/lib/useCatalogData';
import {
  calcularCotizacion,
  calcularAporteGlobal,
  recomendarPlanes,
  formatCurrency,
  familyStructureLabel,
  determinarGrupo,
  totalIntegrantes,
  edadesAdherentesFromCotizacion,
} from '@/lib/calculations';
import { Calculator, AlertTriangle, Users, CheckCircle2, DollarSign, Building2, Plus, ArrowRight, Loader2, X, TrendingUp, Clock, Search, Trash2, Pencil, Sparkles, Check, AlertCircle, Tag, FileText as FilePdfIcon, Download } from 'lucide-react';

const ETAPAS: Etapa[] = [
  'Nuevo',
  'Contactado',
  'Cotización enviada',
  'En seguimiento',
  'Reunión agendada',
  'Cerrado ganado',
  'Cerrado perdido',
];

const ETAPA_COLORS: Record<Etapa, string> = {
  Nuevo: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  Contactado: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'Cotización enviada': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'En seguimiento': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Reunión agendada': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'Cerrado ganado': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Cerrado perdido': 'bg-red-500/15 text-red-300 border-red-500/30',
};

const ETAPAS_CERRADAS: Etapa[] = ['Cerrado ganado', 'Cerrado perdido'];

interface Props {
  cotizaciones: Cotizacion[];
  onReload: () => void;
  hideMetrics?: boolean; 
}

// ============================================================================
// FUNCIÓN DE PDF PREMIUM (SOLO TEXTO BIENESTAR SALUD ALINEADO)
// ============================================================================
export function generarDocumentoPDF(data: any) {
  const ventana = window.open('', '_blank');
  if (!ventana) return alert("Habilita las ventanas emergentes para generar el PDF.");

  const nombreTitular = data.cliente_nombre || 'Cliente';
  const tituloDocumento = `Cotizacion Suma Salud - ${nombreTitular}`;

  const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(val);

  // DESGLOSE GRUPO FAMILIAR LISTADO
  const adherentes = data.edades_adherentes || [];
  let grupoFamiliarHtml = `<div style="font-size: 22px; font-weight: 900; margin-bottom: 5px;">Titular: ${nombreTitular} (${data.edad_mayor} años)</div>`;
  
  if (adherentes.length > 0) {
    adherentes.forEach((edad: number, idx: number) => {
      grupoFamiliarHtml += `<div style="font-size: 18px; font-weight: 700; color: #475569; margin-top: 4px;">Adherente ${idx + 1} (${edad} años)</div>`;
    });
  } else {
    grupoFamiliarHtml += `<div style="font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 4px;">(Plan Individual)</div>`;
  }

  // CÁLCULO REVERSO INTELIGENTE DE APORTES Y DESCUENTOS
  let base = Number(data.precio_original) || 0;
  let final = Number(data.precio_total) || 0;
  let descuentoMonto = data.descuento_monto_calculado || 0;
  let subtotal = data.subtotal_calculado || 0;

  if (!data.subtotal_calculado) {
    if (data.tiene_descuento && data.descuento_valor > 0) {
      if (data.descuento_tipo === 'monto') {
        descuentoMonto = Number(data.descuento_valor);
        subtotal = final + descuentoMonto;
      } else if (data.descuento_tipo === 'porcentaje') {
        if (data.descuento_valor < 100) {
          subtotal = final / (1 - (Number(data.descuento_valor) / 100));
          descuentoMonto = subtotal - final;
        } else {
          subtotal = base;
          descuentoMonto = base;
        }
      }
    } else {
      subtotal = final;
    }
  }

  let aportesVal = Math.max(0, base - subtotal);
  let precioRegular = subtotal;

  const aportesRow = aportesVal > 0 ? `
    <tr class="row-grey"><td>Aportes a descontar (${data.modalidad_pago})</td></tr>
    <tr class="row-white"><td style="color: #10b981;">- ${formatMoney(aportesVal)}</td></tr>
  ` : '';

  const descuentoRow = descuentoMonto > 0 ? `
    <tr class="row-grey"><td>Descuento Suma Salud</td></tr>
    <tr class="row-white"><td style="color: #10b981;">- ${formatMoney(descuentoMonto)}</td></tr>
  ` : '';

  const etiquetaTotal = descuentoMonto > 0 ? 'TOTAL MES DE BIENVENIDA' : 'TOTAL FINAL MENSUAL';

  // LÓGICA DINÁMICA DE BENEFICIOS SEGÚN EL PLAN
  const nombrePlanLower = (data.nombre_plan || '').toLowerCase();
  let beneficiosHtml = '';

  if (nombrePlanLower.includes('3000')) {
    beneficiosHtml = `
      <div class="ben-card">
        <div class="ben-title">Cobertura SIN Coseguro</div>
        <div class="ben-desc">Atención exclusiva sólo con credencial. <strong>Consultas en todas las especialidades</strong> médicas sin abonar ningún tipo de copago.</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Farmacia al 50% y Salud Sexual</div>
        <div class="ben-desc">Extraordinario <strong>50% de descuento en medicamentos</strong>. Colocación de DIU sin costo y cobertura completa en métodos anticonceptivos.</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Internación y Quirófano 100%</div>
        <div class="ben-desc">Tranquilidad absoluta. Internación clínica, cirugía y todas las prácticas del Programa Médico Obligatorio (PMO) cubiertas al 100%.</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Asistencia Nacional e Internacional</div>
        <div class="ben-desc">Urgencias y emergencias 24hs. Cobertura extendida a nivel nacional e internacional en países limítrofes. Acceso a la Comunidad de Beneficios.</div>
      </div>
    `;
  } else if (nombrePlanLower.includes('18-30')) {
    beneficiosHtml = `
      <div class="ben-card">
        <div class="ben-title">Plan Individual Joven</div>
        <div class="ben-desc">Atención rápida y directa sólo con credencial. <strong>Consultas cubiertas en todas las especialidades</strong> médicas de nuestra amplia cartilla.</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Farmacia y Salud Preventiva</div>
        <div class="ben-desc">Ahorrá con un <strong>40% de descuento en medicamentos</strong>. Cobertura garantizada en el acceso a métodos anticonceptivos.</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Sistema con Coseguro (Solo Prácticas)</div>
        <div class="ben-desc">Plan optimizado para pagar menos de cuota mensual, abonando <strong>coseguro únicamente en la realización de prácticas médicas</strong>.</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Respaldo Total 24hs e Internación</div>
        <div class="ben-desc">Internación, cirugía y PMO cubiertas al 100%. Urgencias y emergencias 24hs. Cobertura nacional e internacional en países limítrofes.</div>
      </div>
    `;
  } else if (nombrePlanLower.includes('2000')) {
    beneficiosHtml = `
      <div class="ben-card">
        <div class="ben-title">Consultas y Especialidades</div>
        <div class="ben-desc">Atención ágil sólo con credencial. <strong>Consultas médicas en todas las especialidades</strong> de cartilla (Aplica coseguro).</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Farmacia y Cuidado Integral</div>
        <div class="ben-desc">Acceso a un <strong>40% de descuento en medicamentos</strong> de uso ambulatorio. Cobertura preventiva en métodos anticonceptivos.</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Internación y PMO al 100%</div>
        <div class="ben-desc">Tu salud protegida. Internación sanatorial, cirugía y prestaciones del Programa Médico Obligatorio (PMO) con cobertura del 100%.</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Urgencias y Cobertura Extendida</div>
        <div class="ben-desc">Urgencias y emergencias disponibles las 24hs. Extensión de cobertura nacional e internacional en países limítrofes. Comunidad de Beneficios.</div>
      </div>
    `;
  } else {
    beneficiosHtml = `
      <div class="ben-card">
        <div class="ben-title">Acceso y Especialidades</div>
        <div class="ben-desc">Identificación inmediata sólo con credencial. <strong>Consultas en todas las especialidades</strong> de la cartilla médica (Aplica coseguro).</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Descuentos en Medicamentos</div>
        <div class="ben-desc">Beneficio del <strong>40% de descuento en medicamentos</strong> prescriptos. Inclusión y cobertura en métodos anticonceptivos.</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Internación y Cirugía 100%</div>
        <div class="ben-desc">Seguridad hospitalaria. Cobertura del 100% en gastos de internación clínica, quirúrgica y prácticas del Programa Médico Obligatorio (PMO).</div>
      </div>
      <div class="ben-card">
        <div class="ben-title">Emergencias y Asistencia en Viaje</div>
        <div class="ben-desc">Sistema de urgencias y emergencias activo las 24hs. Asistencia médica con cobertura nacional e internacional en países limítrofes.</div>
      </div>
    `;
  }

  const htmlContenido = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>${tituloDocumento}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
        @page { size: A4; margin: 0; }
        body { font-family: 'Montserrat', sans-serif; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #e5e7eb; }
        .page { width: 210mm; height: 296mm; overflow: hidden; position: relative; background: #ffffff; page-break-after: always; box-sizing: border-box; }
        
        /* HOJA 1: PORTADA FULL IMPACTO REDISEÑADA */
        .page-1 { background: linear-gradient(135deg, #0044cc 0%, #002266 100%); color: white; display: flex; flex-direction: column; padding: 60px; }
        
        /* HEADER CON TEXTOS DUALES Y BIENESTAR CENTRADO */
        .logos-container { display: flex; align-items: center; gap: 30px; margin-bottom: 50px; }
        .logo-box { display: flex; align-items: center; gap: 12px; }
        .logo-box img { width: 45px; height: 45px; border-radius: 10px; background: white; padding: 4px; }
        .logo-text { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; color: white; }
        .logo-sub { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #93c5fd; margin-top: 4px; display: block; }
        .logo-divider { width: 2px; height: 45px; background: rgba(255,255,255,0.2); }
        
        .hero-text { flex: 1; margin-top: 20px; }
        .hero-badge { background: rgba(255, 115, 0, 0.2); border: 1px solid #ff7300; color: #ffab40; padding: 8px 16px; border-radius: 50px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 25px; }
        .hero-text h1 { font-size: 58px; font-weight: 900; line-height: 1.1; margin: 0 0 20px 0; letter-spacing: -1px; }
        .hero-text p { font-size: 22px; font-weight: 400; margin: 0; color: #bfdbfe; line-height: 1.4; max-width: 95%; }
        
        .stats-box { background: white; border-radius: 24px; padding: 40px; color: #1e293b; margin-top: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        .stats-box h3 { color: #ff7300; font-size: 24px; font-weight: 900; margin: 0 0 30px 0; text-transform: uppercase; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .stat-item { background: #f8fafc; padding: 25px; border-radius: 16px; border-left: 8px solid #0055ff; }
        .stat-item.orange { border-color: #ff7300; }
        .stat-num { font-size: 42px; font-weight: 900; color: #94a3b8; line-height: 1; margin-bottom: 10px; }
        .stat-num.blue { color: #0055ff; font-size: 32px; }
        .stat-desc { font-size: 16px; font-weight: 700; color: #475569; line-height: 1.3; }

        /* HOJA 2: LA COTIZACIÓN EXACTA */
        .page-2 { padding: 0; display: flex; flex-direction: column; }
        .p2-header { background: #ff7300; color: white; padding: 20px 60px; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
        .p2-title-box { text-align: center; padding: 40px 60px 20px 60px; }
        .p2-subtitle { color: #64748b; font-size: 16px; text-transform: uppercase; font-weight: 700; letter-spacing: 3px; margin-bottom: 10px; }
        .p2-title { color: #1e293b; font-size: 48px; font-weight: 900; margin: 0; letter-spacing: -1px; }
        
        .table-wrap { padding: 0 80px; flex: 1; }
        table { width: 100%; border-collapse: collapse; text-align: center; }
        .row-grey td { background: #e2e8f0; color: #475569; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 12px; }
        .row-white td { background: #f8fafc; color: #0f172a; font-size: 26px; font-weight: 900; padding: 18px; border-bottom: 6px solid #ffffff; }
        .row-total-label td { background: #ff7300; color: white; font-size: 22px; font-weight: 900; text-transform: uppercase; padding: 20px; letter-spacing: 2px; }
        .row-total-val td { background: #fff7ed; color: #1e293b; font-size: 46px; font-weight: 900; padding: 25px; border: 4px solid #ff7300; border-top: none; }

        .legal-text { padding: 30px 60px; font-size: 12px; color: #94a3b8; text-align: justify; line-height: 1.5; border-top: 1px solid #e2e8f0; }

        /* HOJA 3: PRESTACIONES LLENAS */
        .page-3 { padding: 60px; display: flex; flex-direction: column; }
        .p3-header-text { font-size: 36px; font-weight: 900; color: #0055ff; text-transform: uppercase; margin: 0 0 10px 0; line-height: 1; border-bottom: 6px solid #ff7300; padding-bottom: 20px; display: inline-block; }
        .p3-intro { font-size: 18px; color: #475569; font-weight: 600; margin-bottom: 40px; }
        
        .benefits-container { display: grid; grid-template-columns: 1fr; gap: 20px; flex: 1; }
        .ben-card { background: #f8fafc; border: 2px solid #e2e8f0; padding: 30px; border-radius: 16px; display: flex; flex-direction: column; justify-content: center; }
        .ben-title { color: #0055ff; font-size: 22px; font-weight: 900; margin-bottom: 10px; text-transform: uppercase; }
        .ben-desc { color: #334155; font-size: 16px; font-weight: 600; line-height: 1.5; }
      </style>
    </head>
    <body>

      <!-- HOJA 1: PORTADA IMPACTO REDISEÑADA CON TEXTOS DUALES Y BIENESTAR CENTRADO -->
      <div class="page page-1">
        
        <div class="logos-container">
          <!-- Logo Suma Salud -->
          <div class="logo-box">
            <img src="/logo.png" alt="Suma" onerror="this.style.display='none'">
            <div>
              <div class="logo-text">Suma Salud</div>
              <span class="logo-sub">Sistema Médico Privado</span>
            </div>
          </div>
          
          <div class="logo-divider"></div>

          <!-- Texto Bienestar Salud Centrado en la Línea Media -->
          <div class="logo-box">
            <div style="display: flex; flex-direction: column; justify-content: center; height: 45px;">
              <div class="logo-text" style="line-height: 45px;">Bienestar Salud</div>
            </div>
          </div>
        </div>
        
        <div class="hero-text">
          <div class="hero-badge">Propuesta Exclusiva</div>
          <h1>El respaldo médico<br>que tu familia<br>merece.</h1>
          <p>Diseñamos una cobertura a tu medida para que vivas con la tranquilidad de estar en las mejores manos.</p>
        </div>

        <div class="stats-box">
          <h3>Hoy contamos con:</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-num">+100mil</div>
              <div class="stat-desc">Profesionales de la salud a tu disposición</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">+4.000</div>
              <div class="stat-desc">Clínicas, sanatorios y centros de diagnóstico</div>
            </div>
            <div class="stat-item orange">
              <div class="stat-num blue">Guardia Ágil</div>
              <div class="stat-desc">Reservá tu lugar y esperá tu turno desde tu casa</div>
            </div>
            <div class="stat-item orange">
              <div class="stat-num blue">App Suma</div>
              <div class="stat-desc">Trámites, credencial digital y telemedicina 24hs</div>
            </div>
          </div>
        </div>
      </div>

      <!-- HOJA 2: TABLA DE COTIZACIÓN -->
      <div class="page page-2">
        <div class="p2-header">
          | Nueva COTIZACIÓN
        </div>
        <div class="p2-title-box">
          <div class="p2-subtitle">Plan Recomendado</div>
          <div class="p2-title">${data.obra_social} - ${data.nombre_plan}</div>
        </div>

        <div class="table-wrap">
          <table>
            <tr class="row-grey"><td>Grupo Familiar Detallado</td></tr>
            <tr class="row-white"><td>${grupoFamiliarHtml}</td></tr>

            <tr class="row-grey"><td>Valor Lista (Base)</td></tr>
            <tr class="row-white"><td>${formatMoney(base)}</td></tr>

            ${aportesRow}
            ${descuentoRow}

            <tr class="row-total-label">
              <td>${etiquetaTotal}</td>
            </tr>
            <tr class="row-total-val">
              <td>
                ${formatMoney(final)}
                ${descuentoMonto > 0 ? `<div style="font-size: 16px; color: #1e293b; font-weight: 800; margin-top: 15px; text-transform: uppercase; letter-spacing: 0px;">Valor regular mensual: ${formatMoney(precioRegular)}</div>` : ''}
              </td>
            </tr>
          </table>
        </div>

        <div class="legal-text">
          <strong>Cotización generada para:</strong> ${data.cliente_nombre || 'Consumidor Final'} | <strong>Fecha de emisión:</strong> ${data.fecha}<br><br>
          * Los datos exhibidos en el siguiente reporte son una aproximación comercial de los valores finales. Pueden variar por ajustes de precios de las prestadoras de salud correspondientes o dependiendo de la fidelidad de los datos brindados al Cotizador al momento del alta. Suma Salud - Todos los derechos reservados.
        </div>
      </div>

      <!-- HOJA 3: PRESTACIONES DINÁMICAS POR PLAN -->
      <div class="page page-3">
        <div>
          <h2 class="p3-header-text">Alcance de la<br>Cobertura</h2>
          <div class="p3-intro">Principales beneficios garantizados con el plan <strong>${data.nombre_plan}</strong>:</div>
        </div>

        <div class="benefits-container">
          ${beneficiosHtml}
        </div>
      </div>

      <script>
        document.title = "${tituloDocumento}";
        setTimeout(() => { window.print(); }, 800);
      <\/script>
    </body>
    </html>
  `;
  
  ventana.document.write(htmlContenido.replace('<\/script>', '</script>'));
  ventana.document.close();
}
// ============================================================================


export function CotizacionesView({ cotizaciones, onReload, hideMetrics = false }: Props) {
  const { profile } = useAuth();
  const { obrasSociales, monotributo, precios } = useCatalogData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cotizacion | null>(null);
  const [search, setSearch] = useState('');
  const [filterEtapa, setFilterEtapa] = useState<Etapa | 'Todas'>('Todas');
  const [filterVendedor, setFilterVendedor] = useState<string>('Todos');

  const isJefe = profile?.role === 'jefe';
  const isSupervisor = profile?.role === 'supervisor';
  const vendedoresList = Array.from(new Set(cotizaciones.map(c => c.email_vendedor))).filter(Boolean);

  const filtered = cotizaciones.filter((c) => {
    const matchSearch =
      c.cliente_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      c.obra_social?.toLowerCase().includes(search.toLowerCase()) ||
      (c.email_vendedor && c.email_vendedor.toLowerCase().includes(search.toLowerCase()));
    const matchEtapa = filterEtapa === 'Todas' || c.etapa === filterEtapa;
    const matchVendedor = filterVendedor === 'Todos' || c.email_vendedor === filterVendedor;
    return matchSearch && matchEtapa && matchVendedor;
  });

  const totalActivas = cotizaciones.filter((c) => !ETAPAS_CERRADAS.includes(c.etapa)).length;
  const totalCerradas = cotizaciones.filter((c) => c.etapa === 'Cerrado ganado').length;

  async function changeEtapa(c: Cotizacion, etapa: Etapa) {
    let nuevasNotas = c.notas || '';
    
    if (etapa === 'Cerrado perdido') {
      const motivo = window.prompt("Ingresá el motivo de pérdida (ej: Precio, Se fue a la competencia, No contesta):");
      if (motivo && motivo.trim() !== '') {
        nuevasNotas = nuevasNotas ? `${nuevasNotas}\n\n[🚨 PERDIDO POR: ${motivo.toUpperCase()}]` : `[🚨 PERDIDO POR: ${motivo.toUpperCase()}]`;
      }
    }

    try {
      const { error } = await supabase
        .from('cotizaciones')
        .update({ etapa: etapa, notas: nuevasNotas })
        .eq('id', c.id);
        
      if (error) {
        console.error("Error al actualizar etapa:", error.message);
        alert(`No se pudo cambiar la etapa: ${error.message}`);
        return;
      }
      
      onReload();
    } catch (err) {
      console.error("Error inesperado:", err);
    }
  }

  async function deleteCotizacion(id: string) {
    if (!window.confirm('¿Seguro que deseas eliminar esta cotización? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
    if (error) { console.error(error); return; }
    onReload();
  }

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(c: Cotizacion) {
    setEditing(c);
    setShowForm(true);
  }

  function exportarCSV() {
    if (filtered.length === 0) return alert("No hay datos para exportar.");
    
    const headers = ['Fecha', 'Cliente', 'Modalidad', 'Obra Social', 'Plan', 'Vendedor', 'Etapa', 'Diferencia Abonar', 'Notas'];
    const rows = filtered.map(c => [
      new Date(c.creado_en).toLocaleDateString('es-AR'),
      `"${c.cliente_nombre || 'Sin nombre'}"`,
      c.modalidad_pago,
      `"${c.obra_social}"`,
      `"${c.nombre_plan}"`,
      `"${c.email_vendedor || ''}"`,
      c.etapa,
      c.precio_total,
      `"${(c.notas || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SumaSalud_Cotizaciones_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {!hideMetrics && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard icon={<Clock className="w-5 h-5" />} label="Cotizaciones Activas" value={totalActivas.toString()} color="sky" />
            <MetricCard icon={<CheckCircle2 className="w-5 h-5" />} label="Cerrado ganado" value={totalCerradas.toString()} color="emerald" />
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Seguimiento por etapas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {ETAPAS.map((etapa) => {
                const count = cotizaciones.filter((c) => c.etapa === etapa).length;
                return (
                  <button
                    key={etapa}
                    onClick={() => setFilterEtapa(filterEtapa === etapa ? 'Todas' : etapa)}
                    className={`text-center p-3 rounded-lg border transition-all ${
                      filterEtapa === etapa
                        ? ETAPA_COLORS[etapa] + ' ring-2 ring-offset-2 ring-offset-slate-900 ring-white/20'
                        : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-2xl font-bold text-white">{count}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{etapa}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">
          {hideMetrics ? 'Detalle de Cotizaciones' : (isJefe ? 'Panel Global de Cotizaciones' : isSupervisor ? 'Cotizaciones de Mi Equipo' : 'Mis Cotizaciones')}
        </h2>
        <div className="flex gap-3 flex-wrap sm:flex-nowrap flex-1 sm:flex-none">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, obra social..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          
          {(isJefe || isSupervisor) && vendedoresList.length > 0 && (
            <select
              value={filterVendedor}
              onChange={(e) => setFilterVendedor(e.target.value)}
              className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="Todos">Todos los vendedores</option>
              {vendedoresList.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}

          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>

          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Nueva cotización
          </button>
        </div>
      </div>

      {!hideMetrics && filterEtapa !== 'Todas' && (
        <button onClick={() => setFilterEtapa('Todas')} className="text-xs text-blue-400 hover:text-blue-300">
          Quitar filtro de etapa ({filterEtapa})
        </button>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No hay cotizaciones que coincidan con la búsqueda.
          </div>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white truncate">{c.cliente_nombre || 'Sin nombre'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${ETAPA_COLORS[c.etapa] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30'}`}>{c.etapa}</span>
                </div>
                <div className="text-sm text-slate-400 mt-1 space-y-1">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-slate-300">{c.obra_social} - {c.nombre_plan}</span>
                    <span className="text-slate-400">{c.modalidad_pago}</span>
                    {(isJefe || isSupervisor) && c.email_vendedor && <span className="text-blue-400 font-medium">Vendedor: {c.email_vendedor}</span>}
                  </div>
                  <div className="text-xs text-slate-500">{familyStructureLabel(edadesAdherentesFromCotizacion(c).length)}</div>
                  {c.notas && (
                    <div className="text-xs text-amber-500/80 mt-1.5 italic line-clamp-2">Nota: {c.notas}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  {Number(c.precio_total) > 0 ? (
                    <>
                      <div className="text-xs text-slate-400">Diferencia a abonar</div>
                      {c.tiene_descuento && c.precio_original && c.precio_original > c.precio_total && (
                        <div className="text-[10px] text-slate-500 line-through">
                          {formatCurrency(Number(c.precio_original))}
                        </div>
                      )}
                      <div className="text-lg font-semibold text-amber-400">{formatCurrency(Number(c.precio_total))}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs text-slate-400">Cobertura</div>
                      <div className="text-sm font-semibold text-emerald-400">Cubierto 100%</div>
                    </>
                  )}
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(c.creado_en).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                  </div>
                </div>
                <div className="flex gap-1 ml-3 pl-3 border-l border-slate-800">
                  <button onClick={() => {
                    generarDocumentoPDF({
                        fecha: new Date(c.creado_en).toLocaleDateString('es-AR'),
                        cliente_nombre: c.cliente_nombre,
                        modalidad_pago: c.modalidad_pago,
                        edad_mayor: c.edad_mayor,
                        edades_adherentes: c.edades_hijos || [],
                        obra_social: c.obra_social,
                        nombre_plan: c.nombre_plan,
                        precio_original: c.precio_original || c.precio_total, 
                        tiene_descuento: c.tiene_descuento,
                        descuento_tipo: c.descuento_tipo,
                        descuento_valor: c.descuento_valor,
                        precio_total: c.precio_total
                    });
                  }} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all" title="Descargar PDF">
                    <FilePdfIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteCotizacion(c.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800">
              {ETAPAS.map((etapa) => (
                <button
                  key={etapa}
                  onClick={() => changeEtapa(c, etapa)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    c.etapa === etapa ? ETAPA_COLORS[etapa] : 'bg-slate-800/40 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {etapa}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <CotizacionForm
          editing={editing}
          obrasSociales={obrasSociales}
          monotributo={monotributo}
          precios={precios}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); onReload(); }}
        />
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    sky: 'text-sky-400 bg-sky-500/10',
    teal: 'text-teal-400 bg-teal-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
  };
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

interface FormProps {
  editing: Cotizacion | null;
  obrasSociales: ObraSocial[];
  monotributo: MonotributoCategoria[];
  precios: PrecioSumaSalud[];
  onClose: () => void;
  onSaved: () => void;
}

interface AdherenteItem {
  edad: number;
  incluidoMonotributo: boolean;
}

function CotizacionForm({ editing, obrasSociales, monotributo, precios, onClose, onSaved }: FormProps) {
  const [form, setForm] = useState<CotizacionInput>({
    edad_mayor: editing?.edad_mayor ?? 30,
    edades_adherentes: editing ? edadesAdherentesFromCotizacion(editing) : [],
    aplica_afinidad: editing?.aplica_afinidad ?? false,
    dia_del_mes: editing?.dia_del_mes ?? 1,
    modalidad_pago: editing?.modalidad_pago ?? 'Prepago',
    bono_item_obra_social: editing?.bono_item_obra_social ?? 0,
    monotributo_categoria: editing?.monotributo_categoria ?? 'A',
    prepago_presupuesto: editing?.prepago_presupuesto ?? 0,
    tiene_descuento: editing?.tiene_descuento ?? false,
    descuento_tipo: (editing?.descuento_tipo as DescuentoTipo) ?? 'porcentaje',
    descuento_valor: editing?.descuento_valor ?? 0,
    plan_id: editing?.plan_id ?? null,
    obra_social: editing?.obra_social ?? '',
    nombre_plan: editing?.nombre_plan ?? '',
    cliente_nombre: editing?.cliente_nombre ?? '',
    notas: editing?.notas ?? '',
  });

  const [adherentesDetalle, setAdherentesDetalle] = useState<AdherenteItem[]>(() => {
    const edades = editing ? edadesAdherentesFromCotizacion(editing) : [];
    return edades.map(e => ({ edad: e, incluidoMonotributo: false }));
  });
  
  const [saving, setSaving] = useState(false);
  const [recomendaciones, setRecomendaciones] = useState<PlanRecomendado[] | null>(null);
  const [selectedRec, setSelectedRec] = useState<PlanRecomendado | null>(null);

  function update<K extends keyof CotizacionInput>(key: K, value: CotizacionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key !== 'cliente_nombre' && key !== 'notas') {
      setRecomendaciones(null);
      setSelectedRec(null);
    }
  }

  function addAdherente() {
    setAdherentesDetalle(prev => [...prev, { edad: 0, incluidoMonotributo: false }]);
    setForm((f) => ({ ...f, edades_adherentes: [...f.edades_adherentes, 0] }));
    setRecomendaciones(null);
    setSelectedRec(null);
  }

  function updateEdadAdherente(index: number, edad: number) {
    setAdherentesDetalle(prev => {
      const nuevas = [...prev];
      nuevas[index] = { ...nuevas[index], edad };
      return nuevas;
    });
    setForm((f) => {
      const nuevas = [...f.edades_adherentes];
      nuevas[index] = edad;
      return { ...f, edades_adherentes: nuevas };
    });
    setRecomendaciones(null);
    setSelectedRec(null);
  }

  function toggleAdherenteMonotributo(index: number) {
    setAdherentesDetalle(prev => {
      const nuevas = [...prev];
      nuevas[index] = { ...nuevas[index], incluidoMonotributo: !nuevas[index].incluidoMonotributo };
      return nuevas;
    });
    setRecomendaciones(null);
    setSelectedRec(null);
  }

  function removeAdherente(index: number) {
    setAdherentesDetalle(prev => prev.filter((_, i) => i !== index));
    setForm((f) => ({
      ...f,
      edades_adherentes: f.edades_adherentes.filter((_, i) => i !== index),
    }));
    setRecomendaciones(null);
    setSelectedRec(null);
  }

  const catMonotributoSeleccionada = monotributo.find(m => m.categoria === form.monotributo_categoria);
  const valorAporteUnitario = catMonotributoSeleccionada ? catMonotributoSeleccionada.aporte_titular : 0;
  const cantidadAportantesManual = 1 + adherentesDetalle.filter(a => a.incluidoMonotributo).length;
  
  let aporteGlobalPersonalizado = 0;
  if (form.modalidad_pago === 'Monotributo') {
    aporteGlobalPersonalizado = valorAporteUnitario * cantidadAportantesManual;
  } else if (form.modalidad_pago === 'Bono de sueldo') {
    aporteGlobalPersonalizado = form.bono_item_obra_social > 0 ? (form.bono_item_obra_social / 0.03) * 0.072 : 0;
  }

  const grupoActual = determinarGrupo(form.edades_adherentes.length);

  function calcular() {
    let recs = recomendarPlanes(form, obrasSociales, monotributo, precios);
    
    recs = recs.map(rec => {
      let base = rec.precioTotal;
      let subtotal = base;

      if (form.modalidad_pago === 'Monotributo' || form.modalidad_pago === 'Bono de sueldo') {
        subtotal = Math.max(0, base - aporteGlobalPersonalizado);
      }

      let descuentoMonto = 0;
      if (form.tiene_descuento && form.descuento_valor > 0) {
        if (form.descuento_tipo === 'porcentaje') {
          descuentoMonto = subtotal * (form.descuento_valor / 100);
        } else {
          descuentoMonto = form.descuento_valor;
        }
      }

      let diferenciaFinal = Math.max(0, subtotal - descuentoMonto);

      let mensaje = '';
      let alcanza = true;

      if (form.modalidad_pago === 'Prepago' && form.prepago_presupuesto > 0) {
        let diffPresupuesto = form.prepago_presupuesto - diferenciaFinal;
        if (diffPresupuesto >= 0) {
          mensaje = `A favor: Le sobran $${diffPresupuesto.toLocaleString('es-AR')}`;
        } else {
          mensaje = `Diferencia a pagar: $${Math.abs(diffPresupuesto).toLocaleString('es-AR')}`;
          alcanza = false;
        }
      } else if (form.modalidad_pago !== 'Prepago') {
         alcanza = aporteGlobalPersonalizado >= base;
      }

      return {
        ...rec,
        diferencia: diferenciaFinal,
        mensaje_presupuesto: mensaje,
        alcanza: alcanza,
        subtotal_calculado: subtotal,
        descuento_monto_calculado: descuentoMonto
      };
    });

    setRecomendaciones(recs);
    setSelectedRec(null);
  }

  function seleccionarPlan(rec: PlanRecomendado) {
    setSelectedRec(rec);
    setForm((f) => ({
      ...f,
      plan_id: rec.plan.id,
      obra_social: rec.plan.obra_social,
      nombre_plan: rec.plan.nombre_plan,
    }));
  }

  async function handleSave() {
    if (!selectedRec) {
      alert('Calcula y selecciona un plan recomendado antes de guardar.');
      return;
    }
    setSaving(true);
    const payload = {
      edad_mayor: form.edad_mayor,
      tiene_conyuge: false,
      cantidad_hijos: form.edades_adherentes.length,
      edad_conyuge: null,
      edades_hijos: form.edades_adherentes,
      es_jubilado: false,
      aplica_afinidad: form.aplica_afinidad,
      dia_del_mes: form.dia_del_mes,
      modalidad_pago: form.modalidad_pago,
      bono_item_obra_social: form.bono_item_obra_social,
      monotributo_categoria: form.monotributo_categoria,
      prepago_presupuesto: form.prepago_presupuesto,
      etapa: editing?.etapa ?? 'Nuevo',
      plan_id: selectedRec.plan.id,
      obra_social: selectedRec.plan.obra_social,
      nombre_plan: selectedRec.plan.nombre_plan,
      tiene_descuento: form.tiene_descuento,
      descuento_tipo: form.descuento_tipo,
      descuento_valor: form.descuento_valor,
      precio_original: selectedRec.precioTotal,
      precio_con_descuento: selectedRec.diferencia,
      precio_total: selectedRec.diferencia > 0 ? selectedRec.diferencia : 0,
      cliente_nombre: form.cliente_nombre,
      notas: form.notas,
    };

    let saveError: string | null = null;
    if (editing) {
      const { error } = await supabase.from('cotizaciones').update(payload).eq('id', editing.id);
      saveError = error?.message ?? null;
    } else {
      const { error } = await supabase.from('cotizaciones').insert(payload);
      saveError = error?.message ?? null;
    }
    setSaving(false);
    if (saveError) alert(`Error al guardar: ${saveError}`);
    else onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            {editing ? 'Editar cotización' : 'Cotizador inteligente'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* CAJA DE APORTE GLOBAL ESTILO IMAGEN */}
          {(form.modalidad_pago === 'Monotributo' || (form.modalidad_pago === 'Bono de sueldo' && form.bono_item_obra_social > 0)) && (
            <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span>Aporte global: <span className="font-bold text-base">{formatCurrency(aporteGlobalPersonalizado)}</span></span>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Nombre del cliente</label>
            <input
              type="text"
              value={form.cliente_nombre}
              onChange={(e) => update('cliente_nombre', e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="Nombre y apellido"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Modalidad de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Prepago', 'Monotributo', 'Bono de sueldo'] as ModalidadPago[]).map((m) => (
                <button
                  key={m}
                  onClick={() => update('modalidad_pago', m)}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                    form.modalidad_pago === m ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Edad titular</label>
              <input
                type="number"
                min={0}
                max={120}
                value={form.edad_mayor}
                onChange={(e) => update('edad_mayor', Number(e.target.value))}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            
            {form.modalidad_pago === 'Prepago' && (
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Presupuesto que busca ($)</label>
                <input
                  type="number"
                  min={0}
                  value={form.prepago_presupuesto}
                  onChange={(e) => update('prepago_presupuesto', Number(e.target.value))}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="Ej: 50000"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-slate-300">Adherentes</label>
              <button
                type="button"
                onClick={addAdherente}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-300 hover:text-blue-200 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" /> Añadir miembro
              </button>
            </div>
            {adherentesDetalle.length === 0 && (
              <p className="text-xs text-slate-500">Sin adherentes. El grupo queda como Individual.</p>
            )}
            <div className="space-y-2">
              {adherentesDetalle.map((adh, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                  <label className="text-xs text-slate-400 w-24 flex-shrink-0">Adherente {i + 1}</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={adh.edad}
                    onChange={(e) => updateEdadAdherente(i, Number(e.target.value))}
                    className="w-20 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="Edad"
                  />
                  
                  {form.modalidad_pago === 'Monotributo' && (
                    <label className="flex items-center gap-2 text-xs text-blue-300 cursor-pointer ml-2 select-none">
                      <input
                        type="checkbox"
                        checked={adh.incluidoMonotributo}
                        onChange={() => toggleAdherenteMonotributo(i)}
                        className="rounded bg-slate-800 border-slate-600 text-blue-500 w-4 h-4 cursor-pointer"
                      />
                      Incluido en Monotributo
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={() => removeAdherente(i)}
                    className="ml-auto p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                    title="Quitar miembro"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg px-4 py-2.5 flex items-center gap-2 text-xs text-slate-400">
            <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>
              Grupo: <span className="text-slate-200 font-medium">{grupoActual}</span>
              {' · '}{familyStructureLabel(form.edades_adherentes.length)}
            </span>
          </div>

          {form.modalidad_pago === 'Monotributo' && (
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Categoría de monotributo</label>
              <select
                value={form.monotributo_categoria}
                onChange={(e) => update('monotributo_categoria', e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {monotributo.map((m) => (
                  <option key={m.id} value={m.categoria}>
                    Categoría {m.categoria} - Aporte unitario: {formatCurrency(m.aporte_titular)}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-400 mt-1">
                Titular (1) + {adherentesDetalle.filter(a => a.incluidoMonotributo).length} adherente(s) tildado(s) × aporte unitario
              </div>
            </div>
          )}

          {form.modalidad_pago === 'Bono de sueldo' && (
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Ítem obra social en recibo ($)</label>
              <input
                type="number"
                min={0}
                value={form.bono_item_obra_social}
                onChange={(e) => update('bono_item_obra_social', Number(e.target.value))}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <p className="text-xs text-slate-500 mt-1">
                Fórmula de descuento de aportes: (Monto / 0.03) × 0.072
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Notas (opcional)</label>
            <textarea
              value={form.notas}
              onChange={(e) => update('notas', e.target.value)}
              rows={2}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
              placeholder="Observaciones..."
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => update('tiene_descuento', !form.tiene_descuento)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                form.tiene_descuento
                  ? 'bg-teal-800/40 text-teal-400 border-teal-600/40'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4" />
              Aplicar Descuento Suma Salud
            </button>
            {form.tiene_descuento && (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex rounded-lg overflow-hidden border border-slate-700">
                  <button
                    onClick={() => update('descuento_tipo', 'porcentaje')}
                    className={`px-3 py-2 text-xs font-medium transition-all ${
                      form.descuento_tipo === 'porcentaje' ? 'bg-teal-500 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => update('descuento_tipo', 'monto')}
                    className={`px-3 py-2 text-xs font-medium transition-all ${
                      form.descuento_tipo === 'monto' ? 'bg-teal-500 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    $
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.descuento_valor}
                  onChange={(e) => update('descuento_valor', Number(e.target.value))}
                  className="w-28 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  placeholder={form.descuento_tipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 5000'}
                />
              </div>
            )}
          </div>

          <button
            onClick={calcular}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-lg transition-all border border-slate-700 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            Calcular y recomendar planes
          </button>

          {/* LISTADO DE RECOMENDACIONES CON MANEJO DE ERROR POR EDADES */}
          {recomendaciones !== null && (
            <div className="space-y-3 mt-6">
              <div className="flex items-end justify-between border-b border-slate-800 pb-2 mb-4">
                <h3 className="text-sm font-semibold text-white">Planes recomendados</h3>
                {(form.modalidad_pago === 'Monotributo' || form.modalidad_pago === 'Bono de sueldo') && (
                  <div className="text-xs text-slate-400">
                    Aporte global: {formatCurrency(aporteGlobalPersonalizado)}
                  </div>
                )}
              </div>

              {recomendaciones.length === 0 ? (
                <div className="text-center py-6 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-medium text-slate-300">No hay planes disponibles para estas edades.</p>
                  <p className="text-xs text-slate-500 mt-1 px-4">Verificá que las edades cargadas ({form.edad_mayor} y adherentes) se encuentren dentro de los topes permitidos en el tarifario de Suma Salud.</p>
                </div>
              ) : (
                recomendaciones.map((rec) => {
                  const isSelected = selectedRec?.plan.id === rec.plan.id;
                  const isCubierto = rec.alcanza && form.modalidad_pago !== 'Prepago';

                  return (
                    <button
                      key={rec.plan.id}
                      onClick={() => seleccionarPlan(rec)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected ? 'ring-2 ring-blue-500/50' : 'hover:border-slate-500'
                      } ${
                        isCubierto 
                          ? 'bg-[#061f1c] border-[#0f3d35]' 
                          : 'bg-slate-900/40 border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-semibold text-white">{rec.plan.obra_social} - {rec.plan.nombre_plan}</span>
                            {isCubierto && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
                                <Check className="w-3 h-3" /> Alcanza
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">{rec.detalle}</div>
                        </div>
                        <div className="text-right flex flex-col items-end justify-center">
                          {form.tiene_descuento && (rec as any).descuento_monto_calculado > 0 && !isCubierto && (
                            <div className="text-[11px] text-slate-500 line-through mb-0.5">
                              {formatCurrency((rec as any).subtotal_calculado)}
                            </div>
                          )}
                          
                          <div className="text-lg font-bold text-white">
                            {isCubierto ? '$ 0' : formatCurrency(rec.diferencia)}
                          </div>
                          
                          {isCubierto ? (
                            <div className="text-[10px] text-emerald-400 font-medium mt-0.5">Cubierto 100%</div>
                          ) : (
                            <div className="text-[10px] text-amber-500 font-medium mt-0.5">
                              Diferencia a pagar: {formatCurrency(rec.diferencia)}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {selectedRec && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  generarDocumentoPDF({
                      fecha: new Date().toLocaleDateString('es-AR'),
                      cliente_nombre: form.cliente_nombre,
                      modalidad_pago: form.modalidad_pago,
                      edad_mayor: form.edad_mayor,
                      edades_adherentes: form.edades_adherentes,
                      obra_social: selectedRec.plan.obra_social,
                      nombre_plan: selectedRec.plan.nombre_plan,
                      precio_original: selectedRec.precioTotal, 
                      tiene_descuento: form.tiene_descuento,
                      descuento_tipo: form.descuento_tipo,
                      descuento_valor: form.descuento_valor,
                      precio_total: selectedRec.diferencia,
                      subtotal_calculado: (selectedRec as any).subtotal_calculado,
                      descuento_monto_calculado: (selectedRec as any).descuento_monto_calculado
                  });
                }}
                type="button"
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-lg transition-all border border-slate-700 flex items-center justify-center gap-2 shadow-md"
              >
                <FilePdfIcon className="w-4 h-4 text-blue-400" />
                Descargar Presupuesto
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? 'Guardando...' : editing ? 'Actualizar Cotización' : 'Guardar Ficha'}
                {!saving && <Check className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}