export type UserRole = 'jefe' | 'supervisor' | 'vendedor' | 'vendedor_senior';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  supervisor_id?: string | null;
  created_at: string;
}

export interface ObraSocial {
  id: string;
  obra_social: string;
  nombre_plan: string;
  costo_base: number;
  acepta_bono: boolean;
  acepta_monotributo: boolean;
  acepta_prepago: boolean;
  permite_jubilados: boolean;
  limite_personas: string;
  plan_tier: 'joven' | 'basico' | 'intermedio' | 'premium';
  edad_minima: number;
  edad_maxima: number;
  tiene_coseguro: boolean;
  coseguro_consulta: string;
  coseguro_guardia: string;
  coseguro_laboratorio: string;
  coseguro_imagenes: string;
  descuento_medicamentos: number;
  salud_reproductiva: string;
  territorio: string;
  cartilla: string;
  alianzas: string;
}

export interface MonotributoCategoria {
  id: string;
  categoria: string;
  aporte_titular: number;
  aporte_familiar: number;
  orden: number;
}

export interface PrecioSumaSalud {
  id: string;
  tipo_plan: string;
  plan: string;
  grupo: string;
  rango_edad: string;
  precio: string;
}

export type Etapa =
  | 'Nuevo'
  | 'Contactado'
  | 'Cotización enviada'
  | 'En seguimiento'
  | 'Reunión agendada'
  | 'Cerrado ganado'
  | 'Cerrado perdido';
  
export type ModalidadPago = 'Prepago' | 'Monotributo' | 'Bono de sueldo';
export type DescuentoTipo = 'porcentaje' | 'monto';

export interface Cotizacion {
  id: string;
  user_id: string;
  email_vendedor: string;
  edad_mayor: number;
  tiene_conyuge: boolean;
  cantidad_hijos: number;
  edad_conyuge: number | null;
  edades_hijos: number[] | null;
  es_jubilado: boolean;
  aplica_afinidad: boolean;
  dia_del_mes: number;
  modalidad_pago: ModalidadPago;
  bono_item_obra_social: number;
  monotributo_categoria: string;
  prepago_presupuesto: number;
  hijos_excedentes: number;
  costo_hijos_extra: number;
  precio_total: number;
  tiene_descuento: boolean;
  descuento_tipo: DescuentoTipo;
  descuento_valor: number;
  precio_original: number;
  precio_con_descuento: number;
  plan_id: string | null;
  obra_social: string;
  nombre_plan: string;
  etapa: Etapa;
  cliente_nombre: string;
  notas: string;
  creado_en: string;
  actualizado_en: string;
}

export interface CotizacionInput {
  edad_mayor: number;
  edades_adherentes: number[];
  aplica_afinidad: boolean;
  dia_del_mes: number;
  modalidad_pago: ModalidadPago;
  bono_item_obra_social: number;
  monotributo_categoria: string;
  prepago_presupuesto: number;
  tiene_descuento: boolean;
  descuento_tipo: DescuentoTipo;
  descuento_valor: number;
  plan_id: string | null;
  obra_social: string;
  nombre_plan: string;
  cliente_nombre: string;
  notas: string;
}

export interface PlanRecomendado {
  plan: ObraSocial;
  precioTotal: number;
  aporteGlobal: number;
  subtotalBase: number;
  diferencia: number;
  alcanza: boolean;
  detalle: string;
}

export type ContactoEstado = 'A contactar' | 'Contactado' | 'Respondio' | 'No responde' | 'No interesado' | 'No se puede actualmente';

export interface Contacto {
  id: string;
  user_id: string;
  email_vendedor: string;
  fecha: string;
  celular: string;
  estado: ContactoEstado;
  observaciones: string;
  creado_en: string;
  actualizado_en: string;
}