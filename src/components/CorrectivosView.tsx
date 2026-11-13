/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  Search,
  Download,
  Trash2,
  CheckSquare,
  Wrench
} from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';
import { hasActionAccess } from '../utils/rbac';
import { formatFechaDDMMYYYY, parseFecha } from '../utils/maintenanceEngine';
import { OrdenCorrectivo, Equipo } from '../types';
import { RepuestosConsumoSelector, SelectedRepuestoConsumo } from './RepuestosConsumoSelector';

interface CorrectivosViewProps {
  onPrintOrder?: (order: {
    tipo: 'MC';
    folio: string;
    equipo: Equipo;
    fechaEmision: string;
    fechaTentativa: string;
    diasTolerancia: number;
    falla: string;
    tecnico: string;
  }) => void;
}

export const CorrectivosView: React.FC<CorrectivosViewProps> = ({ onPrintOrder }) => {
  const {
    selectedCliente,
    equipos,
    correctivos,
    tecnicos,
    crearCorrectivo,
    cerrarCorrectivo,
    deleteCorrectivo,
    registrarSalidasStockBatch,
    confirmAction,
    addToast
  } = useMaintenance();
  const { userProfile } = useAuth();
  const canEmit = hasActionAccess(userProfile, 'emitir_ordenes');
  const canClose = hasActionAccess(userProfile, 'cerrar_ordenes');
  const canDelete = hasActionAccess(userProfile, 'eliminar');
  const canPrint = hasActionAccess(userProfile, 'imprimir_pdf');

  const [activeSubTab, setActiveSubTab] = useState<'emitir' | 'cierre' | 'historial'>('emitir');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for Emission
  const [selectedEquipoCode, setSelectedEquipoCode] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [fechaTentativa, setFechaTentativa] = useState(new Date().toISOString().slice(0, 10));
  const [diasTolerancia, setDiasTolerancia] = useState(2);
  const [tecnicoAsignado, setTecnicoAsignado] = useState('');
  const [fallaReportada, setFallaReportada] = useState('');
  const [prioridad, setPrioridad] = useState<'Urgente' | 'Alta' | 'Media' | 'Baja'>('Alta');

  // Form states for Cierre
  const [selectedMCToClose, setSelectedMCToClose] = useState('');
  const [cierreFechaReal, setCierreFechaReal] = useState(new Date().toISOString().slice(0, 10));
  const [cierreTecnico, setCierreTecnico] = useState('');
  const [accionesRealizadas, setAccionesRealizadas] = useState('');
  const [repuestosUtilizados, setRepuestosUtilizados] = useState('');
  const [stockConsumido, setStockConsumido] = useState<SelectedRepuestoConsumo[]>([]);

  const equiposCliente = selectedCliente === 'Todos'
    ? equipos
    : equipos.filter(e => e.cliente.trim() === selectedCliente.trim());

  const correctivosCliente = selectedCliente === 'Todos'
    ? correctivos
    : correctivos.filter(c => c.cliente.trim() === selectedCliente.trim());

  const pendientesList = correctivosCliente.filter(c => c.estado === 'Pendiente');
  const cerradosList = correctivosCliente.filter(c => c.estado.startsWith('Cerrada'));

  const handleEmitirSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipoCode) {
      addToast('Seleccione el equipo averiado.', 'warning');
      return;
    }
    if (!fallaReportada.trim()) {
      addToast('Describa la falla reportada.', 'warning');
      return;
    }

    const eqObj = equipos.find(eq => eq.codigo_eq === selectedEquipoCode);
    const clienteName = eqObj?.cliente || (selectedCliente !== 'Todos' ? selectedCliente : 'Planta General');

    const dEmision = parseFecha(fechaEmision) || new Date();
    const dTent = parseFecha(fechaTentativa) || new Date();

    crearCorrectivo({
      codigo_eq: selectedEquipoCode,
      cliente: clienteName,
      fecha_emision: formatFechaDDMMYYYY(dEmision),
      fecha_tentativa: formatFechaDDMMYYYY(dTent),
      dias_tolerancia: diasTolerancia,
      falla_reportada: fallaReportada,
      tecnico: tecnicoAsignado || 'Por asignar',
      prioridad
    });

    setFallaReportada('');
  };

  const handleCierreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMCToClose) {
      addToast('Seleccione la orden correctiva a cerrar.', 'warning');
      return;
    }
    if (!accionesRealizadas.trim()) {
      addToast('Describa las acciones realizadas.', 'warning');
      return;
    }

    const dReal = parseFecha(cierreFechaReal) || new Date();
    const targetMC = pendientesList.find(p => p.id_ot === selectedMCToClose);

    const deductedLabels = stockConsumido.length > 0
      ? registrarSalidasStockBatch(
          stockConsumido.map(item => ({ repuesto_id: item.repuestoId, cantidad: item.cantidad })),
          {
            motivo: `Consumo en Mantenimiento Correctivo ${selectedMCToClose}`,
            ot_asociada: selectedMCToClose,
            equipo_asociado: targetMC?.codigo_eq,
            solicitante: cierreTecnico || 'Técnico Correctivo'
          }
        )
      : [];

    const repuestosFinal = [...deductedLabels, repuestosUtilizados.trim()].filter(Boolean).join(' | ');

    cerrarCorrectivo(selectedMCToClose, {
      fecha_real: formatFechaDDMMYYYY(dReal),
      tecnico: cierreTecnico,
      acciones_realizadas: accionesRealizadas,
      repuestos_utilizados: repuestosFinal
    });

    setSelectedMCToClose('');
    setAccionesRealizadas('');
    setRepuestosUtilizados('');
    setStockConsumido([]);
    setActiveSubTab('historial');
  };

  const handlePrint = (c: OrdenCorrectivo) => {
    if (!onPrintOrder) return;
    const eq = equipos.find(e => e.codigo_eq === c.codigo_eq);
    if (!eq) return;
    onPrintOrder({
      tipo: 'MC',
      folio: c.id_ot,
      equipo: eq,
      fechaEmision: c.fecha_emision,
      fechaTentativa: c.fecha_tentativa,
      diasTolerancia: c.dias_tolerancia,
      falla: c.falla_reportada,
      tecnico: c.tecnico
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            Mantenimiento Correctivo (Averías & Reparaciones)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Emisión de órdenes MC con fecha de compromiso, tolerancia de atraso y cálculo automático de efectividad.
          </p>
        </div>

        {/* Subtabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('emitir')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === 'emitir'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Emitir Avería / Orden MC
          </button>
          <button
            onClick={() => setActiveSubTab('cierre')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === 'cierre'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cierre de Correctivos ({pendientesList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('historial')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === 'historial'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Historial ({cerradosList.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: Emitir Avería */}
      {activeSubTab === 'emitir' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Nueva Falla Reportada (MC)
            </h2>

            <form onSubmit={handleEmitirSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Equipo Afectado *
                </label>
                <select
                  value={selectedEquipoCode}
                  onChange={(e) => setSelectedEquipoCode(e.target.value)}
                  required
                  className="w-full font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar Equipo --</option>
                  {Array.from(new Map(equiposCliente.map(e => [e.codigo_eq, e])).values()).map(eq => (
                    <option key={eq.codigo_eq} value={eq.codigo_eq}>
                      {eq.codigo_eq} - {eq.nombre} ({eq.sistema})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha de Reporte *
                  </label>
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    required
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha Compromiso *
                  </label>
                  <input
                    type="date"
                    value={fechaTentativa}
                    onChange={(e) => setFechaTentativa(e.target.value)}
                    required
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tolerancia (Días)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={diasTolerancia}
                    onChange={(e) => setDiasTolerancia(Number(e.target.value))}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as any)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Urgente">Urgente (Parada de línea)</option>
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Técnico Asignado (Preliminar)
                </label>
                <select
                  value={tecnicoAsignado}
                  onChange={(e) => setTecnicoAsignado(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Por asignar / Cuadrilla de turno --</option>
                  {tecnicos.filter(t => t.estado === 'Activo').map(t => (
                    <option key={t.codigo_tec} value={t.nombre}>
                      {t.nombre} ({t.especialidad})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción de la Falla y Síntomas Observados *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describa síntomas: ruidos, fuga de fluidos, temperatura elevada, código de alarma en panel, etc."
                  value={fallaReportada}
                  onChange={(e) => setFallaReportada(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {canEmit ? (
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-xs"
                >
                  Emitir Orden Correctiva (MC)
                </button>
              ) : (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium text-center">
                  Sin permiso para emitir nuevas órdenes correctivas.
                </div>
              )}
            </form>
          </div>

          {/* Pending List and Printable sheets */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Órdenes Correctivas en Curso ({pendientesList.length})
              </h2>
            </div>

            {pendientesList.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-xs">
                No hay órdenes correctivas pendientes. Todos los equipos se encuentran operativos.
              </div>
            ) : (
              <div className="space-y-3">
                {pendientesList.map(c => {
                  const eq = equipos.find(e => e.codigo_eq === c.codigo_eq);
                  return (
                    <div
                      key={c.id_ot}
                      className="bg-white rounded-xl border border-amber-200 p-4 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {c.id_ot}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {eq?.nombre || c.codigo_eq}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Reportada: {c.fecha_emision} · Compromiso: <strong className="text-slate-800">{c.fecha_tentativa}</strong> (±{c.dias_tolerancia}d tol.)
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {canPrint && (
                            <button
                              onClick={() => handlePrint(c)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md flex items-center gap-1"
                              title="Imprimir Orden"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Imprimir</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={async () => {
                                const confirmed = await confirmAction({
                                  title: 'Eliminar Orden Correctiva',
                                  message: `¿Está seguro de eliminar la orden correctiva ${c.id_ot}?`,
                                  confirmText: 'Sí, Eliminar',
                                  tone: 'danger'
                                });
                                if (confirmed) {
                                  deleteCorrectivo(c.id_ot);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {c.falla_reportada}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Técnico: <strong className="text-slate-700">{c.tecnico}</strong></span>
                        <span className="text-[10px] font-mono font-semibold text-amber-600">EN ATENCIÓN</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Cierre de Correctivos */}
      {activeSubTab === 'cierre' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-slate-200 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Cierre y Certificación de Reparación (MC)
            </h2>
            <p className="text-xs text-slate-500">
              El sistema evalúa automáticamente si la reparación se completó a tiempo según la tolerancia.
            </p>
          </div>

          {pendientesList.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 font-medium">
              No hay órdenes correctivas pendientes de cierre.
            </div>
          ) : (
            <form onSubmit={handleCierreSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Seleccione Orden Correctiva Pendiente *
                </label>
                <select
                  value={selectedMCToClose}
                  onChange={(e) => {
                    const fol = e.target.value;
                    setSelectedMCToClose(fol);
                    const match = pendientesList.find(p => p.id_ot === fol);
                    if (match?.tecnico) setCierreTecnico(match.tecnico);
                  }}
                  required
                  className="w-full font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar Orden --</option>
                  {pendientesList.map(c => (
                    <option key={c.id_ot} value={c.id_ot}>
                      {c.id_ot} | {c.codigo_eq} | Compromiso: {c.fecha_tentativa} | {c.falla_reportada.slice(0, 35)}...
                    </option>
                  ))}
                </select>
              </div>

              {selectedMCToClose && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Fecha Real de Reparación *
                      </label>
                      <input
                        type="date"
                        value={cierreFechaReal}
                        onChange={(e) => setCierreFechaReal(e.target.value)}
                        required
                        className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Técnico / Responsable *
                      </label>
                      <select
                        value={cierreTecnico}
                        onChange={(e) => setCierreTecnico(e.target.value)}
                        required
                        className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Seleccionar Técnico --</option>
                        {tecnicos.filter(t => t.estado === 'Activo').map(t => (
                          <option key={t.codigo_tec} value={t.nombre}>
                            {t.nombre} ({t.especialidad})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const selectedMC = pendientesList.find(p => p.id_ot === selectedMCToClose);
                    return (
                      <RepuestosConsumoSelector
                        clienteNombre={selectedMC?.cliente}
                        equipoCodigo={selectedMC?.codigo_eq}
                        selectedItems={stockConsumido}
                        onChangeItems={setStockConsumido}
                        manualText={repuestosUtilizados}
                        onChangeManualText={setRepuestosUtilizados}
                        manualLabel="Repuestos y Materiales Adicionales o No Registrados (Texto Libre)"
                        manualPlaceholder="Ej. Kit empaquetaduras, rodamiento externo, aceite ISO VG 46..."
                      />
                    );
                  })()}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Acciones Realizadas y Pruebas Operativas de Arranque *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describa el trabajo de desarme, calibración, componentes cambiados y parámetros finales de prueba..."
                      value={accionesRealizadas}
                      onChange={(e) => setAccionesRealizadas(e.target.value)}
                      className="w-full text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {canClose ? (
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      Confirmar Cierre de Avería
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium text-center">
                      Su perfil no tiene permiso para cerrar órdenes correctivas.
                    </div>
                  )}
                </>
              )}
            </form>
          )}
        </div>
      )}

      {/* SUBTAB 3: Historial de Correctivos */}
      {activeSubTab === 'historial' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por folio, equipo o falla..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Folio MC</th>
                  <th className="py-2.5 px-3">Equipo</th>
                  <th className="py-2.5 px-3">Falla Reportada</th>
                  <th className="py-2.5 px-3 text-center">Emisión</th>
                  <th className="py-2.5 px-3 text-center">Fecha Real</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3">Técnico</th>
                  <th className="py-2.5 px-3">Acciones Realizadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cerradosList
                  .filter(c => {
                    if (!searchQuery) return true;
                    return c.id_ot.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.codigo_eq.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.falla_reportada.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.acciones_realizadas.toLowerCase().includes(searchQuery.toLowerCase());
                  })
                  .map(row => (
                    <tr key={row.id_ot} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                        {row.id_ot}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {row.codigo_eq}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={row.falla_reportada}>
                        {row.falla_reportada}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {row.fecha_emision}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-emerald-700">
                        {row.fecha_real}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.estado.includes('A tiempo')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {row.estado}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {row.tecnico}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={row.acciones_realizadas}>
                        {row.acciones_realizadas}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
