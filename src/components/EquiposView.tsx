/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  FileText,
  AlertCircle,
  Wrench,
  CalendarPlus,
  Info,
  Layers,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';
import { hasActionAccess } from '../utils/rbac';
import { Equipo } from '../types';
import { CatalogoListadoModal } from './CatalogoListadoModal';

export const EquiposView: React.FC = () => {
  const {
    selectedCliente,
    clientes,
    equipos,
    sistemas,
    frecuencias,
    tecnicos,
    addEquipo,
    updateEquipo,
    deleteEquipo,
    confirmAction,
    addToast
  } = useMaintenance();
  const { userProfile, isSuperAdmin } = useAuth();
  const canEdit = hasActionAccess(userProfile, 'crear_editar');
  const canDelete = hasActionAccess(userProfile, 'eliminar');
  const canPrint = hasActionAccess(userProfile, 'imprimir_pdf');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSistema, setSelectedSistema] = useState('Todos');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingEquipoId, setEditingEquipoId] = useState<string | null>(null);
  const [showListadoModal, setShowListadoModal] = useState(false);

  // Form states
  const [formId, setFormId] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formCliente, setFormCliente] = useState(selectedCliente === 'Todos' ? (clientes[0]?.nombre || '') : selectedCliente);
  const [formSistema, setFormSistema] = useState(sistemas[0]?.nombre || '');
  const [formMarca, setFormMarca] = useState('');
  const [formModelo, setFormModelo] = useState('');
  const [formFrecuencia, setFormFrecuencia] = useState(frecuencias[0]?.nombre_freq || 'Mensual');
  const [formFechaProxima, setFormFechaProxima] = useState(new Date().toISOString().slice(0, 10));
  const [formTecnico, setFormTecnico] = useState('');
  const [formCriticidad, setFormCriticidad] = useState<'Alta' | 'Media' | 'Baja'>('Alta');
  const [formTareas, setFormTareas] = useState('');

  // Equipos del cliente actual
  const equiposClienteActual = equipos.filter(eq =>
    formCliente === 'Todos' ? true : eq.cliente.trim() === formCliente.trim()
  );

  // Equipos únicos de esta planta para el selector de apoyo
  const equiposUnicosPlanta = Array.from(
    new Map(equiposClienteActual.map(e => [e.codigo_eq.toUpperCase(), e])).values()
  );

  // Registros que ya tienen este mismo código de equipo en esta planta
  const existingMatches = equipos.filter(
    e => e.cliente.trim() === formCliente.trim() &&
         e.codigo_eq.toUpperCase() === formId.trim().toUpperCase()
  );
  const existingFreqs = existingMatches.map(e => e.frecuencia);
  const isSelectedFreqDuplicate = existingFreqs.some(
    f => f.trim().toLowerCase() === formFrecuencia.trim().toLowerCase()
  );

  // Filter equipment for table view
  const equiposFiltrados = equipos.filter(eq => {
    const matchesClient = selectedCliente === 'Todos' || eq.cliente.trim() === selectedCliente.trim();
    const matchesSistema = selectedSistema === 'Todos' || eq.sistema.trim() === selectedSistema.trim();
    const matchesSearch = eq.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.codigo_eq.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.frecuencia.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClient && matchesSistema && matchesSearch;
  });

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingEquipoId(null);
    setFormId(`EQ-${String(equipos.length + 1).padStart(2, '0')}`);
    setFormNombre('');
    const targetCliente = selectedCliente === 'Todos' ? (clientes[0]?.nombre || '') : selectedCliente;
    setFormCliente(targetCliente);
    setFormSistema(sistemas[0]?.nombre || '');
    setFormMarca('');
    setFormModelo('');
    setFormFrecuencia(frecuencias[0]?.nombre_freq || 'Mensual');
    setFormFechaProxima(new Date().toISOString().slice(0, 10));
    setFormTecnico(tecnicos[0]?.nombre || '');
    setFormCriticidad('Alta');
    setFormTareas(`1. Inspección visual y limpieza externa
2. Medición de temperatura y vibraciones
3. Verificación de conexiones y apriete
4. Lubricación de rodamientos
5. Pruebas operativas con carga`);
  };

  // Apertura rápida para agregar una frecuencia complementaria a un equipo ya existente
  const handleOpenAddFrequency = (eq: Equipo) => {
    setModalMode('create');
    setEditingEquipoId(null);
    setFormId(eq.codigo_eq);
    setFormNombre(eq.nombre);
    setFormCliente(eq.cliente);
    setFormSistema(eq.sistema);
    setFormMarca(eq.marca);
    setFormModelo(eq.modelo);
    setFormTecnico(eq.tecnico);
    setFormCriticidad(eq.criticidad || 'Media');
    setFormFechaProxima(new Date().toISOString().slice(0, 10));

    // Determinar qué frecuencias ya están registradas para este equipo
    const yaRegistradas = equipos
      .filter(e => e.cliente.trim() === eq.cliente.trim() && e.codigo_eq.toUpperCase() === eq.codigo_eq.toUpperCase())
      .map(e => e.frecuencia.trim().toLowerCase());

    const freqDisponible = frecuencias.find(f => !yaRegistradas.includes(f.nombre_freq.trim().toLowerCase()))?.nombre_freq || 'Anual';
    setFormFrecuencia(freqDisponible);

    // Plantilla de tareas orientada a frecuencia mayor o menor
    if (freqDisponible.toLowerCase().includes('anual') || freqDisponible.toLowerCase().includes('semestral')) {
      setFormTareas(`1. Parada programada y bloqueo LOTO de fuentes de energía
2. Desmontaje, inspección interna y limpieza profunda de componentes
3. Cambio preventivo de rodamientos, sellos mecánicos y retenes
4. Calibración de sensores, reapriete dinamométrico y megado de motor
5. Alineación láser de ejes y análisis espectral de vibraciones
6. Puesta en marcha en vacío y pruebas con carga nominal`);
    } else if (freqDisponible.toLowerCase().includes('diaria') || freqDisponible.toLowerCase().includes('semanal')) {
      setFormTareas(`1. Verificación visual del estado operativo y limpieza
2. Control de ruidos anómalos y niveles de lubricante
3. Inspección de fugas de fluidos y temperatura superficial
4. Registro de parámetros de presión y amperaje en panel`);
    } else {
      setFormTareas(`1. Revisión de parámetros mecánicos y eléctricos
2. Comprobación y limpieza de filtros y tomas de aire
3. Engrase de rodamientos según tabla de lubricación
4. Verificación de fijaciones mecánicas y protecciones`);
    }
  };

  const handleSelectExistingForFrequency = (eq: Equipo) => {
    setFormId(eq.codigo_eq);
    setFormNombre(eq.nombre);
    setFormSistema(eq.sistema);
    setFormMarca(eq.marca);
    setFormModelo(eq.modelo);
    setFormTecnico(eq.tecnico);
    setFormCriticidad(eq.criticidad || 'Media');

    const yaRegistradas = equipos
      .filter(e => e.cliente.trim() === formCliente.trim() && e.codigo_eq.toUpperCase() === eq.codigo_eq.toUpperCase())
      .map(e => e.frecuencia.trim().toLowerCase());

    const freqDisponible = frecuencias.find(f => !yaRegistradas.includes(f.nombre_freq.trim().toLowerCase()))?.nombre_freq || 'Anual';
    setFormFrecuencia(freqDisponible);
  };

  const handleCodeChange = (newCode: string) => {
    setFormId(newCode);
    const upper = newCode.trim().toUpperCase();
    const match = equipos.find(
      e => e.cliente.trim() === formCliente.trim() && e.codigo_eq.toUpperCase() === upper
    );
    if (match && (!formNombre || formNombre.startsWith('Equipo '))) {
      setFormNombre(match.nombre);
      setFormSistema(match.sistema);
      setFormMarca(match.marca);
      setFormModelo(match.modelo);
      setFormTecnico(match.tecnico);
      setFormCriticidad(match.criticidad || 'Media');
    }
  };

  const handleOpenEdit = (eq: Equipo) => {
    setModalMode('edit');
    const key = eq.id || `${eq.codigo_eq}___${eq.frecuencia}`;
    setEditingEquipoId(key);
    setFormId(eq.codigo_eq);
    setFormNombre(eq.nombre);
    setFormCliente(eq.cliente);
    setFormSistema(eq.sistema);
    setFormMarca(eq.marca);
    setFormModelo(eq.modelo);
    setFormFrecuencia(eq.frecuencia);
    setFormFechaProxima(eq.fecha_proxima);
    setFormTecnico(eq.tecnico);
    setFormCriticidad(eq.criticidad || 'Media');
    setFormTareas(eq.tareas);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      addToast('El nombre del equipo es obligatorio.', 'warning');
      return;
    }

    const equipoData: Equipo = {
      codigo_eq: formId.trim().toUpperCase(),
      cliente: formCliente,
      nombre: formNombre.trim(),
      sistema: formSistema,
      marca: formMarca.trim(),
      modelo: formModelo.trim(),
      frecuencia: formFrecuencia,
      tareas: formTareas.trim(),
      tecnico: formTecnico,
      fecha_proxima: formFechaProxima,
      criticidad: formCriticidad
    };

    if (modalMode === 'create') {
      const yaExisteMismaFrecuencia = equipos.some(
        e => e.cliente.trim() === equipoData.cliente.trim() &&
             e.codigo_eq.toUpperCase() === equipoData.codigo_eq &&
             e.frecuencia.trim().toLowerCase() === equipoData.frecuencia.trim().toLowerCase()
      );

      if (yaExisteMismaFrecuencia) {
        addToast(`El equipo "${equipoData.codigo_eq}" ya cuenta con un registro para la frecuencia "${equipoData.frecuencia}" en esta planta. Seleccione una frecuencia complementaria.`, 'warning');
        return;
      }

      addEquipo(equipoData);
    } else if (modalMode === 'edit' && editingEquipoId) {
      const colision = equipos.some(
        e => (e.id || `${e.codigo_eq}___${e.frecuencia}`) !== editingEquipoId &&
             e.cliente.trim() === equipoData.cliente.trim() &&
             e.codigo_eq.toUpperCase() === equipoData.codigo_eq &&
             e.frecuencia.trim().toLowerCase() === equipoData.frecuencia.trim().toLowerCase()
      );

      if (colision) {
        addToast(`Ya existe otro registro para "${equipoData.codigo_eq}" con frecuencia "${equipoData.frecuencia}".`, 'warning');
        return;
      }

      updateEquipo(editingEquipoId, equipoData);
    }

    setModalMode(null);
  };

  const handleDelete = async (eq: Equipo) => {
    const confirmed = await confirmAction({
      title: 'Eliminar Plan de Equipo',
      message: `¿Está seguro de eliminar el plan de mantenimiento ${eq.frecuencia} del equipo "${eq.nombre}" (${eq.codigo_eq})?`,
      confirmText: 'Sí, Eliminar',
      tone: 'danger'
    });
    if (confirmed) {
      deleteEquipo(eq.id || eq.codigo_eq, eq.frecuencia);
    }
  };

  return (
    <div className="space-y-6">
      <div className={showListadoModal ? 'space-y-6 no-print' : 'space-y-6'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-600" />
            Parque de Equipos & Maquinaria Industrial
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registro técnico de activos protegidos, gestión de múltiples frecuencias por equipo e historial de intervenciones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canPrint && (
            <button
              onClick={() => setShowListadoModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Emitir Listado</span>
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Equipo / Frecuencia</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, nombre, marca o frecuencia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
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
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Mostrando {equiposFiltrados.length} planes registrados
        </span>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Código (ID)</th>
                <th className="py-3 px-4">Equipo & Planta</th>
                <th className="py-3 px-4">Sistema</th>
                <th className="py-3 px-4">Marca / Modelo</th>
                <th className="py-3 px-4 text-center">Frecuencia</th>
                <th className="py-3 px-4 text-center">Criticidad</th>
                <th className="py-3 px-4">Técnico Habitual</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equiposFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No se encontraron equipos registrados para los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                equiposFiltrados.map(eq => {
                  const keyRow = eq.id || `${eq.codigo_eq}___${eq.frecuencia}`;
                  const planesMismoCodigo = equipos.filter(
                    e => e.cliente.trim() === eq.cliente.trim() && e.codigo_eq.toUpperCase() === eq.codigo_eq.toUpperCase()
                  );
                  const esMultiFrecuencia = planesMismoCodigo.length > 1;

                  return (
                    <tr key={keyRow} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{eq.codigo_eq}</span>
                          {esMultiFrecuencia && (
                            <span
                              className="font-sans text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 cursor-help"
                              title={`Equipo con ${planesMismoCodigo.length} frecuencias de mantenimiento registradas: ${planesMismoCodigo.map(p => p.frecuencia).join(', ')}`}
                            >
                              {planesMismoCodigo.length} planes
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {eq.nombre}
                        <span className="block text-[10px] text-slate-400 font-normal">{eq.cliente}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {eq.sistema}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {eq.marca} · {eq.modelo}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
                          {eq.frecuencia}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          eq.criticidad === 'Alta'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : eq.criticidad === 'Media'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-50 text-slate-700'
                        }`}>
                          {eq.criticidad || 'Media'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {eq.tecnico || 'Sin asignar'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenAddFrequency(eq)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title={`Agregar otra frecuencia de mantenimiento a ${eq.codigo_eq}`}
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(eq)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Modificar este registro"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(eq)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title={`Eliminar plan ${eq.frecuencia} de ${eq.codigo_eq}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Alta / Modificar */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {modalMode === 'create'
                    ? (existingMatches.length > 0
                        ? `Registrar Nueva Frecuencia para ${formId}`
                        : 'Registrar Equipo / Plan de Mantenimiento')
                    : `Modificar Plan ${formFrecuencia} (${formId})`}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Los equipos pueden tener múltiples frecuencias complementarias (ej. Mensual y Anual).
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Selector de apoyo para cargar un equipo ya registrado */}
            {modalMode === 'create' && equiposUnicosPlanta.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <label className="block font-bold text-slate-700 text-[11px]">
                  ¿Desea agregar otra frecuencia a un equipo ya registrado? (Opcional):
                </label>
                <select
                  onChange={(e) => {
                    const match = equipos.find(
                      eq => eq.cliente.trim() === formCliente.trim() && eq.codigo_eq === e.target.value
                    );
                    if (match) handleSelectExistingForFrequency(match);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="">-- Seleccionar de equipos existentes en esta planta --</option>
                  {equiposUnicosPlanta.map(eq => {
                    const freqs = equipos
                      .filter(x => x.codigo_eq === eq.codigo_eq && x.cliente === eq.cliente)
                      .map(x => x.frecuencia)
                      .join(', ');
                    return (
                      <option key={eq.codigo_eq} value={eq.codigo_eq}>
                        {eq.codigo_eq} · {eq.nombre} [Frecuencias actuales: {freqs}]
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Banner informativo si se detecta que el equipo ya existe con otras frecuencias */}
            {modalMode === 'create' && existingMatches.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-1">
                  <p className="text-blue-950 font-bold">
                    Equipo existente detectado: {existingMatches[0].nombre} ({existingMatches[0].marca} {existingMatches[0].modelo})
                  </p>
                  <p className="text-blue-800">
                    Frecuencias ya registradas:{' '}
                    {existingFreqs.map(f => (
                      <span key={f} className="inline-block bg-white text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-200 mr-1 text-[10px]">
                        {f}
                      </span>
                    ))}
                  </p>
                  <p className="text-blue-600 text-[10.5px]">
                    Puede registrar esta nueva frecuencia seleccionando una periodicidad complementaria (ej. Semestral o Anual).
                  </p>
                </div>
              </div>
            )}

            {/* Aviso si la frecuencia seleccionada ya está registrada para este equipo */}
            {modalMode === 'create' && isSelectedFreqDuplicate && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-[11px]">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  La frecuencia <strong>"{formFrecuencia}"</strong> ya está registrada para el equipo {formId}. Elija una frecuencia complementaria diferente.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Código de Equipo (ID) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="Ej. CH-01"
                    value={formId}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="w-full font-mono font-semibold uppercase text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Planta / Cliente *
                  </label>
                  <select
                    value={formCliente}
                    onChange={(e) => setFormCliente(e.target.value)}
                    disabled={!isSuperAdmin}
                    required
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    {clientes.map(c => (
                      <option key={c.codigo} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre del Equipo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Chiller Centrífugo Trane 350 TR"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Sistema *
                  </label>
                  <select
                    value={formSistema}
                    onChange={(e) => setFormSistema(e.target.value)}
                    required
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {sistemas.map(s => (
                      <option key={s.codigo_sis} value={s.nombre}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Frecuencia de Mantenimiento *
                  </label>
                  <select
                    value={formFrecuencia}
                    onChange={(e) => setFormFrecuencia(e.target.value)}
                    required
                    className={`w-full font-medium text-slate-900 bg-white border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isSelectedFreqDuplicate && modalMode === 'create'
                        ? 'border-amber-400 bg-amber-50/50'
                        : 'border-slate-300'
                    }`}
                  >
                    {frecuencias.map(f => {
                      const yaTomada = existingFreqs.some(
                        ef => ef.trim().toLowerCase() === f.nombre_freq.trim().toLowerCase()
                      );
                      return (
                        <option
                          key={f.nombre_freq}
                          value={f.nombre_freq}
                          className={yaTomada && modalMode === 'create' ? 'text-amber-700 font-semibold' : ''}
                        >
                          {f.nombre_freq} {yaTomada && modalMode === 'create' ? '(Ya asignada a este equipo)' : `(±${f.dias_tolerancia}d tol.)`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Trane, Atlas Copco"
                    value={formMarca}
                    onChange={(e) => setFormMarca(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. CVHE-350"
                    value={formModelo}
                    onChange={(e) => setFormModelo(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Criticidad Operacional
                  </label>
                  <select
                    value={formCriticidad}
                    onChange={(e) => setFormCriticidad(e.target.value as any)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Alta">Alta (Crítico para producción)</option>
                    <option value="Media">Media (Impacto moderado)</option>
                    <option value="Baja">Baja (Standby / Auxiliar)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Técnico Responsable Habitual
                  </label>
                  <select
                    value={formTecnico}
                    onChange={(e) => setFormTecnico(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Sin asignar --</option>
                    {tecnicos.filter(t => t.estado === 'Activo').map(t => (
                      <option key={t.codigo_tec} value={t.nombre}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fecha Primer Mantenimiento Programado *
                </label>
                <input
                  type="date"
                  required
                  value={formFechaProxima}
                  onChange={(e) => setFormFechaProxima(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Protocolo de Tareas Específicas para esta Frecuencia ({formFrecuencia}) *
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Escriba las tareas específicas a ejecutar en este plan preventivo..."
                  value={formTareas}
                  onChange={(e) => setFormTareas(e.target.value)}
                  className="w-full font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalMode === 'create' && isSelectedFreqDuplicate}
                  className="px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
                >
                  {modalMode === 'create'
                    ? (existingMatches.length > 0 ? 'Registrar Frecuencia Complementaria' : 'Guardar Equipo')
                    : 'Actualizar Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {showListadoModal && (
        <CatalogoListadoModal
          mode="equipos"
          selectedCliente={selectedCliente}
          clientes={clientes}
          equipos={equiposFiltrados}
          filtroDescripcion={selectedSistema !== 'Todos' ? `Sistema: ${selectedSistema}` : undefined}
          onClose={() => setShowListadoModal(false)}
        />
      )}
    </div>
  );
};
