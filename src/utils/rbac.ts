/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AccionKey, ModuloKey, UserPermisos, UserProfile, UserRole } from '../types';

export const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'luismarcelosanchez1974@gmail.com';

export const MODULOS_META: Array<{ key: ModuloKey; label: string; desc: string }> = [
  { key: 'dashboard', label: 'Panel de Control & KPI', desc: 'Indicadores ejecutivos y gráficos de cumplimiento' },
  { key: 'plan', label: 'Plan Maestro Anual', desc: 'Matriz anual de preventivos y proyección de años' },
  { key: 'calibracion', label: 'Plan & Calibración (CAL)', desc: 'Plan anual de calibración, emisión, cierre y certificados' },
  { key: 'preventivos', label: 'Preventivos (MP)', desc: 'Emisión mensual y cierre de órdenes preventivas' },
  { key: 'correctivos', label: 'Correctivos (MC)', desc: 'Gestión de fallas e incidencias no programadas' },
  { key: 'ordenes', label: 'Trabajos & OT', desc: 'Órdenes de trabajo de mejoras e instalaciones' },
  { key: 'equipos', label: 'Equipos & Maquinaria', desc: 'Padrón de activos y frecuencias de mantenimiento' },
  { key: 'instrumentos', label: 'Instrumentos (Metrología)', desc: 'Padrón de instrumentos, altas y bajas metrológicas' },
  { key: 'repuestos', label: 'Repuestos & Insumos', desc: 'Inventario de repuestos críticos, precios y stock' },
  { key: 'clientes', label: 'Plantas y Clientes', desc: 'Ficha e imagen corporativa de la empresa' },
  { key: 'tecnicos', label: 'Cuadrilla Técnica', desc: 'Técnicos, especialidades y desempeño' },
  { key: 'configuracion', label: 'Sistemas & Ajustes', desc: 'Sistemas de planta, frecuencias y respaldos' },
  { key: 'usuarios', label: 'Acceso & Usuarios', desc: 'Creación de usuarios y asignación de permisos' }
];

export const ACCIONES_META: Array<{ key: AccionKey; label: string; desc: string }> = [
  { key: 'crear_editar', label: 'Crear y Editar Registros', desc: 'Dar de alta o modificar equipos, instrumentos, repuestos o configuraciones' },
  { key: 'emitir_ordenes', label: 'Emitir Órdenes / Lotes', desc: 'Emitir nuevas MC, OT y lotes mensuales de Calibración/MP' },
  { key: 'cerrar_ordenes', label: 'Cerrar / Certificar Órdenes', desc: 'Registrar fechas reales, cierres y certificaciones metrológicas' },
  { key: 'gestionar_stock', label: 'Movimientos de Stock', desc: 'Registrar entradas, salidas y ajustes de inventario' },
  { key: 'eliminar', label: 'Eliminar / Dar de Baja', desc: 'Eliminar registros o dar de baja instrumentos/equipos' },
  { key: 'imprimir_pdf', label: 'Imprimir y Exportar PDF', desc: 'Generar documentos impresos, PDFs y reportes' }
];

export function buildPermisos(
  modulos: ModuloKey[],
  acciones: AccionKey[]
): UserPermisos {
  const mMap = {} as Record<ModuloKey, boolean>;
  for (const m of MODULOS_META) {
    mMap[m.key] = modulos.includes(m.key);
  }
  const aMap = {} as Record<AccionKey, boolean>;
  for (const a of ACCIONES_META) {
    aMap[a.key] = acciones.includes(a.key);
  }
  return { modulos: mMap, acciones: aMap };
}

export const ALL_MODULOS_KEYS: ModuloKey[] = MODULOS_META.map(m => m.key);
export const ALL_ACCIONES_KEYS: AccionKey[] = ACCIONES_META.map(a => a.key);

export const FULL_PERMISOS: UserPermisos = buildPermisos(ALL_MODULOS_KEYS, ALL_ACCIONES_KEYS);

export const PERMISO_PRESETS: Array<{
  id: string;
  label: string;
  defaultRole: Exclude<UserRole, 'super_admin'>;
  permisos: UserPermisos;
}> = [
  {
    id: 'admin_empresa',
    label: 'Administrador de Empresa (Todo en su empresa)',
    defaultRole: 'company_admin',
    permisos: buildPermisos(ALL_MODULOS_KEYS, ALL_ACCIONES_KEYS)
  },
  {
    id: 'supervisor',
    label: 'Supervisor de Mantenimiento',
    defaultRole: 'company_user',
    permisos: buildPermisos(
      ['dashboard', 'plan', 'calibracion', 'preventivos', 'correctivos', 'ordenes', 'equipos', 'instrumentos', 'repuestos', 'tecnicos'],
      ['crear_editar', 'emitir_ordenes', 'cerrar_ordenes', 'gestionar_stock', 'imprimir_pdf']
    )
  },
  {
    id: 'tecnico',
    label: 'Técnico Ejecutor (Órdenes y Cierres)',
    defaultRole: 'company_user',
    permisos: buildPermisos(
      ['dashboard', 'plan', 'preventivos', 'correctivos', 'ordenes', 'equipos', 'repuestos'],
      ['cerrar_ordenes', 'imprimir_pdf']
    )
  },
  {
    id: 'metrologo',
    label: 'Metrólogo / Calibración',
    defaultRole: 'company_user',
    permisos: buildPermisos(
      ['dashboard', 'calibracion', 'instrumentos', 'equipos'],
      ['crear_editar', 'emitir_ordenes', 'cerrar_ordenes', 'imprimir_pdf']
    )
  },
  {
    id: 'almacen',
    label: 'Pañolero / Control de Repuestos',
    defaultRole: 'company_user',
    permisos: buildPermisos(
      ['dashboard', 'repuestos', 'equipos'],
      ['crear_editar', 'gestionar_stock', 'imprimir_pdf']
    )
  },
  {
    id: 'auditor',
    label: 'Solo Lectura / Auditoría',
    defaultRole: 'company_user',
    permisos: buildPermisos(
      ['dashboard', 'plan', 'calibracion', 'preventivos', 'correctivos', 'ordenes', 'equipos', 'instrumentos', 'repuestos'],
      ['imprimir_pdf']
    )
  }
];

export function makeSafeDocId(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const base = cleaned || `ID-${Date.now()}`;
  return base.slice(0, 120);
}

export function makeInviteIdForEmail(email: string): string {
  const normalized = String(email || '').trim().toLowerCase();
  const safeSlug = normalized
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);
  // Deterministic lightweight hash suffix to guarantee uniqueness even for emails with dots vs underscores
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(36);
  return `inv_${safeSlug}_${hex}`.slice(0, 120);
}

export function hasModuleAccess(user: UserProfile | null, modulo: ModuloKey): boolean {
  if (!user || !user.activo) return false;
  if (user.role === 'super_admin') return true;
  if (user.role === 'company_admin' && modulo === 'usuarios') return true;
  return Boolean(user.permisos?.modulos?.[modulo]);
}

export function hasActionAccess(user: UserProfile | null, accion: AccionKey): boolean {
  if (!user || !user.activo) return false;
  if (user.role === 'super_admin') return true;
  if (user.role === 'company_admin') {
    return user.permisos?.acciones?.[accion] ?? true;
  }
  return Boolean(user.permisos?.acciones?.[accion]);
}

export function getFirstPermittedTab(user: UserProfile | null): ModuloKey {
  if (!user) return 'dashboard';
  if (user.role === 'super_admin') return 'dashboard';
  for (const m of MODULOS_META) {
    if (hasModuleAccess(user, m.key)) return m.key;
  }
  return 'dashboard';
}

export function getRoleLabel(role: UserRole): string {
  if (role === 'super_admin') return 'Administrador General';
  if (role === 'company_admin') return 'Admin de Empresa';
  return 'Usuario de Empresa';
}
