/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Cliente,
  Equipo,
  FrecuenciaConfig,
  Instrumento,
  OrdenCalibracion,
  OrdenCorrectivo,
  OrdenTrabajoOT,
  RegistroHistorialMP
} from '../types';
import {
  calcularOcurrenciasEquipo,
  calcularOcurrenciasInstrumento,
  formatFechaDDMMYYYY,
  formatFechaYYYYMMDD,
  generarMapaFoliosAnual,
  obtenerFrecuenciaConfig
} from './maintenanceEngine';

export type OrderTipo = 'MP' | 'MC' | 'OT' | 'CAL';

export interface DigitalOrderTarget {
  tipo: OrderTipo;
  folio: string;
  cliente: string;
  empresaCodigo?: string;
  codigoEq: string;
  nombreActivo: string;
  fechaProgramada?: string;
  mes_n?: number;
  anio?: number;
  frecuencia?: string;
  tecnicoSugerido?: string;
  equipo?: Equipo;
  historialMP?: RegistroHistorialMP;
  correctivo?: OrdenCorrectivo;
  ordenTrabajo?: OrdenTrabajoOT;
  calibracion?: OrdenCalibracion;
  isProjectedCal?: boolean;
}

export interface DeepLinkOrderQuery {
  tipo: OrderTipo;
  folio: string;
  emp?: string;
  mes?: number;
  anio?: number;
  eq?: string;
  freq?: string;
}

const PENDING_ORDER_STORAGE_KEY = 'prodexus_pending_digital_order';

export function buildDigitalOrderUrl(target: DigitalOrderTarget, clientes: Cliente[]): string {
  const empMatched =
    target.empresaCodigo ||
    clientes.find(c => c.nombre.trim().toLowerCase() === target.cliente.trim().toLowerCase())?.codigo ||
    '';

  const params = new URLSearchParams();
  params.set('orden', target.tipo);
  params.set('folio', target.folio);
  if (empMatched) params.set('emp', empMatched);
  if (target.mes_n) params.set('mes', String(target.mes_n));
  if (target.anio) params.set('anio', String(target.anio));
  if (target.codigoEq) params.set('eq', target.codigoEq);
  if (target.frecuencia) params.set('freq', target.frecuencia);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?${params.toString()}`;
}

export function buildWhatsAppShareHref(params: {
  phone?: string;
  target: DigitalOrderTarget;
  url: string;
}): string {
  const cleanPhone = (params.phone || '').replace(/[^\d]/g, '');
  const tipoLabel =
    params.target.tipo === 'MP'
      ? 'Mantenimiento Preventivo (MP)'
      : params.target.tipo === 'MC'
      ? 'Mantenimiento Correctivo (MC)'
      : params.target.tipo === 'OT'
      ? 'Orden de Trabajo (OT)'
      : 'Calibración Metrológica (CAL)';

  const lines = [
    `*PRODEXUS CMMS · ${tipoLabel}*`,
    `Folio: *${params.target.folio}*`,
    `Planta: ${params.target.cliente}`,
    `Equipo/Activo: ${params.target.nombreActivo} (${params.target.codigoEq})`,
    params.target.fechaProgramada ? `Fecha programada: ${params.target.fechaProgramada}` : '',
    '',
    'Complete la orden y firme digitalmente desde el siguiente enlace:',
    params.url
  ].filter(Boolean);

  const encodedText = encodeURIComponent(lines.join('\n'));
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}

export function parseDeepLinkOrderFromWindow(): DeepLinkOrderQuery | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const ordenRaw = (search.get('orden') || '').trim().toUpperCase();
  const folio = (search.get('folio') || '').trim();

  if (ordenRaw === 'MP' || ordenRaw === 'MC' || ordenRaw === 'OT' || ordenRaw === 'CAL') {
    if (folio) {
      const parsed: DeepLinkOrderQuery = {
        tipo: ordenRaw,
        folio,
        emp: search.get('emp')?.trim() || undefined,
        mes: search.get('mes') ? Number(search.get('mes')) : undefined,
        anio: search.get('anio') ? Number(search.get('anio')) : undefined,
        eq: search.get('eq')?.trim() || undefined,
        freq: search.get('freq')?.trim() || undefined
      };
      try {
        sessionStorage.setItem(PENDING_ORDER_STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        // Ignore storage restrictions
      }
      return parsed;
    }
  }

  try {
    const saved = sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DeepLinkOrderQuery;
      if (parsed?.tipo && parsed?.folio) return parsed;
    }
  } catch {
    // Ignore storage parse error
  }
  return null;
}

export function clearDeepLinkOrderStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
  } catch {
    // Ignore
  }
  if (window.location.search.includes('orden=')) {
    const url = new URL(window.location.href);
    url.searchParams.delete('orden');
    url.searchParams.delete('folio');
    url.searchParams.delete('emp');
    url.searchParams.delete('mes');
    url.searchParams.delete('anio');
    url.searchParams.delete('eq');
    url.searchParams.delete('freq');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
}

export function resolveDigitalOrderTarget(
  query: DeepLinkOrderQuery,
  data: {
    clientes: Cliente[];
    equipos: Equipo[];
    historial: RegistroHistorialMP[];
    correctivos: OrdenCorrectivo[];
    ordenesTrabajo: OrdenTrabajoOT[];
    calibraciones: OrdenCalibracion[];
    instrumentos: Instrumento[];
    frecuencias: FrecuenciaConfig[];
    defaultAnio: number;
  }
): DigitalOrderTarget | null {
  const empMatch = query.emp
    ? data.clientes.find(c => c.codigo.trim().toLowerCase() === query.emp!.trim().toLowerCase())
    : undefined;

  if (query.tipo === 'MC') {
    const mc = data.correctivos.find(c => c.id_ot.trim().toLowerCase() === query.folio.trim().toLowerCase());
    if (!mc) return null;
    const eq = data.equipos.find(e => e.codigo_eq === mc.codigo_eq && e.cliente.trim() === mc.cliente.trim())
      || data.equipos.find(e => e.codigo_eq === mc.codigo_eq);
    return {
      tipo: 'MC',
      folio: mc.id_ot,
      cliente: mc.cliente,
      empresaCodigo: empMatch?.codigo,
      codigoEq: mc.codigo_eq,
      nombreActivo: eq?.nombre || mc.codigo_eq,
      fechaProgramada: mc.fecha_tentativa,
      tecnicoSugerido: mc.tecnico,
      equipo: eq,
      correctivo: mc
    };
  }

  if (query.tipo === 'OT') {
    const ot = data.ordenesTrabajo.find(o => o.id_ot.trim().toLowerCase() === query.folio.trim().toLowerCase());
    if (!ot) return null;
    const eq = data.equipos.find(e => e.codigo_eq === ot.codigo_eq && e.cliente.trim() === ot.cliente.trim())
      || data.equipos.find(e => e.codigo_eq === ot.codigo_eq);
    return {
      tipo: 'OT',
      folio: ot.id_ot,
      cliente: ot.cliente,
      empresaCodigo: empMatch?.codigo,
      codigoEq: ot.codigo_eq,
      nombreActivo: eq?.nombre || 'Instalaciones Generales de Planta',
      fechaProgramada: ot.fecha_tentativa,
      tecnicoSugerido: ot.tecnico,
      equipo: eq,
      ordenTrabajo: ot
    };
  }

  if (query.tipo === 'CAL') {
    const cal = data.calibraciones.find(c => c.id_ot.trim().toLowerCase() === query.folio.trim().toLowerCase());
    if (cal) {
      const eq = data.equipos.find(e => e.codigo_eq === cal.codigo_eq && e.cliente.trim() === cal.cliente.trim())
        || data.equipos.find(e => e.codigo_eq === cal.codigo_eq);
      return {
        tipo: 'CAL',
        folio: cal.id_ot,
        cliente: cal.cliente,
        empresaCodigo: empMatch?.codigo,
        codigoEq: cal.codigo_eq,
        nombreActivo: cal.instrumento_nombre,
        fechaProgramada: cal.fecha_programada,
        frecuencia: cal.frecuencia_calibracion,
        tecnicoSugerido: cal.metrologo_laboratorio,
        equipo: eq,
        calibracion: cal,
        isProjectedCal: false
      };
    }

    // Try resolving a projected calibration order if folio contains PROY or eq + mes + anio match
    const targetAnio = query.anio || data.defaultAnio;
    const inst = data.instrumentos.find(i => {
      if (query.eq && i.codigo_inst.trim().toLowerCase() !== query.eq.trim().toLowerCase()) return false;
      if (empMatch && i.cliente.trim().toLowerCase() !== empMatch.nombre.trim().toLowerCase()) return false;
      return true;
    });
    if (inst) {
      const occurs = calcularOcurrenciasInstrumento(
        inst,
        targetAnio,
        data.frecuencias,
        data.calibraciones.filter(c => c.cliente.trim() === inst.cliente.trim())
      );
      const occ = occurs.find(o => !query.mes || o.mes_n === query.mes);
      if (occ) {
        if (occ.ordenMatch) {
          return {
            tipo: 'CAL',
            folio: occ.ordenMatch.id_ot,
            cliente: occ.ordenMatch.cliente,
            empresaCodigo: empMatch?.codigo,
            codigoEq: occ.ordenMatch.codigo_eq,
            nombreActivo: occ.ordenMatch.instrumento_nombre,
            fechaProgramada: occ.ordenMatch.fecha_programada,
            frecuencia: occ.ordenMatch.frecuencia_calibracion,
            tecnicoSugerido: occ.ordenMatch.metrologo_laboratorio,
            calibracion: occ.ordenMatch,
            isProjectedCal: false
          };
        }
        const { tolerancia } = obtenerFrecuenciaConfig(inst.frecuencia, data.frecuencias);
        const dtTent = new Date(occ.fecha);
        dtTent.setDate(dtTent.getDate() + Math.max(3, Math.min(7, tolerancia)));
        const virtualOrder: OrdenCalibracion = {
          id_ot: query.folio,
          codigo_eq: inst.codigo_inst,
          cliente: inst.cliente,
          instrumento_nombre: inst.nombre,
          variable_medicion: inst.variable_medicion,
          rango_operacion: inst.rango_operacion,
          tolerancia_emp: inst.tolerancia_emp,
          frecuencia_calibracion: inst.frecuencia,
          patron_utilizado: inst.patron_habitual,
          fecha_emision: formatFechaDDMMYYYY(new Date()),
          fecha_programada: formatFechaDDMMYYYY(occ.fecha),
          fecha_tentativa: formatFechaDDMMYYYY(dtTent),
          dias_tolerancia: tolerancia,
          estado: 'Pendiente',
          fecha_real: '',
          metrologo_laboratorio: inst.metrologo_habitual || 'Metrología Interna',
          observaciones: inst.notas
        };
        return {
          tipo: 'CAL',
          folio: query.folio,
          cliente: inst.cliente,
          empresaCodigo: empMatch?.codigo,
          codigoEq: inst.codigo_inst,
          nombreActivo: inst.nombre,
          fechaProgramada: virtualOrder.fecha_programada,
          mes_n: occ.mes_n,
          anio: targetAnio,
          frecuencia: inst.frecuencia,
          tecnicoSugerido: virtualOrder.metrologo_laboratorio,
          calibracion: virtualOrder,
          isProjectedCal: true
        };
      }
    }
    return null;
  }

  // MP resolution (could be already closed in historial OR pending occurrence in schedule)
  const histMatch = data.historial.find(h => h.id_ot.trim().toLowerCase() === query.folio.trim().toLowerCase());
  const anioFromFolio = query.folio.match(/^MP-(\d{4})-/)?.[1];
  const mesFromFolio = query.folio.match(/^MP-\d{4}-(\d{2})-/)?.[1];
  const targetAnio = query.anio || (anioFromFolio ? Number(anioFromFolio) : data.defaultAnio);
  const targetMes = query.mes || (mesFromFolio ? Number(mesFromFolio) : undefined);

  const scopedEquipos = empMatch
    ? data.equipos.filter(e => e.cliente.trim().toLowerCase() === empMatch.nombre.trim().toLowerCase())
    : data.equipos;

  if (histMatch) {
    const eq =
      scopedEquipos.find(
        e =>
          e.codigo_eq.trim().toLowerCase() === histMatch.codigo_eq.trim().toLowerCase() &&
          (!histMatch.frecuencia || e.frecuencia.trim().toLowerCase() === histMatch.frecuencia.trim().toLowerCase())
      ) || scopedEquipos.find(e => e.codigo_eq.trim().toLowerCase() === histMatch.codigo_eq.trim().toLowerCase());

    return {
      tipo: 'MP',
      folio: histMatch.id_ot,
      cliente: eq?.cliente || empMatch?.nombre || 'Planta',
      empresaCodigo: empMatch?.codigo,
      codigoEq: histMatch.codigo_eq,
      nombreActivo: eq?.nombre || histMatch.codigo_eq,
      fechaProgramada: histMatch.fecha_real,
      mes_n: histMatch.mes_n,
      anio: targetAnio,
      frecuencia: histMatch.frecuencia || eq?.frecuencia,
      tecnicoSugerido: histMatch.tecnico,
      equipo: eq,
      historialMP: histMatch
    };
  }

  // Search matching equipo occurrence in schedule
  const mapaFolios = generarMapaFoliosAnual(scopedEquipos, targetAnio, data.frecuencias, data.historial);
  for (const eq of scopedEquipos) {
    if (query.eq && eq.codigo_eq.trim().toLowerCase() !== query.eq.trim().toLowerCase()) continue;
    if (query.freq && eq.frecuencia.trim().toLowerCase() !== query.freq.trim().toLowerCase()) continue;

    const eqCode = eq.codigo_eq.trim();
    const freq = String(eq.frecuencia || '').trim();
    const occurs = calcularOcurrenciasEquipo(eq, targetAnio, data.frecuencias, data.historial, scopedEquipos);
    for (const occ of occurs) {
      if (targetMes && occ.mes_n !== targetMes) continue;
      const computedFolio =
        occ.historialMatch?.id_ot?.trim() ||
        mapaFolios.get(`${eqCode}_${freq}_${occ.seq_key}`) ||
        mapaFolios.get(`${eqCode}_${freq}_${formatFechaYYYYMMDD(occ.fecha)}`) ||
        mapaFolios.get(`${eqCode}_${occ.seq_key}`) ||
        mapaFolios.get(`${eqCode}_${occ.fecha.toISOString().slice(0, 10)}`);

      if (
        (computedFolio && computedFolio.toLowerCase() === query.folio.toLowerCase()) ||
        (query.eq && targetMes && occ.mes_n === targetMes)
      ) {
        return {
          tipo: 'MP',
          folio: computedFolio || query.folio,
          cliente: eq.cliente,
          empresaCodigo: empMatch?.codigo,
          codigoEq: eq.codigo_eq,
          nombreActivo: eq.nombre,
          fechaProgramada: formatFechaDDMMYYYY(occ.fecha),
          mes_n: occ.mes_n,
          anio: targetAnio,
          frecuencia: eq.frecuencia,
          tecnicoSugerido: eq.tecnico,
          equipo: eq,
          historialMP: occ.historialMatch
        };
      }
    }
  }

  return null;
}
