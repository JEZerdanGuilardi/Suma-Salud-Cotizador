import type { Cotizacion, CotizacionInput, DescuentoTipo, MonotributoCategoria, ObraSocial, PrecioSumaSalud, PlanRecomendado } from './types';

export interface CalcResult {
  precioTotal: number;
  detalle: string;
  precioOriginal?: number;
}

// ============================================================================
// ⚙️ CONFIGURACIÓN MANUAL DE DESCUENTOS POR GRUPO FAMILIAR
// ============================================================================
// Dividimos los descuentos según la modalidad de pago porque Suma Salud 
// aplica montos distintos si es Prepago o si es Mixto (Aportes).
const DESCUENTOS_GRUPO_FAMILIAR: Record<string, Record<string, number>> = {
  "Prepago": {
    "1000": 10000, 
    "2000": 10000, 
    "3000": 10000, 
    "18-30": 0     
  },
  "Mixto": {
    "1000": 10000, 
    "2000": 15000, // <- Acá está la regla oculta del Plan 2000 con aportes
    "3000": 10000, 
    "18-30": 0     
  }
};
// ============================================================================

// ── Argentina timezone helpers (UTC-3) ──

export function argentinaToday(): string {
  const now = new Date();
  const arg = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  return `${arg.getFullYear()}-${String(arg.getMonth() + 1).padStart(2, '0')}-${String(arg.getDate()).padStart(2, '0')}`;
}

export function argentinaDateStr(d: Date): string {
  const arg = new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  return `${arg.getFullYear()}-${String(arg.getMonth() + 1).padStart(2, '0')}-${String(arg.getDate()).padStart(2, '0')}`;
}

// ── Family helpers ──

export function edadesAdherentesFromCotizacion(c: Cotizacion): number[] {
  const ages: number[] = [];
  if (c.tiene_conyuge) {
    ages.push(c.edad_conyuge && c.edad_conyuge > 0 ? c.edad_conyuge : 0);
  }
  const hijos = c.edades_hijos ?? [];
  if (hijos.length > 0) {
    ages.push(...hijos);
  } else if (c.cantidad_hijos > 0) {
    ages.push(...Array.from({ length: c.cantidad_hijos }, () => 0));
  }
  return ages;
}

export function familyStructureLabel(cantidadAdherentes: number): string {
  if (cantidadAdherentes <= 0) return 'Titular';
  return `Titular + ${cantidadAdherentes} ${cantidadAdherentes === 1 ? 'adherente' : 'adherentes'}`;
}

export function totalIntegrantes(cantidadAdherentes: number): number {
  return 1 + Math.max(0, cantidadAdherentes);
}

export function determinarGrupo(cantidadAdherentes: number): string {
  return cantidadAdherentes <= 0 ? 'Individual' : 'Grupo Familiar';
}

// ── Aporte global calculation ──

export function calcularAporteGlobalBono(sueldoBrutoImponible: number): number {
  if (sueldoBrutoImponible <= 0) return 0;
  return Math.round(sueldoBrutoImponible * 0.0765 * 100) / 100;
}

export function calcularAporteGlobalMonotributo(
  categoria: string,
  monotributo: MonotributoCategoria[],
  cantidadAportantes: number
): number {
  const cat = monotributo.find((m) => m.categoria === categoria);
  if (!cat) return 0;
  const aporteUnitario = Number(cat.aporte_titular);
  return Math.round(aporteUnitario * cantidadAportantes * 100) / 100;
}

export function calcularAporteBono(
  sueldoBrutoImponible: number,
  cantidadAdherentes: number
): number {
  const totalPers = totalIntegrantes(cantidadAdherentes);
  const aporteTotal = sueldoBrutoImponible * 0.0765;
  const aporteReal = totalPers > 1 ? aporteTotal / totalPers : aporteTotal;
  return Math.round(aporteReal * 100) / 100;
}

export function calcularAporteGlobal(
  input: any,
  monotributo: MonotributoCategoria[]
): number {
  let aporteTotal = 0;

  // 1. Aporte del Titular
  if (input.modalidad_pago === 'Bono de sueldo') {
    aporteTotal += calcularAporteGlobalBono(Number(input.bono_item_obra_social));
  } else if (input.modalidad_pago === 'Monotributo') {
    const aportantes = totalIntegrantes(input.edades_adherentes.length);
    aporteTotal += calcularAporteGlobalMonotributo(input.monotributo_categoria, monotributo, aportantes);
  }

  // 2. Aporte del Cónyuge (Unificación)
  if (input.unificar_aportes) {
    if (input.modalidad_pago_conyuge === 'Bono de sueldo') {
      aporteTotal += calcularAporteGlobalBono(Number(input.bono_item_obra_social_conyuge));
    } else if (input.modalidad_pago_conyuge === 'Monotributo') {
      aporteTotal += calcularAporteGlobalMonotributo(input.monotributo_categoria_conyuge, monotributo, 1);
    }
  }

  return Math.round(aporteTotal * 100) / 100;
}

// ── New Suma Salud per-person pricing engine ──

function mapPlanNumber(nombrePlan: string): string {
  const match = nombrePlan.match(/(\d+(?:-\d+)?)/);
  return match ? match[1] : '';
}

function precioPorEdad(
  precios: PrecioSumaSalud[],
  planNum: string,
  grupo: string,
  edad: number
): number {
  const edadBusqueda = edad > 100 ? 100 : edad;
  
  const row = precios.find(
    (p) =>
      p.plan === planNum &&
      p.grupo === grupo &&
      Number(p.edad_consultada) === edadBusqueda
  );
  if (!row) return 0;
  return Number(row.precio) || 0;
}

export function calcularPrecioPlan(
  input: CotizacionInput,
  plan: ObraSocial,
  precios: PrecioSumaSalud[]
): { total: number; desglose: string[] } {
  const planNum = mapPlanNumber(plan.nombre_plan);

  const desglose: string[] = [];
  let total = 0;

  // 1. Calcular Titular
  const precioTitular = precioPorEdad(precios, planNum, 'Individual', input.edad_mayor);
  total += precioTitular;
  desglose.push(`Titular (edad ${input.edad_mayor}): ${formatCurrency(precioTitular)}`);

  // 2. Calcular Adherentes
  input.edades_adherentes.forEach((edad, i) => {
    if (edad >= 0) {
      const precioAdherente = precioPorEdad(precios, planNum, 'Grupo Familiar', edad);
      total += precioAdherente;
      desglose.push(`Adherente ${i + 1} (edad ${edad}): ${formatCurrency(precioAdherente)}`);
    }
  });

  // 3. Aplicar Descuento Bonificación Familiar
  const adherentesValidos = input.edades_adherentes.filter(edad => edad >= 0).length;
  
  if (adherentesValidos > 0) {
    // Definimos si el cálculo base es Prepago o Mixto para ir a la tabla correcta
    const tipoDescuento = (input.modalidad_pago === 'Prepago' && !(input as any).unificar_aportes) ? 'Prepago' : 'Mixto';
    
    // Buscamos el descuento en la matriz superior
    const descuentoAplicable = DESCUENTOS_GRUPO_FAMILIAR[tipoDescuento]?.[planNum];
    
    if (descuentoAplicable) {
      total -= descuentoAplicable;
    }
  }

  return { total, desglose };
}

// ── Plan eligibility ──

function parseLimitePersonas(limite: string): number {
  const match = limite.match(/\d+/);
  return match ? parseInt(match[0], 10) : 99;
}

function pasaFiltrosSumaSalud(plan: ObraSocial, input: CotizacionInput): boolean {
  const integrantes = totalIntegrantes(input.edades_adherentes.length);
  const limite = parseLimitePersonas(plan.limite_personas);

  if (integrantes > limite) return false;

  if (plan.plan_tier === 'joven') {
    const edades = [input.edad_mayor, ...input.edades_adherentes.filter((e) => e > 0)];
    if (edades.some((edad) => edad < plan.edad_minima || edad > plan.edad_maxima)) return false;
  }

  return true;
}

// ── Discount helpers ──

export function aplicarDescuento(
  subtotal: number,
  tieneDescuento: boolean,
  tipo: DescuentoTipo,
  valor: number
): number {
  if (!tieneDescuento || valor <= 0) return Math.max(0, Math.round(subtotal));
  let resultado: number;
  if (tipo === 'porcentaje') {
    resultado = subtotal * (1 - valor / 100);
  } else {
    resultado = subtotal - valor;
  }
  return Math.max(0, Math.round(resultado));
}

// ── Recommender engine ──

export function recomendarPlanes(
  input: CotizacionInput,
  obrasSociales: ObraSocial[],
  monotributo: MonotributoCategoria[],
  precios: PrecioSumaSalud[]
): PlanRecomendado[] {
  const aporteGlobal = calcularAporteGlobal(input, monotributo);
  const compatibles = obrasSociales.filter((o) => pasaFiltrosSumaSalud(o, input));

  const resultados: any[] = [];

  for (const plan of compatibles) {
    const { total, desglose } = calcularPrecioPlan(input, plan, precios);

    if (total === 0) continue;

    const subtotalBase = Math.max(0, Math.round(total - aporteGlobal));

    const diferencia = aplicarDescuento(
      subtotalBase,
      input.tiene_descuento,
      input.descuento_tipo,
      input.descuento_valor
    );
    const alcanza = diferencia <= 0;
    const detalle = desglose.join(' | ');

    resultados.push({
      plan,
      precioOriginal: total,
      precioTotal: total,
      aporteGlobal,
      subtotalBase,
      diferencia,
      alcanza,
      detalle,
    });
  }

  resultados.sort((a, b) => {
    if (a.alcanza && !b.alcanza) return -1;
    if (!a.alcanza && b.alcanza) return 1;
    return a.diferencia - b.diferencia;
  });

  return resultados as PlanRecomendado[];
}

export function calcularCotizacion(
  input: CotizacionInput,
  plan: ObraSocial | null,
  monotributo: MonotributoCategoria[],
  precios: PrecioSumaSalud[]
): CalcResult {
  if (!plan) {
    return { precioTotal: 0, detalle: 'Sin plan seleccionado' };
  }

  const { total, desglose } = calcularPrecioPlan(input, plan, precios);
  const aporteGlobal = calcularAporteGlobal(input, monotributo);

  const subtotalBase = Math.max(0, Math.round(total - aporteGlobal));
  const precioTotal = aplicarDescuento(
    subtotalBase,
    input.tiene_descuento,
    input.descuento_tipo,
    input.descuento_valor
  );

  let detalle = desglose.join(' | ');
  detalle += ` | Aporte global: ${formatCurrency(aporteGlobal)} | Subtotal base: ${formatCurrency(subtotalBase)} | Diferencia a pagar: ${formatCurrency(precioTotal)}`;

  return {
    precioOriginal: total,
    precioTotal,
    detalle,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}