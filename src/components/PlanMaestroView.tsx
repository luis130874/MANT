/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  CalendarDays,
  Printer,
  FileDown,
  Loader2,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  FileText
} from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';
import { hasActionAccess } from '../utils/rbac';
import {
  MESES_L,
  calcularOcurrenciasEquipo,
  generarMapaFoliosAnual,
  formatFechaDDMMYYYY,
  formatFechaYYYYMMDD,
  parseFecha
} from '../utils/maintenanceEngine';
import { exportElementToPDF } from '../utils/pdfGenerator';
import { Equipo } from '../types';

export const PlanMaestroView: React.FC = () => {
  const {
    selectedCliente,
    selectedAnio,
    setSelectedAnio,
    availableYears,
    clientes,
    equipos,
    historial,
    frecuencias,
    sistemas,
    addToast
  } = useMaintenance();
  const { userProfile } = useAuth();
  const canPrint = hasActionAccess(userProfile, 'imprimir_pdf');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSistema, setSelectedSistema] = useState('Todos');
  const [selectedCellInfo, setSelectedCellInfo] = useState<{
    equipo: Equipo;
    mesIdx: number;
    folio: string;
    fechaPrev: string;
    fechaReal?: string;
    tecnico?: string;
    comentarios?: string;
    estado: 'completada_a_tiempo' | 'completada_fuera' | 'vencida' | 'programada';
  } | null>(null);

  const [printMode, setPrintMode] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const planPrintRef = useRef<HTMLDivElement>(null);

  // Filter equipment by client, system, and search
  const equiposCliente = selectedCliente === 'Todos'
    ? equipos
    : equipos.filter(e => e.cliente.trim() === selectedCliente.trim());

  const equiposFiltrados = equiposCliente.filter(eq => {
    const matchesSis = selectedSistema === 'Todos' || eq.sistema === selectedSistema;
    const matchesSearch = eq.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.codigo_eq.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.marca.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSis && matchesSearch;
  });

  const mapaFoliosGlobal = generarMapaFoliosAnual(equiposCliente, selectedAnio, frecuencias, historial);
  const dictHistorial = new Map(historial.map(h => [h.id_ot.trim(), h]));

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Build matrix rows following Option A
  interface MatrixRowGroup {
    equipo: Equipo;
    subIndex: number;
    suffix: string;
    rowPrevista: Record<string, string>;
    rowReal: Record<string, string>;
    rowFolio: Record<string, string>;
    rowStatus: Record<string, 'completada_a_tiempo' | 'completada_fuera' | 'vencida' | 'programada' | 'vacio'>;
  }

  const matrixGroups: MatrixRowGroup[] = [];
  const exportRows: Record<string, string>[] = [];

  for (const eq of equiposFiltrados) {
    const eqCode = eq.codigo_eq.trim();
    const occurs = calcularOcurrenciasEquipo(eq, selectedAnio, frecuencias, historial, equiposCliente);

    // Group by month
    const groupedByMonth: { [key: number]: typeof occurs } = {};
    for (const occ of occurs) {
      if (!groupedByMonth[occ.mes_n]) groupedByMonth[occ.mes_n] = [];
      groupedByMonth[occ.mes_n].push(occ);
    }

    const maxOccursInMonth = Math.max(
      ...Object.values(groupedByMonth).map(v => v.length),
      1
    );

    for (let sub_i = 0; sub_i < maxOccursInMonth; sub_i++) {
      const suffix = maxOccursInMonth > 1 ? ` #${sub_i + 1}` : '';
      const rPrev: Record<string, string> = { ID: eqCode, Equipo: `${eq.nombre}${suffix}`, Frecuencia: eq.frecuencia, Detalle: 'Fecha Prevista' };
      const rReal: Record<string, string> = { ID: '', Equipo: '', Frecuencia: '', Detalle: 'Fecha Realizada' };
      const rFolio: Record<string, string> = { ID: '', Equipo: '', Frecuencia: '', Detalle: 'ID de Orden' };
      const rStatus: Record<string, 'completada_a_tiempo' | 'completada_fuera' | 'vencida' | 'programada' | 'vacio'> = {};

      for (let mIdx = 1; mIdx <= 12; mIdx++) {
        const mLabel = MESES_L[mIdx - 1];
        const listMonth = groupedByMonth[mIdx] || [];

        if (sub_i < listMonth.length) {
          const occItem = listMonth[sub_i];
          const dtPrevStr = formatFechaDDMMYYYY(occItem.fecha);
          const freq = String(eq.frecuencia || '').trim();
          const folId = occItem.historialMatch?.id_ot?.trim() ||
            mapaFoliosGlobal.get(`${eqCode}_${freq}_${occItem.seq_key}`) ||
            mapaFoliosGlobal.get(`${eqCode}_${freq}_${formatFechaYYYYMMDD(occItem.fecha)}`) ||
            mapaFoliosGlobal.get(`${eqCode}_${occItem.seq_key}`) ||
            mapaFoliosGlobal.get(`${eqCode}_${occItem.fecha.toISOString().slice(0, 10)}`) ||
            `MP-${selectedAnio}-${String(mIdx).padStart(2, '0')}-0001`;

          rPrev[mLabel] = dtPrevStr;
          rFolio[mLabel] = folId;

          const reg = occItem.historialMatch || dictHistorial.get(folId);
          if (reg) {
            rReal[mLabel] = reg.fecha_real;
            const fReal = parseFecha(reg.fecha_real);
            const prevD = new Date(occItem.fecha);
            prevD.setHours(0, 0, 0, 0);

            if (fReal) {
              fReal.setHours(0, 0, 0, 0);
              const diffDays = Math.abs(Math.round((fReal.getTime() - prevD.getTime()) / (1000 * 60 * 60 * 24)));
              rStatus[mLabel] = diffDays <= 4 ? 'completada_a_tiempo' : 'completada_fuera';
            } else {
              rStatus[mLabel] = 'completada_a_tiempo';
            }
          } else {
            rReal[mLabel] = '';
            const prevD = new Date(occItem.fecha);
            prevD.setHours(0, 0, 0, 0);
            rStatus[mLabel] = prevD.getTime() < hoy.getTime() ? 'vencida' : 'programada';
          }
        } else {
          rPrev[mLabel] = '';
          rReal[mLabel] = '';
          rFolio[mLabel] = '';
          rStatus[mLabel] = 'vacio';
        }
      }

      matrixGroups.push({
        equipo: eq,
        subIndex: sub_i,
        suffix,
        rowPrevista: rPrev,
        rowReal: rReal,
        rowFolio: rFolio,
        rowStatus: rStatus
      });
    }
  }

  // Paginate equipment in chunks of 5 so an equipment is NEVER cut across page breaks
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(matrixGroups.length / ITEMS_PER_PAGE));
  const pagedGroups: MatrixRowGroup[][] = [];
  for (let i = 0; i < totalPages; i++) {
    pagedGroups.push(matrixGroups.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE));
  }

  const handleDownloadPDF = async () => {
    if (!planPrintRef.current) return;
    try {
      setIsGeneratingPDF(true);
      addToast('Generando documento PDF oficial del Plan Maestro...', 'info');
      await exportElementToPDF(
        planPrintRef.current,
        `Plan_Maestro_Mantenimiento_${selectedAnio}_${selectedCliente.replace(/\s+/g, '_')}`,
        'landscape'
      );
      addToast('Plan Maestro descargado como PDF exitosamente.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Error al generar el PDF. Intente nuevamente.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('window.print() prevented, fallback to PDF download', err);
      handleDownloadPDF();
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            Plan Maestro Anual {selectedAnio}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cronograma anual integral de mantenimiento preventivo, folios MP y proyección futura basada en ejecución real.
          </p>
        </div>

        {/* Action Controls */}
        {canPrint && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingPDF ? 'Generando PDF...' : 'Generar / Descargar PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Plan</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Legend Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs no-print">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por equipo o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-60"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSistema}
              onChange={(e) => setSelectedSistema(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-medium text-slate-800 focus:outline-none"
            >
              <option value="Todos">Todos los Sistemas</option>
              {sistemas.map(s => (
                <option key={s.codigo_sis} value={s.nombre}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Año:</span>
            <select
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(Number(e.target.value))}
              className="bg-blue-50 border border-blue-200 rounded-lg py-1.5 px-2.5 text-xs font-bold text-blue-900 focus:outline-none"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span>A Tiempo</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
            <span>Fuera de Término</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
            <span>Vencida Pendiente</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300"></span>
            <span>Programada</span>
          </div>
        </div>
      </div>

      {/* Official Master Plan Multi-Sheet Paginated Document */}
      <div ref={planPrintRef} className="space-y-8 print-container">
        {matrixGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            No se encontraron equipos para el filtro seleccionado.
          </div>
        ) : (
          pagedGroups.map((chunk, pageIdx) => {
            return (
              <div
                key={`page_${pageIdx}`}
                className="print-sheet bg-white rounded-xl border border-slate-300 p-5 sm:p-6 space-y-4 shadow-sm flex flex-col justify-between"
                style={{ minHeight: '640px' }}
              >
                {/* Sheet Header with Client Logo */}
                {(() => {
                  const currentClienteObj = clientes.find(c => c.nombre.trim() === selectedCliente.trim());
                  return (
                    <div className="border-b border-slate-900 pb-2.5 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 max-w-[150px] bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                          <img
                            src="/assets/aistudio/prodexus_921c729e.jpeg"
                            alt="Prodexus CMMS"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        {currentClienteObj?.logo && (
                          <div className="h-11 max-w-[140px] bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                            <img
                              src={currentClienteObj.logo}
                              alt={`Logo ${currentClienteObj.nombre}`}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[7.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              CMMS INDUSTRIAL SYSTEM
                            </span>
                            <span className="text-[8px] font-mono text-slate-500 font-bold">
                              DOC-AUDIT-MP{String(selectedAnio).slice(-2)} (Rev. 04)
                            </span>
                          </div>
                          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-tight text-slate-900 mt-0.5">
                            PRODEXUS Enterprise · Plan Maestro Anual {selectedAnio}
                          </h2>
                          <p className="text-[9px] text-slate-600 font-medium mt-0.5">
                            Empresa / Planta: <span className="font-bold text-slate-900">{selectedCliente.toUpperCase()}</span> · Sistema: <span className="font-semibold text-slate-800">{selectedSistema}</span> · Emisión: <span className="font-mono">{new Date().toLocaleDateString('es-ES')}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="inline-block bg-slate-900 text-white font-mono font-bold text-[8.5px] px-2 py-0.5 rounded shadow-xs">
                          HOJA {pageIdx + 1} DE {totalPages}
                        </div>
                        <p className="text-[8px] text-slate-500 font-medium mt-0.5">
                          Equipos en hoja: {chunk.length} (Total: {matrixGroups.length})
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Master Plan High-Density Matrix Table (Full 12 Months, Table-Fixed) */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse table-fixed">
                    <thead className="bg-slate-900 text-white font-bold text-[7.5px] uppercase tracking-wider">
                      <tr>
                        <th className="py-1 px-1 border-r border-slate-700 w-[5%] text-center">ID</th>
                        <th className="py-1 px-1.5 border-r border-slate-700 w-[18%]">Equipo & Sistema</th>
                        <th className="py-1 px-0.5 border-r border-slate-700 w-[7%] text-center">Frecuencia</th>
                        <th className="py-1 px-0.5 border-r border-slate-700 w-[6%] text-center">Detalle</th>
                        {MESES_L.map(m => (
                          <th key={m} className="py-1 px-0.5 text-center border-r border-slate-700 w-[5.33%] text-[7.5px]">
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {chunk.map((group) => {
                        return (
                          <React.Fragment key={`${group.equipo.codigo_eq}_${group.subIndex}`}>
                            {/* Row 1: Fecha Prevista */}
                            <tr className="border-t-2 border-slate-300 font-semibold text-slate-900">
                              <td rowSpan={3} className="py-1.5 px-1 text-center font-mono border-r border-slate-200 align-top pt-2 bg-slate-100/70">
                                <div className="font-mono font-bold text-slate-900 text-[7px] tracking-tighter leading-tight whitespace-nowrap" title={group.equipo.codigo_eq}>
                                  {group.equipo.codigo_eq}
                                </div>
                              </td>
                              <td rowSpan={3} className="py-1.5 px-1.5 border-r border-slate-200 align-top pt-1.5 bg-white">
                                <div className="font-semibold text-slate-900 leading-snug text-[7.5px] line-clamp-2" title={group.equipo.nombre}>
                                  {group.equipo.nombre}{group.suffix}
                                </div>
                                <div className="text-[7px] text-slate-400 truncate mt-0.5">{group.equipo.sistema}</div>
                              </td>
                              <td rowSpan={3} className="py-1.5 px-0.5 text-center border-r border-slate-200 align-top pt-1.5 text-slate-600 bg-white">
                                <span className="text-[7.5px] font-semibold">{group.equipo.frecuencia}</span>
                              </td>
                              <td className="py-1 px-0.5 text-slate-600 border-r border-slate-200 font-medium text-[7px] bg-slate-50 text-center whitespace-nowrap">
                                Prev.
                              </td>
                              {MESES_L.map((m, mIdx) => {
                                const dateVal = group.rowPrevista[m];
                                const status = group.rowStatus[m];
                                const folio = group.rowFolio[m];

                                let statusBg = 'bg-slate-50/50';
                                if (status === 'completada_a_tiempo') statusBg = 'bg-emerald-50 text-emerald-800 font-bold';
                                else if (status === 'completada_fuera') statusBg = 'bg-amber-50 text-amber-800 font-bold';
                                else if (status === 'vencida') statusBg = 'bg-rose-50 text-rose-800 font-bold';
                                else if (status === 'programada') statusBg = 'bg-blue-50/70 text-slate-800 font-medium';

                                return (
                                  <td
                                    key={m}
                                    onClick={() => {
                                      if (dateVal) {
                                        const reg = dictHistorial.get(folio);
                                        setSelectedCellInfo({
                                          equipo: group.equipo,
                                          mesIdx: mIdx + 1,
                                          folio,
                                          fechaPrev: dateVal,
                                          fechaReal: reg?.fecha_real,
                                          tecnico: reg?.tecnico || group.equipo.tecnico,
                                          comentarios: reg?.comentarios,
                                          estado: status as any
                                        });
                                      }
                                    }}
                                    title={dateVal || ''}
                                    className={`py-1 px-0.5 text-center font-mono border-r border-slate-200 tabular-nums cursor-pointer transition-colors hover:brightness-95 whitespace-nowrap ${statusBg}`}
                                  >
                                    <span className="font-mono font-bold text-[6.5px] tracking-tighter block leading-none">
                                      {dateVal || '-'}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>

                            {/* Row 2: Fecha Realizada */}
                            <tr className="text-slate-700 text-[10px]">
                              <td className="py-1 px-0.5 text-slate-500 border-r border-slate-200 font-normal text-[7px] bg-white text-center whitespace-nowrap">
                                Real.
                              </td>
                              {MESES_L.map(m => {
                                const realVal = group.rowReal[m];
                                return (
                                  <td
                                    key={m}
                                    title={realVal || ''}
                                    className="py-1 px-0.5 text-center font-mono border-r border-slate-200 tabular-nums font-semibold text-emerald-700 bg-white whitespace-nowrap"
                                  >
                                    <span className="font-mono font-semibold text-[6.5px] tracking-tighter block leading-none">
                                      {realVal || '-'}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>

                            {/* Row 3: ID de Orden */}
                            <tr className="text-slate-600 text-[9px]">
                              <td className="py-1 px-0.5 text-slate-500 border-r border-slate-200 font-normal text-[7px] bg-slate-50/30 text-center whitespace-nowrap">
                                Orden
                              </td>
                              {MESES_L.map(m => {
                                const folioVal = group.rowFolio[m];
                                const shortFolio = /^MP-\d{4}-/.test(folioVal || '') ? 'MP-' + folioVal.split('-').pop() : folioVal;
                                return (
                                  <td
                                    key={m}
                                    title={folioVal || ''}
                                    className="py-1 px-0.5 text-center font-mono border-r border-slate-200 tabular-nums text-slate-600 bg-slate-50/30 font-semibold whitespace-nowrap"
                                  >
                                    <span className="font-mono text-[6.5px] tracking-tighter block leading-none">
                                      {shortFolio || '-'}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sheet Footer: Approver Signatures & Page Number (ON EVERY SINGLE SHEET) */}
                <div className="pt-2 border-t border-slate-300 text-xs text-slate-600 mt-auto">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="border border-slate-200 bg-slate-50/50 rounded p-1.5">
                      <p className="font-bold text-[8px] text-slate-900 uppercase">1. ELABORADO POR:</p>
                      <div className="h-6 border-b border-dashed border-slate-400 mt-0.5 flex items-end justify-center pb-0.5">
                        <span className="text-[7.5px] text-slate-400 italic">Firma y Sello</span>
                      </div>
                      <p className="text-[7.5px] text-slate-700 font-bold mt-0.5">Ing. Jefe de Mantenimiento</p>
                      <p className="text-[7px] text-slate-400">Depto. Técnico Operacional</p>
                    </div>
                    <div className="border border-slate-200 bg-slate-50/50 rounded p-1.5">
                      <p className="font-bold text-[8px] text-slate-900 uppercase">2. REVISADO POR:</p>
                      <div className="h-6 border-b border-dashed border-slate-400 mt-0.5 flex items-end justify-center pb-0.5">
                        <span className="text-[7.5px] text-slate-400 italic">Firma y Sello</span>
                      </div>
                      <p className="text-[7.5px] text-slate-700 font-bold mt-0.5">Supervisor de Calidad & Planta</p>
                      <p className="text-[7px] text-slate-400">Auditoría Interna ISO 9001</p>
                    </div>
                    <div className="border border-slate-200 bg-slate-50/50 rounded p-1.5">
                      <p className="font-bold text-[8px] text-slate-900 uppercase">3. APROBADO POR:</p>
                      <div className="h-6 border-b border-dashed border-slate-400 mt-0.5 flex items-end justify-center pb-0.5">
                        <span className="text-[7.5px] text-slate-400 italic">Firma y Sello</span>
                      </div>
                      <p className="text-[7.5px] text-slate-700 font-bold mt-0.5">Gerencia de Operaciones</p>
                      <p className="text-[7px] text-slate-400">Dirección General</p>
                    </div>
                  </div>

                  {/* Subfooter Metadata Bar */}
                  <div className="flex items-center justify-between text-[7.5px] text-slate-400 font-mono mt-1.5 pt-1 border-t border-slate-200">
                    <span>PRODEXUS Enterprise CMMS · Cumplimiento de Confiabilidad Operacional ISO 9001:2015</span>
                    <span className="font-bold text-slate-700">Página {pageIdx + 1} de {totalPages}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal for Selected Cell */}
      {selectedCellInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Detalle de Programación Preventiva
                </h3>
              </div>
              <button
                onClick={() => setSelectedCellInfo(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Folio de Orden:</span>
                  <span className="font-mono font-bold text-blue-600">{selectedCellInfo.folio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Equipo:</span>
                  <span className="font-semibold text-slate-800">{selectedCellInfo.equipo.nombre} ({selectedCellInfo.equipo.codigo_eq})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Sistema:</span>
                  <span className="text-slate-700">{selectedCellInfo.equipo.sistema}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Frecuencia:</span>
                  <span className="text-slate-700">{selectedCellInfo.equipo.frecuencia}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Fecha Prevista</span>
                  <p className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                    {selectedCellInfo.fechaPrev}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Fecha Real Ejecutada</span>
                  <p className="text-sm font-mono font-bold text-emerald-600 mt-0.5">
                    {selectedCellInfo.fechaReal || 'Pendiente de Cierre'}
                  </p>
                </div>
              </div>

              {selectedCellInfo.comentarios && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Observaciones Técnicas</span>
                  <p className="text-xs text-slate-700 mt-1 italic">
                    "{selectedCellInfo.comentarios}"
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium">
                    Técnico ejecutor: {selectedCellInfo.tecnico}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCellInfo(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
