/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Cliente {
  codigo: string;
  nombre: string;
  rut: string;
  direccion: string;
  telefono: string;
  correo: string;
  logo?: string; // Base64 data URL or external image URL
}

export interface Sistema {
  codigo_sis: string;
  nombre: string;
  descripcion: string;
}

export interface FrecuenciaConfig {
  nombre_freq: string;
  dias_tolerancia: number;
  paso_meses: number; // 0 for sub-monthly (daily, weekly, biweekly)
}

export interface Tecnico {
  codigo_tec: string;
  nombre: string;
  especialidad: string;
  estado: 'Activo' | 'Inactivo';
  telefono?: string;
  correo?: string;
}

export type CriticidadEquipo = 'Alta' | 'Media' | 'Baja';

export interface Equipo {
  id?: string; // Identificador único de fila/plan (ej. CH-01___Mensual o uuid)
  codigo_eq: string;
  cliente: string;
  nombre: string;
  sistema: string;
  marca: string;
  modelo: string;
  frecuencia: string;
  tareas: string; // newline separated protocol steps
  tecnico: string;
  fecha_proxima: string; // YYYY-MM-DD
  cerrada?: string;
  ubicacion?: string;
  numero_serie?: string;
  criticidad?: CriticidadEquipo;
}

export interface RegistroHistorialMP {
  id: string; // unique ID
  codigo_eq: string;
  mes_n: number;
  fecha_real: string; // DD/MM/YYYY
  id_ot: string; // Folio MP-YYYY-MM-XXXX
  comentarios: string;
  tecnico: string;
  duracion_horas?: number;
  repuestos_utilizados?: string;
  tareas_completadas?: string[];
  frecuencia?: string;
  firma_tecnico?: string;
  firma_supervisor?: string;
  firmado_por?: string;
  firmado_supervisor_por?: string;
  fecha_firma_digital?: string;
  ejecucion_digital?: boolean;
}

export type EstadoOrden = 'Pendiente' | 'Cerrada (A tiempo)' | 'Cerrada (Fuera de término)';

export interface OrdenCorrectivo {
  id_ot: string; // Folio MC-YYYY-MM-XXXX
  codigo_eq: string;
  cliente: string;
  fecha_emision: string; // DD/MM/YYYY
  falla_reportada: string;
  fecha_tentativa: string; // DD/MM/YYYY
  dias_tolerancia: number;
  estado: EstadoOrden;
  fecha_real: string; // DD/MM/YYYY
  acciones_realizadas: string;
  tecnico: string;
  repuestos_utilizados?: string;
  costo_estimado?: number;
  prioridad?: 'Urgente' | 'Alta' | 'Media' | 'Baja';
  firma_tecnico?: string;
  firma_supervisor?: string;
  firmado_por?: string;
  firmado_supervisor_por?: string;
  fecha_firma_digital?: string;
  ejecucion_digital?: boolean;
}

export interface OrdenTrabajoOT {
  id_ot: string; // Folio OT-YYYY-MM-XXXX
  codigo_eq: string;
  cliente: string;
  fecha_emision: string; // DD/MM/YYYY
  trabajo_solicitado: string;
  fecha_tentativa: string; // DD/MM/YYYY
  dias_tolerancia: number;
  estado: EstadoOrden;
  fecha_real: string; // DD/MM/YYYY
  acciones_realizadas: string;
  tecnico: string;
  materiales_utilizados?: string;
  prioridad?: 'Urgente' | 'Alta' | 'Media' | 'Baja';
  firma_tecnico?: string;
  firma_supervisor?: string;
  firmado_por?: string;
  firmado_supervisor_por?: string;
  fecha_firma_digital?: string;
  ejecucion_digital?: boolean;
}

export interface PuntoCalibracion {
  punto_nominal: string;
  lectura_patron: string;
  lectura_instrumento: string;
  error_calculado: string;
  conforme: boolean;
}

export type EstadoInstrumento = 'Activo' | 'Baja' | 'Fuera de Servicio';

export interface Instrumento {
  codigo_inst: string; // Ej: "MAN-CH01"
  nombre: string;
  cliente: string;
  equipo_asociado?: string; // Código de equipo principal al que está montado (ej: "CH-01")
  variable_medicion: string; // Presión, Temperatura, Caudal, Nivel, Válvula de Seguridad, Balanza
  rango_operacion: string; // Ej: "0 a 300 PSI"
  tolerancia_emp: string; // Error Máximo Permisible, ej: "± 0.5% FS"
  frecuencia: string; // Semestral, Anual, etc.
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  ubicacion?: string;
  estado: EstadoInstrumento;
  fecha_alta: string; // DD/MM/YYYY
  fecha_proxima?: string; // YYYY-MM-DD (Fecha de inicio / primera calibración para cálculo del plan)
  fecha_baja?: string; // DD/MM/YYYY
  motivo_baja?: string;
  patron_habitual?: string;
  metrologo_habitual?: string;
  notas?: string;
}

export type EstadoCalibracion =
  | 'Pendiente'
  | 'Conforme (A tiempo)'
  | 'Conforme (Fuera de término)'
  | 'No Conforme / Fuera de Tolerancia';

export interface OrdenCalibracion {
  id_ot: string; // Folio CAL-YYYY-MM-XXXX
  codigo_eq: string; // ID equipo / instrumento
  cliente: string;
  instrumento_nombre: string;
  variable_medicion: string; // Presión, Temperatura, Caudal, Nivel, Válvula de Seguridad, Balanza
  rango_operacion: string; // Ej: "0 a 250 PSI", "-50 a 150 °C"
  tolerancia_emp: string; // Error Máximo Permisible, ej: "± 1.0% FS" o "± 0.5 °C"
  frecuencia_calibracion: string; // Semestral, Anual, etc.
  patron_utilizado?: string; // Patrón con trazabilidad, ej: "Fluke 700G08 S/N 49102"
  trazabilidad_patron?: string; // N° Certificado patrón ej: "CERT-MET-2025-992"
  fecha_emision: string; // DD/MM/YYYY
  fecha_programada: string; // DD/MM/YYYY
  fecha_tentativa: string; // DD/MM/YYYY compromiso
  dias_tolerancia: number;
  estado: EstadoCalibracion;
  fecha_real: string; // DD/MM/YYYY
  dictamen?: 'Conforme' | 'Ajustado y Conforme' | 'No Conforme';
  error_max_hallado?: string; // Ej: "+0.35%"
  numero_certificado?: string; // Ej: "CAL-CERT-2026-041"
  metrologo_laboratorio: string; // Nombre del técnico o laboratorio metrológico
  puntos_calibracion?: PuntoCalibracion[];
  observaciones?: string;
  repuestos_utilizados?: string;
  proxima_calibracion?: string; // DD/MM/YYYY
  firma_tecnico?: string;
  firma_supervisor?: string;
  firmado_por?: string;
  firmado_supervisor_por?: string;
  fecha_firma_digital?: string;
  ejecucion_digital?: boolean;
}

export interface CeldaPlanCalibracion {
  id_eq: string;
  instrumento_nombre: string;
  variable: string;
  rango: string;
  tolerancia_emp: string;
  frecuencia: string;
  mes: number;
  mes_label: string;
  fecha_prevista: string;
  fecha_real: string;
  folio_cal: string;
  estado: 'programada' | 'conforme_a_tiempo' | 'conforme_fuera' | 'no_conforme' | 'vencida';
  error_hallado?: string;
  metrologo?: string;
}

export interface OcurrenciaPreventiva {
  fecha: Date;
  mes_n: number;
  seq_key: string;
  folio: string;
}

export interface CeldaPlanMaestro {
  id_eq: string;
  equipo_nombre: string;
  sistema: string;
  frecuencia: string;
  mes: number;
  mes_label: string;
  fecha_prevista: string;
  fecha_real: string;
  folio_ot: string;
  estado: 'programada' | 'completada_a_tiempo' | 'completada_fuera_tiempo' | 'vencida_pendiente';
  tecnico?: string;
  comentarios?: string;
}

export type CriticidadRepuesto = 'Crítico' | 'Media' | 'Baja';

export interface Repuesto {
  id: string; // ID único interno
  codigo_repuesto: string; // Código de inventario (ej. REP-ROD-6312)
  nombre: string; // Nombre de parte
  descripcion?: string; // Especificaciones técnicas y dimensiones
  categoria: string; // Rodamientos, Sellos y Empaques, Filtros, Lubricantes, Eléctrico, Neumático, Hidráulico, Válvulas, Instrumentación, etc.
  cliente: string; // Planta asignada (o 'Todas las Plantas')
  equipos_asociados: string[]; // Lista de códigos de equipo (ej. ['CH-01', 'BOMB-01'])
  criticidad: CriticidadRepuesto; // Crítico, Media, Baja
  stock_actual: number;
  stock_minimo: number; // Punto de reorden
  stock_seguridad?: number;
  unidad_medida: string; // Unidad, Juego/Kit, Litros, Metros, Kg, etc.
  ubicacion_almacen: string; // Ej: Almacén Central - Estante B2 - Gaveta 14
  precio_unitario: number; // Costo unitario
  moneda: string; // USD o $
  proveedor: string; // Nombre proveedor
  contacto_proveedor?: string; // Teléfono / Email
  tiempo_entrega_dias?: number; // Lead time de reposición
  numero_parte_fabricante?: string; // P/N Original OEM
  fecha_ultima_compra?: string; // DD/MM/YYYY o YYYY-MM-DD
  observaciones?: string;
}

export interface MovimientoRepuesto {
  id: string;
  repuesto_id: string;
  codigo_repuesto: string;
  nombre_repuesto: string;
  tipo: 'Entrada' | 'Salida' | 'Ajuste';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  fecha: string; // DD/MM/YYYY HH:mm
  motivo: string; // Motivo de movimiento o compra
  ot_asociada?: string; // Folio de OT / MP / MC si aplica
  equipo_asociado?: string; // Código de equipo intervenido
  solicitante: string; // Técnico o pañolero
}

export type UserRole = 'super_admin' | 'company_admin' | 'company_user';

export type ModuloKey =
  | 'dashboard'
  | 'plan'
  | 'calibracion'
  | 'preventivos'
  | 'correctivos'
  | 'ordenes'
  | 'equipos'
  | 'instrumentos'
  | 'repuestos'
  | 'clientes'
  | 'tecnicos'
  | 'configuracion'
  | 'usuarios';

export type AccionKey =
  | 'crear_editar'
  | 'emitir_ordenes'
  | 'cerrar_ordenes'
  | 'eliminar'
  | 'gestionar_stock'
  | 'imprimir_pdf';

export interface UserPermisos {
  modulos: Record<ModuloKey, boolean>;
  acciones: Record<AccionKey, boolean>;
}

export interface UserProfile {
  uid: string;
  email: string;
  nombre: string;
  cargo?: string;
  role: UserRole;
  empresaCodigo: string;
  empresaNombre: string;
  permisos: UserPermisos;
  activo: boolean;
  inviteId?: string;
}

export interface UserInvite {
  id: string;
  email: string;
  nombre: string;
  cargo?: string;
  role: UserRole;
  empresaCodigo: string;
  empresaNombre: string;
  permisos: UserPermisos;
  activo: boolean;
  claimedUid?: string;
  createdByUid: string;
}

export interface EmpresaUserSummary {
  id: string;
  uid?: string;
  inviteId?: string;
  email: string;
  nombre: string;
  cargo?: string;
  role: UserRole;
  empresaCodigo: string;
  empresaNombre: string;
  permisos: UserPermisos;
  activo: boolean;
}

