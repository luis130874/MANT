/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  Printer,
  FileDown,
  FileSpreadsheet,
  X,
  Loader2,
  Cpu,
  Gauge,
  Layers
} from 'lucide-react';
import { Cliente, Equipo, Instrumento } from '../types';
import { formatFechaDDMMYYYY, parseFecha } from '../utils/maintenanceEngine';
import { exportElementToPDF } from '../utils/pdfGenerator';
import { useMaintenance } from '../context/MaintenanceContext';

interface CatalogoListadoModalProps {
  mode: 'equipos' | 'instrumentos';
  selectedCliente: string;
  clientes: Cliente[];
  equipos?: Equipo[];
  instrumentos?: Instrumento[];
  filtroDescripcion?: string;
  onClose: () => void;
}

interface EquipoConsolidado {
  codigo_eq: string;
  cliente: string;
  nombre: string;
  sistema: string;
  marca: string;
  modelo: string;
  frecuencias: string[];
  criticidad: string;
  tecnico: string;
}

function escapeCsvCell(val: unknown): string {
  const s = String(val ?? '').replace(/\r?\n/g, ' ').trim();
  if (s.includes(',') || s.includes('"') || s.includes(';')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsvFile(filename: string, headers: string[], rows: unknown[][]) {
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(','))
  ];
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const formatDisplayDate = (val?: string): string => {
  if (!val) return '-';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
  const d = parseFecha(val);
  return d ? formatFechaDDMMYYYY(d) : val;
};

export const CatalogoListadoModal: React.FC<CatalogoListadoModalProps> = ({
  mode,
  selectedCliente,
  clientes,
  equipos = [],
  instrumentos = [],
  filtroDescripcion,
  onClose
}) => {
  const { addToast } = useMaintenance();
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [equipoVistaModo, setEquipoVistaModo] = useState<'planes' | 'consolidado'>('planes');

  const currentClienteObj = clientes.find(
    c => c.nombre.trim() === selectedCliente.trim()
  );

  // Consolidated unique equipment view (1 row per asset)
  const equiposConsolidados = useMemo<EquipoConsolidado[]>(() => {
    const map = new Map<string, EquipoConsolidado>();
    for (const eq of equipos) {
      const key = `${eq.cliente.trim().toLowerCase()}___${eq.codigo_eq.trim().toUpperCase()}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          codigo_eq: eq.codigo_eq,
          cliente: eq.cliente,
          nombre: eq.nombre,
          sistema: eq.sistema,
          marca: eq.marca,
          modelo: eq.modelo,
          frecuencias: [eq.frecuencia],
          criticidad: eq.criticidad || 'Media',
          tecnico: eq.tecnico || 'Sin asignar'
        });
      } else if (!existing.frecuencias.includes(eq.frecuencia)) {
        existing.frecuencias.push(eq.frecuencia);
      }
    }
    return Array.from(map.values());
  }, [equipos]);

  const ITEMS_PER_PAGE = 14;

  const pagedEquiposPlanes = useMemo(() => {
    const total = Math.max(1, Math.ceil(equipos.length / ITEMS_PER_PAGE));
    const pages: Equipo[][] = [];
    for (let i = 0; i < total; i++) {
      pages.push(equipos.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE));
    }
    return pages;
  }, [equipos]);

  const pagedEquiposConsolidado = useMemo(() => {
    const total = Math.max(1, Math.ceil(equiposConsolidados.length / ITEMS_PER_PAGE));
    const pages: EquipoConsolidado[][] = [];
    for (let i = 0; i < total; i++) {
      pages.push(equiposConsolidados.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE));
    }
    return pages;
  }, [equiposConsolidados]);

  const pagedInstrumentos = useMemo(() => {
    const total = Math.max(1, Math.ceil(instrumentos.length / ITEMS_PER_PAGE));
    const pages: Instrumento[][] = [];
    for (let i = 0; i < total; i++) {
      pages.push(instrumentos.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE));
    }
    return pages;
  }, [instrumentos]);

  const totalPages =
    mode === 'equipos'
      ? equipoVistaModo === 'planes'
        ? pagedEquiposPlanes.length
        : pagedEquiposConsolidado.length
      : pagedInstrumentos.length;

  const totalItemsCount =
    mode === 'equipos'
      ? equipoVistaModo === 'planes'
        ? equipos.length
        : equiposConsolidados.length
      : instrumentos.length;

  const handleDownloadPDF = async () => {
    if (!printContainerRef.current) return;
    try {
      setIsGeneratingPDF(true);
      const safeCliente = selectedCliente.replace(/\s+/g, '_');
      const baseName =
        mode === 'equipos'
          ? `Listado_Equipos_${safeCliente}_${new Date().toISOString().slice(0, 10)}`
          : `Listado_Instrumentos_${safeCliente}_${new Date().toISOString().slice(0, 10)}`;
      addToast(
        `Generando PDF oficial de ${mode === 'equipos' ? 'Equipos' : 'Instrumentos'}...`,
        'info'
      );
      await exportElementToPDF(printContainerRef.current, baseName, 'landscape');
      addToast('Listado descargado en PDF exitosamente.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Error al generar el PDF del listado. Intente nuevamente.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportCSV = () => {
    const safeCliente = selectedCliente.replace(/\s+/g, '_');
    const dateSlug = new Date().toISOString().slice(0, 10);

    if (mode === 'equipos') {
      if (equipoVistaModo === 'consolidado') {
        downloadCsvFile(
          `Listado_Equipos_Consolidado_${safeCliente}_${dateSlug}.csv`,
          ['Código', 'Equipo', 'Planta / Cliente', 'Sistema', 'Marca', 'Modelo', 'Frecuencias Asignadas', 'Criticidad', 'Técnico Habitual'],
          equiposConsolidados.map(eq => [
            eq.codigo_eq,
            eq.nombre,
            eq.cliente,
            eq.sistema,
            eq.marca,
            eq.modelo,
            eq.frecuencias.join(' / '),
            eq.criticidad,
            eq.tecnico
          ])
        );
      } else {
        downloadCsvFile(
          `Listado_Equipos_Planes_${safeCliente}_${dateSlug}.csv`,
          ['Código', 'Equipo', 'Planta / Cliente', 'Sistema', 'Marca', 'Modelo', 'Frecuencia', 'Próx. Mantención', 'Criticidad', 'Técnico Habitual'],
          equipos.map(eq => [
            eq.codigo_eq,
            eq.nombre,
            eq.cliente,
            eq.sistema,
            eq.marca,
            eq.modelo,
            eq.frecuencia,
            formatDisplayDate(eq.fecha_proxima),
            eq.criticidad || 'Media',
            eq.tecnico || 'Sin asignar'
          ])
        );
      }
      addToast('Listado de equipos exportado a Excel (CSV).', 'success');
      return;
    }

    downloadCsvFile(
      `Listado_Instrumentos_${safeCliente}_${dateSlug}.csv`,
      ['Código', 'Instrumento', 'Planta / Cliente', 'Equipo Asociado', 'Ubicación', 'Marca', 'Modelo', 'N° Serie', 'Variable Medición', 'Rango Operación', 'Tolerancia (EMP)', 'Frecuencia', 'Fecha Inicio', 'Metrólogo / Lab.', 'Estado'],
      instrumentos.map(inst => [
        inst.codigo_inst,
        inst.nombre,
        inst.cliente,
        inst.equipo_asociado || '-',
        inst.ubicacion || '-',
        inst.marca || '-',
        inst.modelo || '-',
        inst.numero_serie || '-',
        inst.variable_medicion,
        inst.rango_operacion,
        inst.tolerancia_emp,
        inst.frecuencia,
        formatDisplayDate(inst.fecha_proxima || inst.fecha_alta),
        inst.metrologo_habitual || '-',
        inst.estado
      ])
    );
    addToast('Listado de instrumentos exportado a Excel (CSV).', 'success');
  };

  const handleTriggerNativePrint = () => {
    try {
      window.print();
      addToast(
        'Si su navegador bloquea la impresión en vista embebida, use "Descargar PDF" para imprimir.',
        'info'
      );
    } catch (err) {
      console.warn('window.print() blocked, falling back to PDF download', err);
      void handleDownloadPDF();
    }
  };

  const renderHeader = (pageIdx: number) => (
    <div className="border-b-2 border-slate-900 pb-2.5 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-11 max-w-[140px] bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
          <img
            src="/assets/aistudio/prodexus_921c729e.jpeg"
            alt="Prodexus CMMS"
            className="max-h-full max-w-full object-contain"
          />
        </div>
        {currentClienteObj?.logo && (
          <div className="h-11 max-w-[130px] bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
            <img
              src={currentClienteObj.logo}
              alt={currentClienteObj.nombre}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
        <div>
          <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight">
            {currentClienteObj?.nombre || 'PRODEXUS ENTERPRISE CMMS'} ·{' '}
            {mode === 'equipos'
              ? 'LISTADO OFICIAL DE EQUIPOS Y MAQUINARIA'
              : 'PADRÓN OFICIAL DE INSTRUMENTOS METROLÓGICOS'}
          </h2>
          <p className="text-[10px] text-slate-600 font-medium">
            Planta: <strong>{selectedCliente.toUpperCase()}</strong>
            {currentClienteObj?.rut ? ` · RUT: ${currentClienteObj.rut}` : ''} · Emisión:{' '}
            {formatFechaDDMMYYYY(new Date())}
            {filtroDescripcion ? ` · Filtro: ${filtroDescripcion}` : ''}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span
          className={`font-mono text-[11px] font-bold text-white px-2.5 py-0.5 rounded ${
            mode === 'equipos' ? 'bg-slate-900' : 'bg-indigo-900'
          }`}
        >
          {mode === 'equipos' ? 'DOC-EQP-CAT26' : 'DOC-MET-PAD26'}
        </span>
        <p className="text-[10px] text-slate-500 font-semibold mt-1">
          Hoja {pageIdx + 1} de {totalPages}
        </p>
      </div>
    </div>
  );

  const renderFooter = (pageIdx: number) => (
    <div className="mt-auto pt-4 border-t border-slate-300">
      <div className="grid grid-cols-3 gap-6 text-center text-[9.5px] text-slate-600 mb-2">
        <div>
          <div className="border-b border-slate-400 h-6 mb-1" />
          <p className="font-bold text-slate-800">
            {mode === 'equipos' ? 'Jefe de Mantenimiento' : 'Responsable de Metrología'}
          </p>
          <p className="text-[8.5px] text-slate-400">
            {mode === 'equipos' ? 'Control de Activos de Planta' : 'Trazabilidad ISO/IEC 17025'}
          </p>
        </div>
        <div>
          <div className="border-b border-slate-400 h-6 mb-1" />
          <p className="font-bold text-slate-800">Supervisor de Calidad</p>
          <p className="text-[8.5px] text-slate-400">Auditoría Normativa ISO 9001</p>
        </div>
        <div>
          <div className="border-b border-slate-400 h-6 mb-1" />
          <p className="font-bold text-slate-800">Gerencia de Operaciones</p>
          <p className="text-[8.5px] text-slate-400">Aprobación de Padrón</p>
        </div>
      </div>
      <p className="text-center text-[8.5px] text-slate-400">
        PRODEXUS CMMS ·{' '}
        {mode === 'equipos'
          ? 'Catálogo Certificado de Equipos Industriales'
          : 'Padrón Certificado de Instrumentación Metrológica'}{' '}
        · Hoja {pageIdx + 1} de {totalPages}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-6">
      {/* Top Action Bar */}
      <div className="sticky top-0 z-10 w-full max-w-6xl bg-white border border-slate-200 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
        <div className="flex items-center gap-2.5">
          {mode === 'equipos' ? (
            <Cpu className="w-5 h-5 text-blue-600" />
          ) : (
            <Gauge className="w-5 h-5 text-indigo-600" />
          )}
          <div>
            <span className="text-sm font-bold text-slate-900 block">
              {mode === 'equipos'
                ? 'Emisión de Listado de Equipos'
                : 'Emisión de Listado de Instrumentos'}
            </span>
            <span className="text-[11px] text-slate-500">
              {totalItemsCount} {mode === 'equipos' ? 'registros' : 'instrumentos'} · {totalPages}{' '}
              {totalPages === 1 ? 'hoja' : 'hojas'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === 'equipos' && (
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-semibold mr-1">
              <button
                type="button"
                onClick={() => setEquipoVistaModo('planes')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  equipoVistaModo === 'planes'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Por Plan ({equipos.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setEquipoVistaModo('consolidado')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  equipoVistaModo === 'consolidado'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>Activos Únicos ({equiposConsolidados.length})</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{isGeneratingPDF ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerNativePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Listado</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg"
            title="Cerrar Vista Previa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Pages Container */}
      <div ref={printContainerRef} className="w-full max-w-6xl space-y-6 print-container">
        {mode === 'equipos' &&
          equipoVistaModo === 'planes' &&
          pagedEquiposPlanes.map((chunk, pageIdx) => (
            <div
              key={`eq_plan_page_${pageIdx}`}
              className="print-sheet bg-white text-slate-900 p-6 rounded-xl shadow-md border border-slate-300 space-y-4 flex flex-col justify-between"
              style={{ minHeight: '760px' }}
            >
              <div className="space-y-3">
                {renderHeader(pageIdx)}

                {/* Summary Strip */}
                <div className="grid grid-cols-4 gap-2.5 text-[10px]">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 font-semibold uppercase block">Planes Registrados</span>
                    <span className="text-sm font-black text-slate-900">{equipos.length} planes</span>
                  </div>
                  <div className="p-2 bg-blue-50/70 border border-blue-200 rounded">
                    <span className="text-blue-700 font-semibold uppercase block">Equipos Únicos</span>
                    <span className="text-sm font-black text-blue-900">{equiposConsolidados.length} activos</span>
                  </div>
                  <div className="p-2 bg-rose-50/60 border border-rose-200 rounded">
                    <span className="text-rose-700 font-semibold uppercase block">Criticidad Alta</span>
                    <span className="text-sm font-black text-rose-900">
                      {equipos.filter(e => e.criticidad === 'Alta').length} planes
                    </span>
                  </div>
                  <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded">
                    <span className="text-emerald-800 font-semibold uppercase block">Sistemas Cubiertos</span>
                    <span className="text-sm font-black text-emerald-900">
                      {new Set(equipos.map(e => e.sistema)).size} sistemas
                    </span>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                  <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                    <tr>
                      <th className="py-2 px-2 border border-slate-700">Código</th>
                      <th className="py-2 px-2 border border-slate-700">Equipo & Planta</th>
                      <th className="py-2 px-2 border border-slate-700">Sistema</th>
                      <th className="py-2 px-2 border border-slate-700">Marca / Modelo</th>
                      <th className="py-2 px-2 border border-slate-700 text-center">Frecuencia</th>
                      <th className="py-2 px-2 border border-slate-700 text-center">Próx. MP</th>
                      <th className="py-2 px-2 border border-slate-700 text-center">Criticidad</th>
                      <th className="py-2 px-2 border border-slate-700">Técnico Habitual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No hay equipos registrados para este filtro.
                        </td>
                      </tr>
                    ) : (
                      chunk.map((eq, i) => (
                        <tr key={eq.id || `${eq.codigo_eq}_${eq.frecuencia}_${i}`} className="bg-white">
                          <td className="py-1.5 px-2 border border-slate-300 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {eq.codigo_eq}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300">
                            <span className="font-bold text-slate-900 block">{eq.nombre}</span>
                            <span className="text-[8.5px] text-slate-500">{eq.cliente}</span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-slate-700">
                            {eq.sistema}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-slate-600">
                            {[eq.marca, eq.modelo].filter(Boolean).join(' · ') || '-'}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-center font-semibold text-slate-800">
                            {eq.frecuencia}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-center font-mono text-slate-700">
                            {formatDisplayDate(eq.fecha_proxima)}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                            <span
                              className={
                                eq.criticidad === 'Alta'
                                  ? 'text-rose-700'
                                  : eq.criticidad === 'Media'
                                  ? 'text-amber-700'
                                  : 'text-slate-600'
                              }
                            >
                              {(eq.criticidad || 'Media').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-slate-700">
                            {eq.tecnico || 'Sin asignar'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {renderFooter(pageIdx)}
            </div>
          ))}

        {mode === 'equipos' &&
          equipoVistaModo === 'consolidado' &&
          pagedEquiposConsolidado.map((chunk, pageIdx) => (
            <div
              key={`eq_cons_page_${pageIdx}`}
              className="print-sheet bg-white text-slate-900 p-6 rounded-xl shadow-md border border-slate-300 space-y-4 flex flex-col justify-between"
              style={{ minHeight: '760px' }}
            >
              <div className="space-y-3">
                {renderHeader(pageIdx)}

                <div className="grid grid-cols-4 gap-2.5 text-[10px]">
                  <div className="p-2 bg-blue-50/70 border border-blue-200 rounded">
                    <span className="text-blue-700 font-semibold uppercase block">Activos Únicos</span>
                    <span className="text-sm font-black text-blue-900">{equiposConsolidados.length} equipos</span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 font-semibold uppercase block">Planes Totales</span>
                    <span className="text-sm font-black text-slate-900">{equipos.length} frecuencias</span>
                  </div>
                  <div className="p-2 bg-rose-50/60 border border-rose-200 rounded">
                    <span className="text-rose-700 font-semibold uppercase block">Criticidad Alta</span>
                    <span className="text-sm font-black text-rose-900">
                      {equiposConsolidados.filter(e => e.criticidad === 'Alta').length} activos
                    </span>
                  </div>
                  <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded">
                    <span className="text-emerald-800 font-semibold uppercase block">Sistemas</span>
                    <span className="text-sm font-black text-emerald-900">
                      {new Set(equiposConsolidados.map(e => e.sistema)).size} sistemas
                    </span>
                  </div>
                </div>

                <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                  <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                    <tr>
                      <th className="py-2 px-2 border border-slate-700">Código</th>
                      <th className="py-2 px-2 border border-slate-700">Equipo & Planta</th>
                      <th className="py-2 px-2 border border-slate-700">Sistema</th>
                      <th className="py-2 px-2 border border-slate-700">Marca / Modelo</th>
                      <th className="py-2 px-2 border border-slate-700">Frecuencias Asignadas</th>
                      <th className="py-2 px-2 border border-slate-700 text-center">Criticidad</th>
                      <th className="py-2 px-2 border border-slate-700">Técnico Habitual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No hay equipos registrados para este filtro.
                        </td>
                      </tr>
                    ) : (
                      chunk.map((eq) => (
                        <tr key={`${eq.cliente}_${eq.codigo_eq}`} className="bg-white">
                          <td className="py-1.5 px-2 border border-slate-300 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {eq.codigo_eq}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300">
                            <span className="font-bold text-slate-900 block">{eq.nombre}</span>
                            <span className="text-[8.5px] text-slate-500">{eq.cliente}</span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-slate-700">
                            {eq.sistema}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-slate-600">
                            {[eq.marca, eq.modelo].filter(Boolean).join(' · ') || '-'}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 font-semibold text-blue-800">
                            {eq.frecuencias.join(' · ')}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                            <span
                              className={
                                eq.criticidad === 'Alta'
                                  ? 'text-rose-700'
                                  : eq.criticidad === 'Media'
                                  ? 'text-amber-700'
                                  : 'text-slate-600'
                              }
                            >
                              {eq.criticidad.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-slate-700">
                            {eq.tecnico}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {renderFooter(pageIdx)}
            </div>
          ))}

        {mode === 'instrumentos' &&
          pagedInstrumentos.map((chunk, pageIdx) => (
            <div
              key={`inst_page_${pageIdx}`}
              className="print-sheet bg-white text-slate-900 p-6 rounded-xl shadow-md border border-slate-300 space-y-4 flex flex-col justify-between"
              style={{ minHeight: '760px' }}
            >
              <div className="space-y-3">
                {renderHeader(pageIdx)}

                <div className="grid grid-cols-4 gap-2.5 text-[10px]">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 font-semibold uppercase block">Total en Listado</span>
                    <span className="text-sm font-black text-slate-900">{instrumentos.length} instrumentos</span>
                  </div>
                  <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded">
                    <span className="text-emerald-800 font-semibold uppercase block">Activos en Servicio</span>
                    <span className="text-sm font-black text-emerald-900">
                      {instrumentos.filter(i => i.estado === 'Activo').length} activos
                    </span>
                  </div>
                  <div className="p-2 bg-rose-50/60 border border-rose-200 rounded">
                    <span className="text-rose-700 font-semibold uppercase block">Dados de Baja</span>
                    <span className="text-sm font-black text-rose-900">
                      {instrumentos.filter(i => i.estado === 'Baja').length} retirados
                    </span>
                  </div>
                  <div className="p-2 bg-indigo-50/60 border border-indigo-200 rounded">
                    <span className="text-indigo-800 font-semibold uppercase block">Variables Controladas</span>
                    <span className="text-sm font-black text-indigo-900">
                      {new Set(instrumentos.map(i => i.variable_medicion)).size} magnitudes
                    </span>
                  </div>
                </div>

                <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                  <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                    <tr>
                      <th className="py-2 px-2 border border-slate-700">Código</th>
                      <th className="py-2 px-2 border border-slate-700">Instrumento / Marca / Serie</th>
                      <th className="py-2 px-2 border border-slate-700">Planta / Equipo / Ubic.</th>
                      <th className="py-2 px-2 border border-slate-700">Variable & Rango</th>
                      <th className="py-2 px-2 border border-slate-700 text-center">EMP</th>
                      <th className="py-2 px-2 border border-slate-700 text-center">Frec. / Inicio</th>
                      <th className="py-2 px-2 border border-slate-700">Metrólogo / Lab.</th>
                      <th className="py-2 px-2 border border-slate-700 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No hay instrumentos registrados para este filtro.
                        </td>
                      </tr>
                    ) : (
                      chunk.map(inst => (
                        <tr
                          key={inst.codigo_inst}
                          className={inst.estado === 'Baja' ? 'bg-rose-50/30' : 'bg-white'}
                        >
                          <td className="py-1.5 px-2 border border-slate-300 font-mono font-bold text-indigo-800 whitespace-nowrap">
                            {inst.codigo_inst}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300">
                            <span className="font-bold text-slate-900 block">{inst.nombre}</span>
                            <span className="text-[8.5px] text-slate-500">
                              {[
                                inst.marca,
                                inst.modelo,
                                inst.numero_serie ? `S/N: ${inst.numero_serie}` : ''
                              ]
                                .filter(Boolean)
                                .join(' · ') || 'Sin especificaciones'}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300">
                            <span className="font-semibold text-slate-800 block">{inst.cliente}</span>
                            <span className="text-[8.5px] text-slate-500">
                              {inst.equipo_asociado ? `Eq: ${inst.equipo_asociado}` : 'Uso general'}
                              {inst.ubicacion ? ` · ${inst.ubicacion}` : ''}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300">
                            <span className="font-medium text-slate-800 block">{inst.variable_medicion}</span>
                            <span className="font-mono text-[8.5px] text-slate-500">{inst.rango_operacion}</span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-center font-mono font-semibold text-slate-800">
                            {inst.tolerancia_emp}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-center">
                            <span className="font-semibold text-slate-800 block">{inst.frecuencia}</span>
                            <span className="font-mono text-[8.5px] text-indigo-700">
                              {formatDisplayDate(inst.fecha_proxima || inst.fecha_alta)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-slate-700">
                            {inst.metrologo_habitual || 'Metrología Interna'}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                            <span
                              className={
                                inst.estado === 'Activo' ? 'text-emerald-700' : 'text-rose-700'
                              }
                            >
                              {inst.estado.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {renderFooter(pageIdx)}
            </div>
          ))}
      </div>
    </div>
  );
};
