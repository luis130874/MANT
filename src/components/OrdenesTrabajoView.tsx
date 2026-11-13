/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ClipboardList,
  Printer,
  CheckCircle2,
  Clock,
  Search,
  Download,
  Trash2,
  Hammer
} from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';
import { hasActionAccess } from '../utils/rbac';
import { formatFechaDDMMYYYY, parseFecha } from '../utils/maintenanceEngine';
import { OrdenTrabajoOT, Equipo } from '../types';
import { RepuestosConsumoSelector, SelectedRepuestoConsumo } from './RepuestosConsumoSelector';

interface OrdenesTrabajoViewProps {
  onPrintOrder?: (order: {
    tipo: 'OT';
    folio: string;
    equipo: Equipo;
    fechaEmision: string;
    fechaTentativa: string;
    diasTolerancia: number;
    trabajo: string;
    tecnico: string;
  }) => void;
}

export const OrdenesTrabajoView: React.FC<OrdenesTrabajoViewProps> = ({ onPrintOrder }) => {
  const {
    selectedCliente,
    equipos,
    ordenesTrabajo,
    tecnicos,
    crearOrdenTrabajo,
    cerrarOrdenTrabajo,
    deleteOrdenTrabajo,
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
  const [diasTolerancia, setDiasTolerancia] = useState(5);
  const [tecnicoAsignado, setTecnicoAsignado] = useState('');
  const [trabajoSolicitado, setTrabajoSolicitado] = useState('');
  const [prioridad, setPrioridad] = useState<'Urgente' | 'Alta' | 'Media' | 'Baja'>('Media');

  // Form states for Cierre
  const [selectedOTToClose, setSelectedOTToClose] = useState('');
  const [cierreFechaReal, setCierreFechaReal] = useState(new Date().toISOString().slice(0, 10));
  const [cierreTecnico, setCierreTecnico] = useState('');
  const [accionesRealizadas, setAccionesRealizadas] = useState('');
  const [materialesUtilizados, setMaterialesUtilizados] = useState('');
  const [stockConsumido, setStockConsumido] = useState<SelectedRepuestoConsumo[]>([]);

  const equiposCliente = selectedCliente === 'Todos'
    ? equipos
    : equipos.filter(e => e.cliente.trim() === selectedCliente.trim());

  const ordenesCliente = selectedCliente === 'Todos'
    ? ordenesTrabajo
    : ordenesTrabajo.filter(o => o.cliente.trim() === selectedCliente.trim());

  const pendientesList = ordenesCliente.filter(o => o.estado === 'Pendiente');
  const cerradosList = ordenesCliente.filter(o => o.estado.startsWith('Cerrada'));

  const handleEmitirSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trabajoSolicitado.trim()) {
      addToast('Describa el trabajo solicitado.', 'warning');
      return;
    }

    const eqObj = equipos.find(eq => eq.codigo_eq === selectedEquipoCode);
    const clienteName = eqObj?.cliente || (selectedCliente !== 'Todos' ? selectedCliente : 'Planta General');

    const dEmision = parseFecha(fechaEmision) || new Date();
    const dTent = parseFecha(fechaTentativa) || new Date();

    crearOrdenTrabajo({
      codigo_eq: selectedEquipoCode || 'PLANTA-GEN',
      cliente: clienteName,
      fecha_emision: formatFechaDDMMYYYY(dEmision),
      fecha_tentativa: formatFechaDDMMYYYY(dTent),
      dias_tolerancia: diasTolerancia,
      trabajo_solicitado: trabajoSolicitado,
      tecnico: tecnicoAsignado || 'Por asignar',
      prioridad
    });

    setTrabajoSolicitado('');
  };

  const handleCierreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOTToClose) {
      addToast('Seleccione la orden de trabajo a cerrar.', 'warning');
      return;
    }
    if (!accionesRealizadas.trim()) {
      addToast('Describa las acciones realizadas.', 'warning');
      return;
    }

    const dReal = parseFecha(cierreFechaReal) || new Date();
    const targetOT = pendientesList.find(p => p.id_ot === selectedOTToClose);

    const deductedLabels = stockConsumido.length > 0
      ? registrarSalidasStockBatch(
          stockConsumido.map(item => ({ repuesto_id: item.repuestoId, cantidad: item.cantidad })),
          {
            motivo: `Consumo en Orden de Trabajo ${selectedOTToClose}`,
            ot_asociada: selectedOTToClose,
            equipo_asociado: targetOT?.codigo_eq,
            solicitante: cierreTecnico || 'Responsable OT'
          }
        )
      : [];

    const materialesFinal = [...deductedLabels, materialesUtilizados.trim()].filter(Boolean).join(' | ');

    cerrarOrdenTrabajo(selectedOTToClose, {
      fecha_real: formatFechaDDMMYYYY(dReal),
      tecnico: cierreTecnico,
      acciones_realizadas: accionesRealizadas,
      materiales_utilizados: materialesFinal
    });

    setSelectedOTToClose('');
    setAccionesRealizadas('');
    setMaterialesUtilizados('');
    setStockConsumido([]);
    setActiveSubTab('historial');
  };

  const handlePrint = (o: OrdenTrabajoOT) => {
    if (!onPrintOrder) return;
    const eq = equipos.find(e => e.codigo_eq === o.codigo_eq) || {
      codigo_eq: o.codigo_eq,
      cliente: o.cliente,
      nombre: 'Instalaciones Generales de Planta',
      sistema: 'General',
      marca: 'N/A',
      modelo: 'N/A',
      frecuencia: 'N/A',
      tareas: '',
      tecnico: o.tecnico,
      fecha_proxima: ''
    };
    onPrintOrder({
      tipo: 'OT',
      folio: o.id_ot,
      equipo: eq,
      fechaEmision: o.fecha_emision,
      fechaTentativa: o.fecha_tentativa,
      diasTolerancia: o.dias_tolerancia,
      trabajo: o.trabajo_solicitado,
      tecnico: o.tecnico
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Órdenes de Trabajo (OT) - Mejoras & Proyectos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gestión de nuevas instalaciones mecánicas/eléctricas, montajes y modificaciones de infraestructura.
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
            Emitir Orden (OT)
          </button>
          <button
            onClick={() => setActiveSubTab('cierre')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === 'cierre'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cierre de OT ({pendientesList.length})
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

      {/* SUBTAB 1: Emitir OT */}
      {activeSubTab === 'emitir' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Nueva Orden de Trabajo (OT)
            </h2>

            <form onSubmit={handleEmitirSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Equipo o Ubicación de Planta
                </label>
                <select
                  value={selectedEquipoCode}
                  onChange={(e) => setSelectedEquipoCode(e.target.value)}
                  className="w-full font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Toda la Planta / Ubicación General --</option>
                  {Array.from(new Map(equiposCliente.map(e => [e.codigo_eq, e])).values()).map(eq => (
                    <option key={eq.codigo_eq} value={eq.codigo_eq}>
                      {eq.codigo_eq} - {eq.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha de Emisión *
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
                    Compromiso de Entrega *
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
                    Días Tolerancia
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
                    <option value="Urgente">Urgente</option>
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Responsable Técnico
                </label>
                <select
                  value={tecnicoAsignado}
                  onChange={(e) => setTecnicoAsignado(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Por asignar / Cuadrilla de Proyectos --</option>
                  {tecnicos.filter(t => t.estado === 'Activo').map(t => (
                    <option key={t.codigo_tec} value={t.nombre}>
                      {t.nombre} ({t.especialidad})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción del Trabajo Solicitado *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej: Montaje de tuberías de acero, instalación de nuevo tablero de control, acondicionamiento de sala de compresores..."
                  value={trabajoSolicitado}
                  onChange={(e) => setTrabajoSolicitado(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {canEmit ? (
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Emitir Orden de Trabajo (OT)
                </button>
              ) : (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium text-center">
                  Sin permiso para emitir órdenes de trabajo.
                </div>
              )}
            </form>
          </div>

          {/* Pending List and Printable sheets */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Órdenes de Trabajo en Ejecución ({pendientesList.length})
            </h2>

            {pendientesList.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-xs">
                No hay proyectos u órdenes de trabajo pendientes en esta planta.
              </div>
            ) : (
              <div className="space-y-3">
                {pendientesList.map(o => {
                  const eq = equipos.find(e => e.codigo_eq === o.codigo_eq);
                  return (
                    <div
                      key={o.id_ot}
                      className="bg-white rounded-xl border border-blue-200 p-4 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {o.id_ot}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {eq?.nombre || o.codigo_eq}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Emisión: {o.fecha_emision} · Entrega estimada: <strong className="text-slate-800">{o.fecha_tentativa}</strong> (±{o.dias_tolerancia}d tol.)
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {canPrint && (
                            <button
                              onClick={() => handlePrint(o)}
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
                                  title: 'Eliminar Orden de Trabajo',
                                  message: `¿Está seguro de eliminar la orden de trabajo ${o.id_ot}?`,
                                  confirmText: 'Sí, Eliminar',
                                  tone: 'danger'
                                });
                                if (confirmed) {
                                  deleteOrdenTrabajo(o.id_ot);
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
                        {o.trabajo_solicitado}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Responsable: <strong className="text-slate-700">{o.tecnico}</strong></span>
                        <span className="text-[10px] font-mono font-semibold text-blue-600">EN PROGRESO</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Cierre de OT */}
      {activeSubTab === 'cierre' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-slate-200 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Certificación y Cierre de Orden de Trabajo (OT)
            </h2>
            <p className="text-xs text-slate-500">
              Registre la fecha de entrega real y el detalle de materiales para auditar el cumplimiento del compromiso.
            </p>
          </div>

          {pendientesList.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 font-medium">
              No hay órdenes de trabajo pendientes de cierre.
            </div>
          ) : (
            <form onSubmit={handleCierreSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Seleccione Orden de Trabajo a Cerrar *
                </label>
                <select
                  value={selectedOTToClose}
                  onChange={(e) => {
                    const fol = e.target.value;
                    setSelectedOTToClose(fol);
                    const match = pendientesList.find(p => p.id_ot === fol);
                    if (match?.tecnico) setCierreTecnico(match.tecnico);
                  }}
                  required
                  className="w-full font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar Orden --</option>
                  {pendientesList.map(o => (
                    <option key={o.id_ot} value={o.id_ot}>
                      {o.id_ot} | {o.codigo_eq} | Entrega: {o.fecha_tentativa} | {o.trabajo_solicitado.slice(0, 35)}...
                    </option>
                  ))}
                </select>
              </div>

              {selectedOTToClose && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Fecha Real de Finalización *
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
                        Responsable / Supervisor *
                      </label>
                      <select
                        value={cierreTecnico}
                        onChange={(e) => setCierreTecnico(e.target.value)}
                        required
                        className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Seleccionar Responsable --</option>
                        {tecnicos.filter(t => t.estado === 'Activo').map(t => (
                          <option key={t.codigo_tec} value={t.nombre}>
                            {t.nombre} ({t.especialidad})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const selectedOT = pendientesList.find(p => p.id_ot === selectedOTToClose);
                    return (
                      <RepuestosConsumoSelector
                        clienteNombre={selectedOT?.cliente}
                        equipoCodigo={selectedOT?.codigo_eq}
                        selectedItems={stockConsumido}
                        onChangeItems={setStockConsumido}
                        manualText={materialesUtilizados}
                        onChangeManualText={setMaterialesUtilizados}
                        manualLabel="Materiales e Insumos Adicionales o No Registrados (Texto Libre)"
                        manualPlaceholder="Ej. Tubería acero 2 pulgadas, cables siliconados, soportería Unistrut..."
                      />
                    );
                  })()}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Acciones Realizadas y Pruebas Operacionales *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describa el montaje, conexiones, pruebas de presión, calibración y entrega conforme a operaciones..."
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
                      Confirmar Finalización de OT
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium text-center">
                      Su perfil no tiene permiso para cerrar órdenes de trabajo.
                    </div>
                  )}
                </>
              )}
            </form>
          )}
        </div>
      )}

      {/* SUBTAB 3: Historial de OT */}
      {activeSubTab === 'historial' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por folio, ubicación o trabajo..."
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
                  <th className="py-2.5 px-3">Folio OT</th>
                  <th className="py-2.5 px-3">Ubicación / Equipo</th>
                  <th className="py-2.5 px-3">Trabajo Realizado</th>
                  <th className="py-2.5 px-3 text-center">Emisión</th>
                  <th className="py-2.5 px-3 text-center">Entrega Real</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3">Materiales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cerradosList
                  .filter(o => {
                    if (!searchQuery) return true;
                    return o.id_ot.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      o.codigo_eq.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      o.trabajo_solicitado.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      o.acciones_realizadas.toLowerCase().includes(searchQuery.toLowerCase());
                  })
                  .map(row => (
                    <tr key={row.id_ot} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        {row.id_ot}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {row.codigo_eq}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={row.trabajo_solicitado}>
                        {row.trabajo_solicitado}
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
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={row.materiales_utilizados}>
                        {row.materiales_utilizados || '-'}
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
