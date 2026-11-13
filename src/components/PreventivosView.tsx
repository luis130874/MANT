/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileCheck2,
  Calendar,
  Printer,
  CheckCircle,
  Clock,
  Search,
  Filter,
  CheckSquare,
  Wrench,
  AlertCircle,
  Download
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
import { Equipo } from '../types';
import { RepuestosConsumoSelector, SelectedRepuestoConsumo } from './RepuestosConsumoSelector';

interface PreventivosViewProps {
  onPrintOrder?: (order: {
    tipo: 'MP';
    folio: string;
    equipo: Equipo;
    fechaProgramada: string;
    protocolo: string[];
    tecnico: string;
  }) => void;
  onPrintBatch?: (orders: Array<{
    tipo: 'MP';
    folio: string;
    equipo: Equipo;
    fechaProgramada: string;
    protocolo: string[];
    tecnico: string;
  }>) => void;
}

export const PreventivosView: React.FC<PreventivosViewProps> = ({
  onPrintOrder,
  onPrintBatch
}) => {
  const {
    selectedCliente,
    selectedAnio,
    setSelectedAnio,
    availableYears,
    equipos,
    historial,
    frecuencias,
    tecnicos,
    registrarCierrePreventivo,
    registrarSalidasStockBatch,
    addToast
  } = useMaintenance();
  const { userProfile } = useAuth();
  const canClose = hasActionAccess(userProfile, 'cerrar_ordenes');
  const canPrint = hasActionAccess(userProfile, 'imprimir_pdf');

  const [activeSubTab, setActiveSubTab] = useState<'emision' | 'cierre' | 'historial'>('emision');
  const [selectedMes, setSelectedMes] = useState<number>(new Date().getMonth() + 1);
  const [searchHistory, setSearchHistory] = useState('');

  // Form State for Cierre
  const [selectedOrderToClose, setSelectedOrderToClose] = useState<string>('');
  const [cierreFechaReal, setCierreFechaReal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [cierreTecnico, setCierreTecnico] = useState<string>('');
  const [cierreComentarios, setCierreComentarios] = useState<string>('');
  const [cierreHoras, setCierreHoras] = useState<number>(2.5);
  const [cierreRepuestos, setCierreRepuestos] = useState<string>('');
  const [stockConsumido, setStockConsumido] = useState<SelectedRepuestoConsumo[]>([]);
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  const equiposCliente = selectedCliente === 'Todos'
    ? equipos
    : equipos.filter(e => e.cliente.trim() === selectedCliente.trim());

  const mapaFoliosGlobal = generarMapaFoliosAnual(equiposCliente, selectedAnio, frecuencias, historial);
  const dictHistorial = new Map(historial.map(h => [h.id_ot.trim(), h]));

  // Ocurrencias del mes y año seleccionados
  const ocurrenciasMes: Array<{
    equipo: Equipo;
    folio: string;
    fecha: Date;
    fechaStr: string;
    isCerrada: boolean;
    historialReg?: typeof historial[0];
  }> = [];

  for (const eq of equiposCliente) {
    const eqCode = eq.codigo_eq.trim();
    const occurs = calcularOcurrenciasEquipo(eq, selectedAnio, frecuencias, historial, equiposCliente);
    for (const occ of occurs) {
      if (occ.mes_n === selectedMes) {
        const freq = String(eq.frecuencia || '').trim();
        const folio = occ.historialMatch?.id_ot?.trim() ||
          mapaFoliosGlobal.get(`${eqCode}_${freq}_${occ.seq_key}`) ||
          mapaFoliosGlobal.get(`${eqCode}_${freq}_${formatFechaYYYYMMDD(occ.fecha)}`) ||
          mapaFoliosGlobal.get(`${eqCode}_${occ.seq_key}`) ||
          mapaFoliosGlobal.get(`${eqCode}_${occ.fecha.toISOString().slice(0, 10)}`) ||
          `MP-${selectedAnio}-${String(selectedMes).padStart(2, '0')}-0001`;

        const reg = occ.historialMatch || dictHistorial.get(folio);
        ocurrenciasMes.push({
          equipo: eq,
          folio,
          fecha: occ.fecha,
          fechaStr: formatFechaDDMMYYYY(occ.fecha),
          isCerrada: !!reg,
          historialReg: reg
        });
      }
    }
  }

  // Lista de pendientes de cierre para el año seleccionado
  const currentYearNow = new Date().getFullYear();
  const mesActual = new Date().getMonth() + 1;
  const maxMesPendiente = selectedAnio < currentYearNow ? 12 : selectedAnio === currentYearNow ? mesActual : 12;

  const pendientesCierreList: Array<{
    label: string;
    folio: string;
    equipo: Equipo;
    mes_n: number;
    fechaPrevStr: string;
  }> = [];

  for (const eq of equiposCliente) {
    const eqCode = eq.codigo_eq.trim();
    const freq = String(eq.frecuencia || '').trim();
    const occurs = calcularOcurrenciasEquipo(eq, selectedAnio, frecuencias, historial, equiposCliente);
    for (const occ of occurs) {
      if (occ.mes_n <= maxMesPendiente) {
        const folio = occ.historialMatch?.id_ot?.trim() ||
          mapaFoliosGlobal.get(`${eqCode}_${freq}_${occ.seq_key}`) ||
          mapaFoliosGlobal.get(`${eqCode}_${freq}_${formatFechaYYYYMMDD(occ.fecha)}`) ||
          mapaFoliosGlobal.get(`${eqCode}_${occ.seq_key}`) ||
          mapaFoliosGlobal.get(`${eqCode}_${occ.fecha.toISOString().slice(0, 10)}`) ||
          `MP-${selectedAnio}-${String(occ.mes_n).padStart(2, '0')}-0001`;

        if (!occ.historialMatch && !dictHistorial.has(folio)) {
          const dtStr = formatFechaDDMMYYYY(occ.fecha);
          pendientesCierreList.push({
            label: `[${MESES_L[occ.mes_n - 1]} ${selectedAnio}] ${folio} (${dtStr}) - ${eq.nombre} [${eq.frecuencia}]`,
            folio,
            equipo: eq,
            mes_n: occ.mes_n,
            fechaPrevStr: dtStr
          });
        }
      }
    }
  }

  const selectedPendingItem = pendientesCierreList.find(p => p.folio === selectedOrderToClose);

  const handleCierreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPendingItem) {
      addToast('Por favor seleccione una orden preventiva pendiente.', 'warning');
      return;
    }
    if (!cierreTecnico) {
      addToast('Por favor seleccione el técnico ejecutor.', 'warning');
      return;
    }

    const dateParsed = parseFecha(cierreFechaReal) || new Date();

    const deductedLabels = stockConsumido.length > 0
      ? registrarSalidasStockBatch(
          stockConsumido.map(item => ({ repuesto_id: item.repuestoId, cantidad: item.cantidad })),
          {
            motivo: `Consumo en Mantenimiento Preventivo ${selectedPendingItem.folio}`,
            ot_asociada: selectedPendingItem.folio,
            equipo_asociado: selectedPendingItem.equipo.codigo_eq,
            solicitante: cierreTecnico
          }
        )
      : [];

    const repuestosFinal = [...deductedLabels, cierreRepuestos.trim()].filter(Boolean).join(' | ');

    registrarCierrePreventivo({
      codigo_eq: selectedPendingItem.equipo.codigo_eq,
      mes_n: selectedPendingItem.mes_n,
      fecha_real: formatFechaDDMMYYYY(dateParsed),
      id_ot: selectedPendingItem.folio,
      comentarios: cierreComentarios || 'Mantenimiento ejecutado según protocolo de tareas.',
      tecnico: cierreTecnico,
      duracion_horas: cierreHoras,
      repuestos_utilizados: repuestosFinal,
      frecuencia: selectedPendingItem.equipo.frecuencia
    });

    // Reset Form
    setSelectedOrderToClose('');
    setCierreComentarios('');
    setCierreRepuestos('');
    setStockConsumido([]);
    setCheckedTasks({});
  };

  const handlePrintAllMonth = () => {
    if (!onPrintBatch || ocurrenciasMes.length === 0) return;
    const batch = ocurrenciasMes.map(item => ({
      tipo: 'MP' as const,
      folio: item.folio,
      equipo: item.equipo,
      fechaProgramada: item.fechaStr,
      protocolo: item.equipo.tareas.split('\n').filter(t => t.trim().length > 0),
      tecnico: item.equipo.tecnico || 'Técnico Asignado'
    }));
    onPrintBatch(batch);
  };

  const handlePrintSingle = (item: typeof ocurrenciasMes[0]) => {
    if (!onPrintOrder) return;
    onPrintOrder({
      tipo: 'MP',
      folio: item.folio,
      equipo: item.equipo,
      fechaProgramada: item.fechaStr,
      protocolo: item.equipo.tareas.split('\n').filter(t => t.trim().length > 0),
      tecnico: item.equipo.tecnico || 'Técnico Asignado'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-blue-600" />
            Gestión de Mantenimientos Preventivos (MP)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Generación de protocolos de tareas, hojas de trabajo imprimibles y cierre con trazabilidad.
          </p>
        </div>

        {/* Subtabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('emision')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === 'emision'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Emisión de Órdenes ({ocurrenciasMes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('cierre')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === 'cierre'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cierre de Preventivos ({pendientesCierreList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('historial')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === 'historial'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Historial de Ejecución
          </button>
        </div>
      </div>

      {/* SUBTAB 1: Emisión & Programación */}
      {activeSubTab === 'emision' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-600">Mes de Emisión:</span>
              <select
                value={selectedMes}
                onChange={(e) => setSelectedMes(Number(e.target.value))}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none"
              >
                {MESES_L.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {idx + 1} - {m} {selectedAnio}
                  </option>
                ))}
              </select>
              <select
                value={selectedAnio}
                onChange={(e) => setSelectedAnio(Number(e.target.value))}
                className="text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 rounded-lg py-1.5 px-2.5 focus:outline-none"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500 font-medium">
                ({ocurrenciasMes.length} órdenes generadas)
              </span>
            </div>

            {canPrint && ocurrenciasMes.length > 0 && (
              <button
                onClick={handlePrintAllMonth}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs self-start sm:self-auto"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Todas las MP de {MESES_L[selectedMes - 1]} {selectedAnio}</span>
              </button>
            )}
          </div>

          {/* List of Orders for Selected Month */}
          {ocurrenciasMes.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500 text-sm">
              No hay mantenimientos preventivos programados para {MESES_L[selectedMes - 1]} {selectedAnio} en esta planta.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ocurrenciasMes.map((item) => {
                const tasks = item.equipo.tareas.split('\n').filter(t => t.trim().length > 0);
                return (
                  <div
                    key={item.folio}
                    className={`bg-white rounded-xl border p-5 space-y-3 transition-all ${
                      item.isCerrada
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-blue-600">
                            {item.folio}
                          </span>
                          {item.isCerrada ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Cerrada ({item.historialReg?.fecha_real})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Programada: {item.fechaStr}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">
                          {item.equipo.nombre}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {item.equipo.sistema} · Frecuencia: <span className="font-medium text-slate-700">{item.equipo.frecuencia}</span>
                        </p>
                      </div>

                      {canPrint && (
                        <button
                          onClick={() => handlePrintSingle(item)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md flex items-center gap-1 transition-colors"
                          title="Imprimir protocolo"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Imprimir</span>
                        </button>
                      )}
                    </div>

                    {/* Protocol Steps Box */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <p className="font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                        Protocolo de Tareas ({tasks.length} pasos):
                      </p>
                      <ul className="space-y-1 text-slate-700 text-[11px]">
                        {tasks.map((task, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-1.5">
                            <span className="text-slate-400 font-mono text-[10px] select-none shrink-0">•</span>
                            <span className="line-clamp-2">{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Técnico sugerido: <strong className="text-slate-700">{item.equipo.tecnico || 'Por asignar'}</strong></span>
                      <span className="font-mono text-[10px]">ID: {item.equipo.codigo_eq}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: Cierre de Preventivos */}
      {activeSubTab === 'cierre' && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Registro y Cierre de Orden Preventiva
              </h2>
              <p className="text-xs text-slate-500">
                Ingrese la fecha real de ejecución y observaciones para alimentar la auditoría del Plan Maestro.
              </p>
            </div>

            {pendientesCierreList.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-emerald-900">¡Al día con el Plan!</h3>
                <p className="text-xs text-emerald-700 mt-1">
                  No existen órdenes preventivas vencidas o pendientes de cierre en el período actual.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCierreSubmit} className="space-y-4">
                {/* Select Order */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seleccione Orden Preventiva Pendiente *
                  </label>
                  <select
                    value={selectedOrderToClose}
                    onChange={(e) => {
                      const fol = e.target.value;
                      setSelectedOrderToClose(fol);
                      const found = pendientesCierreList.find(p => p.folio === fol);
                      if (found?.equipo.tecnico) {
                        setCierreTecnico(found.equipo.tecnico);
                      }
                      setCheckedTasks({});
                    }}
                    required
                    className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Seleccionar de la lista ({pendientesCierreList.length} pendientes) --</option>
                    {pendientesCierreList.map(item => (
                      <option key={item.folio} value={item.folio}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPendingItem && (
                  <>
                    {/* Protocol Checklist Verification */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                      <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        Verificación de Tareas del Protocolo
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Marque los pasos que fueron completados satisfactoriamente durante la mantención:
                      </p>
                      <div className="space-y-2 mt-2 pt-2 border-t border-slate-200">
                        {selectedPendingItem.equipo.tareas.split('\n').filter(t => t.trim().length > 0).map((t, idx) => (
                          <label key={idx} className="flex items-start gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!checkedTasks[idx]}
                              onChange={(e) => setCheckedTasks(prev => ({ ...prev, [idx]: e.target.checked }))}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className={`text-xs ${checkedTasks[idx] ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                              {t}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Fecha Real de Ejecución *
                        </label>
                        <input
                          type="date"
                          value={cierreFechaReal}
                          onChange={(e) => setCierreFechaReal(e.target.value)}
                          required
                          className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Técnico Ejecutor *
                        </label>
                        <select
                          value={cierreTecnico}
                          onChange={(e) => setCierreTecnico(e.target.value)}
                          required
                          className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Seleccionar Técnico --</option>
                          {tecnicos.filter(t => t.estado === 'Activo').map(tec => (
                            <option key={tec.codigo_tec} value={tec.nombre}>
                              {tec.nombre} ({tec.especialidad})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Duración de la Intervención (Horas)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={cierreHoras}
                        onChange={(e) => setCierreHoras(Number(e.target.value))}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <RepuestosConsumoSelector
                      clienteNombre={selectedPendingItem.equipo.cliente}
                      equipoCodigo={selectedPendingItem.equipo.codigo_eq}
                      selectedItems={stockConsumido}
                      onChangeItems={setStockConsumido}
                      manualText={cierreRepuestos}
                      onChangeManualText={setCierreRepuestos}
                      manualLabel="Repuestos / Insumos No Registrados o Adicionales (Texto Libre)"
                      manualPlaceholder="Ej. Filtro aceite externo, grasa SKF, empaquetadura artesanal..."
                    />

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Hallazgos, Parámetros Medidos & Observaciones
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Detalle parámetros relevantes: presiones, amperaje, temperatura, estado de correas, recomendaciones..."
                        value={cierreComentarios}
                        onChange={(e) => setCierreComentarios(e.target.value)}
                        className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="pt-2">
                      {canClose ? (
                        <button
                          type="submit"
                          className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          Registrar Cierre y Sincronizar con Plan Maestro
                        </button>
                      ) : (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium text-center">
                          Su perfil no tiene permiso para cerrar órdenes preventivas (`cerrar_ordenes`).
                        </div>
                      )}
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Historial */}
      {activeSubTab === 'historial' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar en historial por equipo o folio..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Folio OT</th>
                  <th className="py-2.5 px-3">Equipo</th>
                  <th className="py-2.5 px-3 text-center">Mes</th>
                  <th className="py-2.5 px-3 text-center">Fecha Real</th>
                  <th className="py-2.5 px-3">Técnico Ejecutor</th>
                  <th className="py-2.5 px-3">Comentarios / Hallazgos</th>
                  <th className="py-2.5 px-3">Repuestos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historial
                  .filter(h => {
                    const eqMatch = equipos.find(e => e.codigo_eq === h.codigo_eq);
                    if (selectedCliente !== 'Todos' && eqMatch?.cliente.trim() !== selectedCliente.trim()) {
                      return false;
                    }
                    if (!searchHistory) return true;
                    return h.id_ot.toLowerCase().includes(searchHistory.toLowerCase()) ||
                      h.codigo_eq.toLowerCase().includes(searchHistory.toLowerCase()) ||
                      h.comentarios.toLowerCase().includes(searchHistory.toLowerCase());
                  })
                  .map(row => {
                    const eqObj = equipos.find(e => e.codigo_eq === row.codigo_eq);
                    return (
                      <tr key={row.id || row.id_ot} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                          {row.id_ot}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {eqObj?.nombre || row.codigo_eq}
                          <span className="block text-[10px] text-slate-400 font-normal">{row.codigo_eq}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {MESES_L[row.mes_n - 1] || row.mes_n}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-emerald-700">
                          {row.fecha_real}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {row.tecnico}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={row.comentarios}>
                          {row.comentarios}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {row.repuestos_utilizados || '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
