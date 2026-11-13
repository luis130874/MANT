/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  BarChart3,
  Award
} from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import {
  MESES_L,
  calcularKpiMensual,
  calcularKpisTecnicos,
  calcularOcurrenciasEquipo,
  generarMapaFoliosAnual,
  parseFecha
} from '../utils/maintenanceEngine';

export const DashboardView: React.FC = () => {
  const {
    selectedCliente,
    selectedAnio,
    equipos,
    historial,
    correctivos,
    ordenesTrabajo,
    frecuencias,
    tecnicos
  } = useMaintenance();

  const [panelModo, setPanelModo] = useState<'kpi_empresa' | 'kpi_tecnicos'>('kpi_empresa');
  const [tipoVistaKpi, setTipoVistaKpi] = useState<'mensual' | 'anual' | 'grafico'>('mensual');
  const [mesKpiSel, setMesKpiSel] = useState<number>(new Date().getMonth() + 1);

  // Filter entities by selected client
  const equiposFiltrados = selectedCliente === 'Todos'
    ? equipos
    : equipos.filter(e => e.cliente.trim() === selectedCliente.trim());

  const correctivosFiltrados = selectedCliente === 'Todos'
    ? correctivos
    : correctivos.filter(c => c.cliente.trim() === selectedCliente.trim());

  const ordenesFiltradas = selectedCliente === 'Todos'
    ? ordenesTrabajo
    : ordenesTrabajo.filter(o => o.cliente.trim() === selectedCliente.trim());

  const mapaFolios = generarMapaFoliosAnual(equiposFiltrados, selectedAnio, frecuencias, historial);

  // Calculate Monthly KPI
  const kpiMes = calcularKpiMensual(
    equiposFiltrados,
    historial,
    frecuencias,
    mesKpiSel,
    selectedAnio,
    mapaFolios
  );

  // Calculate Annual KPI Acumulado
  let anualProg = 0;
  let anualEnFecha = 0;
  let anualFueraFecha = 0;
  let anualPendientes = 0;

  for (let m = 1; m <= 12; m++) {
    const k = calcularKpiMensual(equiposFiltrados, historial, frecuencias, m, selectedAnio, mapaFolios);
    anualProg += k.total_programados;
    anualEnFecha += k.en_fecha;
    anualFueraFecha += k.fuera_fecha;
    anualPendientes += k.pendientes_vencidos;
  }
  const pctAnual = anualProg > 0 ? (anualEnFecha / anualProg) * 100 : 0;

  // 12-Month Data for Bar Chart
  const evolutionData = MESES_L.map((mLabel, idx) => {
    const k = calcularKpiMensual(equiposFiltrados, historial, frecuencias, idx + 1, selectedAnio, mapaFolios);
    return {
      mes: mLabel,
      pct: Math.round(k.porcentaje_cumplimiento),
      programados: k.total_programados,
      enFecha: k.en_fecha,
      fueraFecha: k.fuera_fecha,
      vencidos: k.pendientes_vencidos
    };
  });

  // Technician KPIs
  const kpisTecnicos = calcularKpisTecnicos(tecnicos, correctivosFiltrados, ordenesFiltradas);

  // Overdue / Urgent Alert Items
  const correctivosAbiertos = correctivosFiltrados.filter(c => c.estado === 'Pendiente');
  const otAbiertas = ordenesFiltradas.filter(o => o.estado === 'Pendiente');

  return (
    <div className="space-y-6">
      {/* View Header with Facility Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Panel de Indicadores y Desempeño
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Auditoría de cumplimiento preventivo, confiabilidad de planta y eficiencia técnica.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setPanelModo('kpi_empresa')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              panelModo === 'kpi_empresa'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            KPIs de Planta ({selectedCliente === 'Todos' ? 'Global' : selectedCliente})
          </button>
          <button
            onClick={() => setPanelModo('kpi_tecnicos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              panelModo === 'kpi_tecnicos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rendimiento por Técnico
          </button>
        </div>
      </div>

      {/* Top 4 Essential Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Cumplimiento {MESES_L[mesKpiSel - 1]}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {kpiMes.porcentaje_cumplimiento.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-slate-500">
              ({kpiMes.en_fecha}/{kpiMes.total_programados})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Meta operacional: <span className="font-semibold text-slate-700">95.0%</span>
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Cumplimiento Anual {selectedAnio}</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600 font-mono tabular-nums">
              {pctAnual.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-slate-500">
              ({anualEnFecha}/{anualProg})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Total de intervenciones anuales
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Correctivos Abiertos</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {correctivosAbiertos.length}
            </span>
            <span className="text-xs font-medium text-slate-500">en atención</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {correctivosFiltrados.length} correctivos totales en historial
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Equipos Protegidos</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {equiposFiltrados.length}
            </span>
            <span className="text-xs font-medium text-slate-500">activos industriales</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {tecnicos.filter(t => t.estado === 'Activo').length} técnicos activos asignados
          </p>
        </div>
      </div>

      {/* Main Panel Content */}
      {panelModo === 'kpi_empresa' ? (
        <div className="space-y-6">
          {/* Sub Navigation for Empresa KPIs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="inline-flex p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setTipoVistaKpi('mensual')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  tipoVistaKpi === 'mensual'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Auditoría Mensual
              </button>
              <button
                onClick={() => setTipoVistaKpi('anual')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  tipoVistaKpi === 'anual'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Acumulado Anual
              </button>
              <button
                onClick={() => setTipoVistaKpi('grafico')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  tipoVistaKpi === 'grafico'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Evolución Gráfica (12 Meses)
              </button>
            </div>

            {tipoVistaKpi === 'mensual' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Mes de análisis:</span>
                <select
                  value={mesKpiSel}
                  onChange={(e) => setMesKpiSel(Number(e.target.value))}
                  className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                >
                  {MESES_L.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {idx + 1} - {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* VISTA 1: Mensual */}
          {tipoVistaKpi === 'mensual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Programados</span>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
                    {kpiMes.total_programados}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">A Tiempo</span>
                  <div className="text-2xl font-bold text-emerald-600 font-mono mt-1 tabular-nums">
                    {kpiMes.en_fecha}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-amber-600 uppercase">Fuera de Fecha</span>
                  <div className="text-2xl font-bold text-amber-600 font-mono mt-1 tabular-nums">
                    {kpiMes.fuera_fecha}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-rose-600 uppercase">Vencidos Pendientes</span>
                  <div className="text-2xl font-bold text-rose-600 font-mono mt-1 tabular-nums">
                    {kpiMes.pendientes_vencidos}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-blue-600 uppercase">Por Vencer</span>
                  <div className="text-2xl font-bold text-blue-600 font-mono mt-1 tabular-nums">
                    {kpiMes.por_vencer}
                  </div>
                </div>
              </div>

              {/* Big KPI Visual Card */}
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 text-center relative overflow-hidden">
                <div className="max-w-md mx-auto">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    KPI Cumplimiento Preventivo - {MESES_L[mesKpiSel - 1]} {selectedAnio}
                  </span>
                  <div className="text-5xl sm:text-6xl font-black text-emerald-600 font-mono mt-3 tabular-nums">
                    {kpiMes.porcentaje_cumplimiento.toFixed(1)}%
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Calculado considerando los días de tolerancia definidos por cada frecuencia de equipo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: Anual Acumulado */}
          {tipoVistaKpi === 'anual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Anual Programados</span>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tabular-nums">
                    {anualProg}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase">A Tiempo</span>
                  <div className="text-2xl font-bold text-emerald-600 font-mono mt-1 tabular-nums">
                    {anualEnFecha}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-amber-600 uppercase">Fuera de Término</span>
                  <div className="text-2xl font-bold text-amber-600 font-mono mt-1 tabular-nums">
                    {anualFueraFecha}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-rose-600 uppercase">Vencidos Acumulados</span>
                  <div className="text-2xl font-bold text-rose-600 font-mono mt-1 tabular-nums">
                    {anualPendientes}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 text-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Cumplimiento Anual Consolidado {selectedAnio}
                </span>
                <div className="text-5xl sm:text-6xl font-black text-blue-600 font-mono mt-3 tabular-nums">
                  {pctAnual.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Consolidado anual de todas las órdenes de mantenimiento preventivo planificadas.
                </p>
              </div>
            </div>
          )}

          {/* VISTA 3: Evolución Gráfica (12 Meses) */}
          {tipoVistaKpi === 'grafico' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Evolución Mensual de Cumplimiento (%) - {selectedAnio}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Histórico mes a mes con umbral objetivo del 95%
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-blue-600 rounded-sm"></span>
                    <span className="text-slate-600">% Cumplimiento</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-rose-500 border-b border-dashed border-rose-500"></span>
                    <span className="text-slate-600">Meta (95%)</span>
                  </div>
                </div>
              </div>

              {/* Clean SVG Bar Chart with Tabular Numerals */}
              <div className="pt-4 pb-2">
                <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-64 border-b border-slate-200 px-2 relative">
                  {/* Target line at 95% */}
                  <div
                    className="absolute left-0 right-0 border-b border-dashed border-rose-400 pointer-events-none z-10 flex justify-end pr-2"
                    style={{ bottom: '95%' }}
                  >
                    <span className="text-[10px] font-mono font-bold text-rose-500 bg-white/90 px-1 rounded -translate-y-2.5">
                      Meta 95%
                    </span>
                  </div>

                  {evolutionData.map((d, i) => {
                    const heightPct = Math.min(100, Math.max(d.pct, 4));
                    const isSelected = mesKpiSel === i + 1;
                    return (
                      <div
                        key={d.mes}
                        onClick={() => {
                          setMesKpiSel(i + 1);
                          setTipoVistaKpi('mensual');
                        }}
                        className="flex flex-col items-center h-full justify-end cursor-pointer group"
                      >
                        {/* Hover Tooltip */}
                        <div className="text-[10px] font-mono font-bold text-slate-700 opacity-80 group-hover:opacity-100 mb-1 transition-opacity">
                          {d.pct}%
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-t-md transition-all ${
                            isSelected
                              ? 'bg-blue-600 shadow-sm'
                              : d.pct >= 95
                              ? 'bg-emerald-500 group-hover:bg-emerald-600'
                              : d.pct >= 80
                              ? 'bg-blue-500 group-hover:bg-blue-600'
                              : 'bg-amber-500 group-hover:bg-amber-600'
                          }`}
                        />

                        {/* Label */}
                        <div className="text-[10px] sm:text-xs font-semibold text-slate-600 mt-2">
                          {d.mes}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VISTA TÉCNICOS */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Desempeño Operativo por Técnico (MC y OT)
              </h3>
              <p className="text-xs text-slate-500">
                Consolidado de órdenes correctivas y de trabajo asignadas frente a cerradas a tiempo.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {kpisTecnicos.length} Técnicos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Técnico</th>
                  <th className="py-3 px-4">Especialidad</th>
                  <th className="py-3 px-4 text-center">Asignadas Total</th>
                  <th className="py-3 px-4 text-center">Pendientes</th>
                  <th className="py-3 px-4 text-center">A Tiempo</th>
                  <th className="py-3 px-4 text-center">Fuera Término</th>
                  <th className="py-3 px-4 text-right">Cumplimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kpisTecnicos.map(tec => (
                  <tr key={tec.codigo_tec} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">
                      {tec.codigo_tec}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {tec.nombre}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {tec.especialidad}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-800">
                      {tec.asignadas_total}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-amber-600">
                      {tec.pendientes}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-emerald-600">
                      {tec.a_tiempo}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-rose-600">
                      {tec.fuera_termino}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      <span className={tec.cumplimiento_pct >= 90 ? 'text-emerald-600' : 'text-slate-800'}>
                        {tec.cumplimiento_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Immediate Attention Queue */}
      {(correctivosAbiertos.length > 0 || otAbiertas.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Órdenes en Espera de Cierre / Atención
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {correctivosAbiertos.length + otAbiertas.length} órdenes abiertas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {correctivosAbiertos.slice(0, 4).map(c => (
              <div
                key={c.id_ot}
                className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/40 text-xs flex justify-between items-start gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 font-mono font-semibold text-slate-900">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">MC</span>
                    <span>{c.id_ot}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-sans font-normal">{c.codigo_eq}</span>
                  </div>
                  <p className="text-slate-700 mt-1 line-clamp-1">{c.falla_reportada}</p>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Compromiso: <span className="text-slate-600 font-medium">{c.fecha_tentativa}</span> · Asignado: {c.tecnico}
                  </p>
                </div>
              </div>
            ))}

            {otAbiertas.slice(0, 4).map(o => (
              <div
                key={o.id_ot}
                className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/40 text-xs flex justify-between items-start gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 font-mono font-semibold text-slate-900">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">OT</span>
                    <span>{o.id_ot}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-sans font-normal">{o.codigo_eq}</span>
                  </div>
                  <p className="text-slate-700 mt-1 line-clamp-1">{o.trabajo_solicitado}</p>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Entrega: <span className="text-slate-600 font-medium">{o.fecha_tentativa}</span> · Asignado: {o.tecnico}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
