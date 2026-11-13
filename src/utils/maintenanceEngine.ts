/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Equipo,
  FrecuenciaConfig,
  RegistroHistorialMP,
  OrdenCorrectivo,
  OrdenTrabajoOT,
  OrdenCalibracion,
  Instrumento,
  Tecnico
} from '../types';

export const MESES_L = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
export const MESES_COMPLETOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function parseFecha(fechaStr: string | undefined): Date | null {
  if (!fechaStr) return null;
  const str = String(fechaStr).trim();

  // Format DD/MM/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
  }

  // Format YYYY-MM-DD
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatFechaDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatFechaYYYYMMDD(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

export function generarFolioMP(mes: number, correlativo: number, anio = new Date().getFullYear()): string {
  return `MP-${anio}-${String(mes).padStart(2, '0')}-${String(correlativo).padStart(4, '0')}`;
}

export function generarFolioMC(mes: number, correlativo: number, anio = new Date().getFullYear()): string {
  return `MC-${anio}-${String(mes).padStart(2, '0')}-${String(correlativo).padStart(4, '0')}`;
}

export function generarFolioOT(mes: number, correlativo: number, anio = new Date().getFullYear()): string {
  return `OT-${anio}-${String(mes).padStart(2, '0')}-${String(correlativo).padStart(4, '0')}`;
}

export function generarFolioCAL(mes: number, correlativo: number, anio = new Date().getFullYear()): string {
  return `CAL-${anio}-${String(mes).padStart(2, '0')}-${String(correlativo).padStart(4, '0')}`;
}

export function obtenerFrecuenciaConfig(frecuenciaStr: string, frecuencias: FrecuenciaConfig[]): { paso: number; tolerancia: number } {
  const clean = String(frecuenciaStr || '').trim().toLowerCase();
  const match = frecuencias.find(f => f.nombre_freq.trim().toLowerCase() === clean);
  if (match) {
    return {
      paso: match.paso_meses,
      tolerancia: match.dias_tolerancia
    };
  }

  // Fallback heuristics
  if (clean.includes('diaria')) return { paso: 0, tolerancia: 1 };
  if (clean.includes('semanal')) return { paso: 0, tolerancia: 1 };
  if (clean.includes('quincenal')) return { paso: 0, tolerancia: 2 };
  if (clean.includes('bianual')) return { paso: 24, tolerancia: 30 };
  if (clean.includes('bimestral')) return { paso: 2, tolerancia: 5 };
  if (clean.includes('trimestral')) return { paso: 3, tolerancia: 7 };
  if (clean.includes('cuatrimestral')) return { paso: 4, tolerancia: 10 };
  if (clean.includes('semestral')) return { paso: 6, tolerancia: 15 };
  if (clean.includes('anual')) return { paso: 12, tolerancia: 30 };
  return { paso: 1, tolerancia: 4 }; // default Mensual
}

export function addFrequencyStep(
  baseDate: Date,
  frecuenciaStr: string,
  frecuencias: FrecuenciaConfig[],
  preferredDay?: number
): Date {
  const freqLower = String(frecuenciaStr || 'Mensual').trim().toLowerCase();
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  if (freqLower.includes('diaria')) {
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (freqLower.includes('semanal')) {
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (freqLower.includes('quincenal')) {
    d.setDate(d.getDate() + 14);
    return d;
  }

  const { paso } = obtenerFrecuenciaConfig(frecuenciaStr, frecuencias);
  const stepMonths = Math.max(1, paso);
  const targetDay = preferredDay ?? d.getDate();

  const totalMonths = d.getFullYear() * 12 + d.getMonth() + stepMonths;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = totalMonths % 12;
  const maxDayInMonth = new Date(nextYear, nextMonth + 1, 0).getDate();

  return new Date(nextYear, nextMonth, Math.min(targetDay, maxDayInMonth));
}

function makeSeqKey(dt: Date, isSubMonthly: boolean): string {
  if (isSubMonthly) {
    return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;
  }
  return String(dt.getMonth() + 1).padStart(2, '0');
}

function isSubMonthlyFreq(freqStr: string): boolean {
  const lower = String(freqStr || '').toLowerCase();
  return lower.includes('diaria') || lower.includes('semanal') || lower.includes('quincenal');
}

function extractYearFromFolio(folio?: string): number | null {
  if (!folio) return null;
  const m = folio.match(/^(?:MP|MC|OT|CAL)-(\d{4})-/i);
  return m ? parseInt(m[1], 10) : null;
}

export interface OcurrenciaCalculada {
  fecha: Date;
  mes_n: number;
  seq_key: string;
  historialMatch?: RegistroHistorialMP;
}

function getMaxDate(dates: Array<Date | null | undefined>): Date | null {
  let best: Date | null = null;
  for (const d of dates) {
    if (d && !isNaN(d.getTime())) {
      if (!best || d.getTime() > best.getTime()) {
        best = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
    }
  }
  return best;
}

function advanceAnchorPastYear(
  baseDate: Date,
  freqStr: string,
  frecuencias: FrecuenciaConfig[],
  minTargetYear: number
): Date {
  const preferredDay = baseDate.getDate();
  let next = addFrequencyStep(baseDate, freqStr, frecuencias, preferredDay);
  let guard = 0;
  while (next.getFullYear() < minTargetYear && guard < 1000) {
    next = addFrequencyStep(next, freqStr, frecuencias, preferredDay);
    guard++;
  }
  return next;
}

/**
 * Calcula las ocurrencias preventivas de un equipo para un año objetivo.
 * REGLA ISO / CMMS:
 * - El plan de un año NO se modifica ni borra órdenes al registrar cierres dentro del mismo año;
 *   solo se registran las fechas reales de ejecución sobre las órdenes programadas de ese año.
 * - Al confeccionar el plan del año siguiente (Y+1), la primera fecha se proyecta tomando en cuenta
 *   la última fecha real de ejecución registrada en el año anterior + frecuencia.
 */
export function calcularOcurrenciasEquipo(
  equipo: Equipo,
  anio = new Date().getFullYear(),
  frecuencias: FrecuenciaConfig[],
  historial: RegistroHistorialMP[] = [],
  allEquipos: Equipo[] = []
): OcurrenciaCalculada[] {
  const eqCode = String(equipo.codigo_eq || '').trim();
  const freqStr = String(equipo.frecuencia || 'Mensual').trim();
  const freqLower = freqStr.toLowerCase();
  const subMonthly = isSubMonthlyFreq(freqStr);

  const fechaParsed = parseFecha(equipo.fecha_proxima);
  const inicioDate = fechaParsed && !isNaN(fechaParsed.getTime())
    ? new Date(fechaParsed.getFullYear(), fechaParsed.getMonth(), fechaParsed.getDate())
    : new Date(anio, 0, 15);

  if (inicioDate.getFullYear() > anio) {
    return [];
  }

  // Filter historial matching this equipment (and specific frequency if equipment has multiple plans)
  const sameCodePlansCount = allEquipos.length > 0
    ? allEquipos.filter(
        e => e.codigo_eq.trim().toUpperCase() === eqCode.toUpperCase() &&
             (!equipo.cliente || e.cliente.trim() === equipo.cliente.trim())
      ).length
    : 1;

  const eqHistorial = historial
    .filter(h => {
      if (String(h.codigo_eq).trim().toUpperCase() !== eqCode.toUpperCase()) return false;
      if (sameCodePlansCount > 1 && h.frecuencia) {
        return h.frecuencia.trim().toLowerCase() === freqLower;
      }
      return true;
    })
    .slice()
    .sort((a, b) => {
      const da = parseFecha(a.fecha_real)?.getTime() ?? 0;
      const db = parseFecha(b.fecha_real)?.getTime() ?? 0;
      if (da !== db) return da - db;
      return String(a.id_ot).localeCompare(String(b.id_ot));
    });

  const getRegPlanYear = (reg: RegistroHistorialMP): number => {
    return (
      extractYearFromFolio(reg.id_ot) ||
      parseFecha(reg.fecha_real)?.getFullYear() ||
      inicioDate.getFullYear()
    );
  };

  let yearAnchor = new Date(inicioDate.getFullYear(), inicioDate.getMonth(), inicioDate.getDate());

  for (let simYear = inicioDate.getFullYear(); simYear <= anio; simYear++) {
    const slots: OcurrenciaCalculada[] = [];
    let nominalNextAfterYear = new Date(yearAnchor);

    if (yearAnchor.getFullYear() <= simYear) {
      let curr = new Date(yearAnchor.getFullYear(), yearAnchor.getMonth(), yearAnchor.getDate());
      const preferredDay = yearAnchor.getDate();
      let guard = 0;

      while (curr.getFullYear() < simYear && guard < 1000) {
        curr = addFrequencyStep(curr, freqStr, frecuencias, preferredDay);
        guard++;
      }

      while (curr.getFullYear() === simYear && guard < 2000) {
        slots.push({
          fecha: new Date(curr),
          mes_n: curr.getMonth() + 1,
          seq_key: makeSeqKey(curr, subMonthly)
        });
        curr = addFrequencyStep(curr, freqStr, frecuencias, preferredDay);
        guard++;
      }
      nominalNextAfterYear = curr;
    }

    // Match historical executions belonging to simYear WITHOUT altering or deleting any slot in simYear
    const yearHist = eqHistorial.filter(h => getRegPlanYear(h) === simYear);
    const matchedSlotIndices = new Set<number>();

    for (const reg of yearHist) {
      let targetIdx = -1;

      if (subMonthly) {
        // For daily/weekly/biweekly, try matching seq_key encoded in id_ot or date or mes_n
        targetIdx = slots.findIndex((s, idx) => !matchedSlotIndices.has(idx) && s.mes_n === reg.mes_n && reg.id_ot.includes(`-${String(s.mes_n).padStart(2, '0')}-`));
        if (targetIdx === -1) {
          targetIdx = slots.findIndex((s, idx) => !matchedSlotIndices.has(idx) && s.mes_n === reg.mes_n);
        }
      } else {
        targetIdx = slots.findIndex((s, idx) => !matchedSlotIndices.has(idx) && s.mes_n === reg.mes_n);
      }

      if (targetIdx === -1) {
        // Fallback: first unmatched slot in year if mes_n differed
        targetIdx = slots.findIndex((_, idx) => !matchedSlotIndices.has(idx));
      }

      if (targetIdx !== -1) {
        matchedSlotIndices.add(targetIdx);
        slots[targetIdx].historialMatch = reg;
      }
    }

    if (simYear === anio) {
      return slots;
    }

    // Transition to simYear + 1:
    // Anchor next year's plan on the real execution date when the cycle closing the year was executed
    // or when the latest real closing date extends past/replaces the final slot of the year.
    const lastSlot = slots[slots.length - 1];
    const maxRealInYear = getMaxDate(yearHist.map(h => parseFecha(h.fecha_real)));
    const lastSlotReal = lastSlot?.historialMatch ? parseFecha(lastSlot.historialMatch.fecha_real) : null;

    if (lastSlot && lastSlotReal) {
      const anchorBase = getMaxDate([lastSlotReal, maxRealInYear]) || lastSlotReal;
      yearAnchor = advanceAnchorPastYear(anchorBase, freqStr, frecuencias, simYear + 1);
    } else if (lastSlot && maxRealInYear && maxRealInYear.getTime() >= lastSlot.fecha.getTime()) {
      yearAnchor = advanceAnchorPastYear(maxRealInYear, freqStr, frecuencias, simYear + 1);
    } else {
      yearAnchor = nominalNextAfterYear;
    }
  }

  return [];
}

export function generarMapaFoliosAnual(
  equipos: Equipo[],
  anio = new Date().getFullYear(),
  frecuencias: FrecuenciaConfig[],
  historial: RegistroHistorialMP[] = []
): Map<string, string> {
  const mapa = new Map<string, string>();
  const equiposSorted = [...equipos].sort((a, b) =>
    a.codigo_eq.localeCompare(b.codigo_eq) || (a.frecuencia || '').localeCompare(b.frecuencia || '')
  );

  // Pre-calculate occurrences for all equipment
  const precalc: Array<{ eq: Equipo; occurs: OcurrenciaCalculada[] }> = equiposSorted.map(eq => ({
    eq,
    occurs: calcularOcurrenciasEquipo(eq, anio, frecuencias, historial, equiposSorted)
  }));

  // Track already-used real folios in each month so new/projected folios never collide
  const usedFoliosPerMonth: Record<number, Set<string>> = {};
  for (let m = 1; m <= 12; m++) usedFoliosPerMonth[m] = new Set<string>();

  for (const item of precalc) {
    for (const occ of item.occurs) {
      if (occ.historialMatch?.id_ot) {
        usedFoliosPerMonth[occ.mes_n]?.add(occ.historialMatch.id_ot.trim());
      }
    }
  }

  const contadoresMes: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) contadoresMes[m] = 1;

  for (const { eq, occurs } of precalc) {
    const eqCode = String(eq.codigo_eq).trim();
    const freq = String(eq.frecuencia || '').trim();

    for (const occ of occurs) {
      const m = occ.mes_n;
      let folio = occ.historialMatch?.id_ot?.trim();

      if (!folio) {
        let candidate = generarFolioMP(m, contadoresMes[m]++, anio);
        while (usedFoliosPerMonth[m]?.has(candidate)) {
          candidate = generarFolioMP(m, contadoresMes[m]++, anio);
        }
        folio = candidate;
        usedFoliosPerMonth[m]?.add(folio);
      }

      const dateKey = `${eqCode}_${formatFechaYYYYMMDD(occ.fecha)}`;
      const seqKey = `${eqCode}_${occ.seq_key}`;
      const freqDateKey = `${eqCode}_${freq}_${formatFechaYYYYMMDD(occ.fecha)}`;
      const freqSeqKey = `${eqCode}_${freq}_${occ.seq_key}`;

      mapa.set(freqDateKey, folio);
      mapa.set(freqSeqKey, folio);
      if (!mapa.has(dateKey)) mapa.set(dateKey, folio);
      if (!mapa.has(seqKey)) mapa.set(seqKey, folio);
    }
  }

  return mapa;
}

export interface OcurrenciaCalibracionCalculada {
  fecha: Date;
  mes_n: number;
  seq_key: string;
  ordenMatch?: OrdenCalibracion;
  projectedFromReal?: boolean;
}

/**
 * Calcula las ocurrencias de calibración para un instrumento activo en un año dado.
 * Mantiene inalterado el plan del año en curso (las órdenes emitidas/programadas no se borran ni se mueven)
 * y proyecta el plan del año siguiente tomando en cuenta la última fecha real de calibración + frecuencia.
 */
export function calcularOcurrenciasInstrumento(
  instrumento: Instrumento,
  anio = new Date().getFullYear(),
  frecuencias: FrecuenciaConfig[],
  calibraciones: OrdenCalibracion[] = []
): OcurrenciaCalibracionCalculada[] {
  if (instrumento.estado !== 'Activo') return [];

  const instCode = String(instrumento.codigo_inst || '').trim().toUpperCase();
  const freqStr = String(instrumento.frecuencia || 'Semestral').trim();
  const subMonthly = isSubMonthlyFreq(freqStr);

  const ordersForInst = calibraciones.filter(c =>
    String(c.codigo_eq || '').trim().toUpperCase() === instCode &&
    (!instrumento.cliente || c.cliente.trim() === instrumento.cliente.trim())
  );

  const getOrderPlanYear = (o: OrdenCalibracion): number => {
    return (
      extractYearFromFolio(o.id_ot) ||
      parseFecha(o.fecha_programada || o.fecha_tentativa || o.fecha_emision)?.getFullYear() ||
      anio
    );
  };

  // Resolve initial anchor date: explicit fecha_proxima > earliest order > fecha_alta
  const earliestOrder = ordersForInst
    .map(o => parseFecha(o.fecha_programada || o.fecha_tentativa || o.fecha_emision))
    .filter((d): d is Date => !!d && !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const startParsed = parseFecha(instrumento.fecha_proxima)
    || earliestOrder
    || parseFecha(instrumento.fecha_alta)
    || new Date(anio, 0, 15);

  const inicioDate = new Date(startParsed.getFullYear(), startParsed.getMonth(), startParsed.getDate());
  const firstYear = Math.min(inicioDate.getFullYear(), ...ordersForInst.map(getOrderPlanYear));

  if (inicioDate.getFullYear() > anio && ordersForInst.every(o => getOrderPlanYear(o) !== anio)) {
    return [];
  }

  let yearAnchor = new Date(inicioDate.getFullYear(), inicioDate.getMonth(), inicioDate.getDate());
  let anchoredFromPrevReal = false;

  for (let simYear = firstYear; simYear <= anio; simYear++) {
    const slots: OcurrenciaCalibracionCalculada[] = [];
    let nominalNextAfterYear = new Date(yearAnchor);

    if (yearAnchor.getFullYear() <= simYear) {
      let curr = new Date(yearAnchor.getFullYear(), yearAnchor.getMonth(), yearAnchor.getDate());
      const preferredDay = yearAnchor.getDate();
      let guard = 0;

      while (curr.getFullYear() < simYear && guard < 1000) {
        curr = addFrequencyStep(curr, freqStr, frecuencias, preferredDay);
        guard++;
      }

      while (curr.getFullYear() === simYear && guard < 2000) {
        slots.push({
          fecha: new Date(curr),
          mes_n: curr.getMonth() + 1,
          seq_key: makeSeqKey(curr, subMonthly),
          projectedFromReal: anchoredFromPrevReal
        });
        curr = addFrequencyStep(curr, freqStr, frecuencias, preferredDay);
        guard++;
      }
      nominalNextAfterYear = curr;
    }

    // Match all orders (pending + closed) in simYear to slots WITHOUT removing/moving other slots
    const ordersInYear = ordersForInst
      .filter(o => getOrderPlanYear(o) === simYear)
      .slice()
      .sort((a, b) => {
        const da = parseFecha(a.fecha_programada || a.fecha_tentativa || a.fecha_emision)?.getTime() ?? 0;
        const db = parseFecha(b.fecha_programada || b.fecha_tentativa || b.fecha_emision)?.getTime() ?? 0;
        if (da !== db) return da - db;
        return String(a.id_ot).localeCompare(String(b.id_ot));
      });

    const usedOrderIds = new Set<string>();
    const matchedSlotIndices = new Set<number>();

    // First pass: match orders to slots in same month
    for (const ord of ordersInYear) {
      const dp = parseFecha(ord.fecha_programada || ord.fecha_tentativa || ord.fecha_emision);
      const ordMonth = dp ? dp.getMonth() + 1 : 1;
      const slotIdx = slots.findIndex((s, idx) => !matchedSlotIndices.has(idx) && s.mes_n === ordMonth);
      if (slotIdx !== -1) {
        matchedSlotIndices.add(slotIdx);
        usedOrderIds.add(ord.id_ot);
        if (dp) {
          slots[slotIdx].fecha = new Date(dp);
          slots[slotIdx].mes_n = dp.getMonth() + 1;
          slots[slotIdx].seq_key = makeSeqKey(dp, subMonthly);
        }
        slots[slotIdx].ordenMatch = ord;
        slots[slotIdx].projectedFromReal = false;
      }
    }

    // Second pass: include any extra emitted/manual orders in simYear so emitted orders are NEVER hidden
    for (const ord of ordersInYear) {
      if (usedOrderIds.has(ord.id_ot)) continue;
      const dp = parseFecha(ord.fecha_programada || ord.fecha_tentativa || ord.fecha_emision) || new Date(simYear, 0, 15);
      usedOrderIds.add(ord.id_ot);
      slots.push({
        fecha: new Date(dp),
        mes_n: dp.getMonth() + 1,
        seq_key: makeSeqKey(dp, subMonthly),
        ordenMatch: ord,
        projectedFromReal: false
      });
    }

    slots.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    if (simYear === anio) {
      return slots;
    }

    // Transition to simYear + 1: base future year on latest real closing date when applicable
    const closedInYear = ordersInYear.filter(o => o.estado !== 'Pendiente');
    const maxRealInYear = getMaxDate(closedInYear.map(o => parseFecha(o.fecha_real)));
    const lastSlot = slots[slots.length - 1];
    const lastSlotClosed = lastSlot?.ordenMatch && lastSlot.ordenMatch.estado !== 'Pendiente' ? lastSlot.ordenMatch : null;
    const lastSlotReal = lastSlotClosed ? parseFecha(lastSlotClosed.fecha_real) : null;

    if (lastSlot && lastSlotReal) {
      const explicitNext = lastSlotClosed?.proxima_calibracion ? parseFecha(lastSlotClosed.proxima_calibracion) : null;
      const base = getMaxDate([lastSlotReal, maxRealInYear]) || lastSlotReal;
      if (explicitNext && explicitNext.getFullYear() >= simYear + 1 && explicitNext.getTime() > base.getTime()) {
        yearAnchor = explicitNext;
      } else {
        yearAnchor = advanceAnchorPastYear(base, freqStr, frecuencias, simYear + 1);
      }
      anchoredFromPrevReal = true;
    } else if (lastSlot && maxRealInYear && maxRealInYear.getTime() >= lastSlot.fecha.getTime()) {
      yearAnchor = advanceAnchorPastYear(maxRealInYear, freqStr, frecuencias, simYear + 1);
      anchoredFromPrevReal = true;
    } else {
      yearAnchor = nominalNextAfterYear;
    }
  }

  return [];
}

export interface KpiMensual {
  mes_label: string;
  total_programados: number;
  en_fecha: number;
  fuera_fecha: number;
  pendientes_vencidos: number;
  por_vencer: number;
  porcentaje_cumplimiento: number;
}

export function calcularKpiMensual(
  equipos: Equipo[],
  historial: RegistroHistorialMP[],
  frecuencias: FrecuenciaConfig[],
  mesIdx: number, // 1 to 12
  anio = new Date().getFullYear(),
  mapaFolios?: Map<string, string>
): KpiMensual {
  const mapa = mapaFolios || generarMapaFoliosAnual(equipos, anio, frecuencias, historial);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let total_programados = 0;
  let en_fecha = 0;
  let fuera_fecha = 0;
  let pendientes_vencidos = 0;
  let por_vencer = 0;

  for (const eq of equipos) {
    const eqCode = String(eq.codigo_eq).trim();
    const occurs = calcularOcurrenciasEquipo(eq, anio, frecuencias, historial, equipos);
    const { tolerancia } = obtenerFrecuenciaConfig(eq.frecuencia, frecuencias);

    for (const occ of occurs) {
      if (occ.mes_n === mesIdx) {
        total_programados++;
        const freq = String(eq.frecuencia || '').trim();
        const freqDateKey = `${eqCode}_${freq}_${formatFechaYYYYMMDD(occ.fecha)}`;
        const dateKey = `${eqCode}_${formatFechaYYYYMMDD(occ.fecha)}`;
        const folioEsp = mapa.get(freqDateKey) || mapa.get(dateKey) || generarFolioMP(mesIdx, 1, anio);

        const regHist = occ.historialMatch || historial.find(h =>
          String(h.codigo_eq).trim() === eqCode && String(h.id_ot).trim() === folioEsp
        );

        const fechaPrev = new Date(occ.fecha);
        fechaPrev.setHours(0, 0, 0, 0);

        if (regHist) {
          const fReal = parseFecha(regHist.fecha_real);
          if (fReal) {
            fReal.setHours(0, 0, 0, 0);
            const diffDays = Math.abs(Math.round((fReal.getTime() - fechaPrev.getTime()) / (1000 * 60 * 60 * 24)));
            if (diffDays <= tolerancia) {
              en_fecha++;
            } else {
              fuera_fecha++;
            }
          } else {
            en_fecha++;
          }
        } else {
          if (fechaPrev.getTime() <= hoy.getTime()) {
            pendientes_vencidos++;
          } else {
            por_vencer++;
          }
        }
      }
    }
  }

  const porcentaje_cumplimiento = total_programados > 0
    ? (en_fecha / total_programados) * 100
    : 0;

  return {
    mes_label: MESES_L[mesIdx - 1],
    total_programados,
    en_fecha,
    fuera_fecha,
    pendientes_vencidos,
    por_vencer,
    porcentaje_cumplimiento
  };
}

export interface KpiTecnico {
  codigo_tec: string;
  nombre: string;
  especialidad: string;
  asignadas_total: number;
  pendientes: number;
  a_tiempo: number;
  fuera_termino: number;
  cumplimiento_pct: number;
}

export function calcularKpisTecnicos(
  tecnicos: Tecnico[],
  correctivos: OrdenCorrectivo[],
  ordenesTrabajo: OrdenTrabajoOT[]
): KpiTecnico[] {
  return tecnicos.map(tec => {
    const tNombre = tec.nombre.trim();
    const mcTec = correctivos.filter(c => String(c.tecnico).trim() === tNombre);
    const otTec = ordenesTrabajo.filter(o => String(o.tecnico).trim() === tNombre);
    const todas = [...mcTec, ...otTec];

    const asignadas_total = todas.length;
    let a_tiempo = 0;
    let fuera_termino = 0;
    let pendientes = 0;

    for (const r of todas) {
      const est = String(r.estado || '');
      if (est.includes('A tiempo')) {
        a_tiempo++;
      } else if (est.includes('Fuera de término')) {
        fuera_termino++;
      } else if (est === 'Pendiente') {
        pendientes++;
      }
    }

    const cerradas = a_tiempo + fuera_termino;
    const cumplimiento_pct = cerradas > 0 ? (a_tiempo / cerradas) * 100 : 0;

    return {
      codigo_tec: tec.codigo_tec,
      nombre: tNombre,
      especialidad: tec.especialidad,
      asignadas_total,
      pendientes,
      a_tiempo,
      fuera_termino,
      cumplimiento_pct
    };
  });
}
