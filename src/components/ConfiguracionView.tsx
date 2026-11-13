/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings2,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Layers,
  Database,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';
import { hasActionAccess } from '../utils/rbac';
import { exportBackupJSON } from '../utils/exportUtils';
import { Sistema, FrecuenciaConfig } from '../types';

export const ConfiguracionView: React.FC = () => {
  const {
    sistemas,
    frecuencias,
    addSistema,
    updateSistema,
    deleteSistema,
    addFrecuencia,
    updateFrecuencia,
    deleteFrecuencia,
    clientes,
    equipos,
    historial,
    correctivos,
    ordenesTrabajo,
    tecnicos,
    resetAllData,
    importBackup,
    confirmAction,
    addToast
  } = useMaintenance();
  const { userProfile, isSuperAdmin } = useAuth();
  const canEdit = hasActionAccess(userProfile, 'crear_editar');
  const canDelete = hasActionAccess(userProfile, 'eliminar');

  const [activeTab, setActiveTab] = useState<'sistemas' | 'frecuencias' | 'backup'>('sistemas');

  // Modal states for Sistemas
  const [modalSis, setModalSis] = useState<'create' | 'edit' | null>(null);
  const [sisCodigo, setSisCodigo] = useState('');
  const [sisNombre, setSisNombre] = useState('');
  const [sisDesc, setSisDesc] = useState('');
  const [editSisId, setEditSisId] = useState<string | null>(null);

  // Modal states for Frecuencias
  const [modalFreq, setModalFreq] = useState<'create' | 'edit' | null>(null);
  const [freqNombre, setFreqNombre] = useState('');
  const [freqTol, setFreqTol] = useState(4);
  const [freqPaso, setFreqPaso] = useState(1);
  const [editFreqName, setEditFreqName] = useState<string | null>(null);

  // Handlers for Sistemas
  const handleOpenSisCreate = () => {
    setModalSis('create');
    setEditSisId(null);
    setSisCodigo(`SIS-${String(sistemas.length + 1).padStart(2, '0')}`);
    setSisNombre('');
    setSisDesc('');
  };

  const handleOpenSisEdit = (s: Sistema) => {
    setModalSis('edit');
    setEditSisId(s.codigo_sis);
    setSisCodigo(s.codigo_sis);
    setSisNombre(s.nombre);
    setSisDesc(s.descripcion);
  };

  const handleSisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sisNombre.trim()) {
      addToast('El nombre del sistema es obligatorio.', 'warning');
      return;
    }
    const data: Sistema = {
      codigo_sis: sisCodigo.trim().toUpperCase(),
      nombre: sisNombre.trim(),
      descripcion: sisDesc.trim()
    };
    if (modalSis === 'create') {
      addSistema(data);
    } else if (modalSis === 'edit' && editSisId) {
      updateSistema(editSisId, data);
    }
    setModalSis(null);
  };

  // Handlers for Frecuencias
  const handleOpenFreqCreate = () => {
    setModalFreq('create');
    setEditFreqName(null);
    setFreqNombre('');
    setFreqTol(4);
    setFreqPaso(1);
  };

  const handleOpenFreqEdit = (f: FrecuenciaConfig) => {
    setModalFreq('edit');
    setEditFreqName(f.nombre_freq);
    setFreqNombre(f.nombre_freq);
    setFreqTol(f.dias_tolerancia);
    setFreqPaso(f.paso_meses);
  };

  const handleFreqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freqNombre.trim()) {
      addToast('El nombre de la frecuencia es obligatorio.', 'warning');
      return;
    }
    const data: FrecuenciaConfig = {
      nombre_freq: freqNombre.trim(),
      dias_tolerancia: freqTol,
      paso_meses: freqPaso
    };
    if (modalFreq === 'create') {
      addFrecuencia(data);
    } else if (modalFreq === 'edit' && editFreqName) {
      updateFrecuencia(editFreqName, data);
    }
    setModalFreq(null);
  };

  // Backup / Export
  const handleDownloadBackup = () => {
    const fullBackup = {
      clientes,
      sistemas,
      frecuencias,
      tecnicos,
      equipos,
      historial,
      correctivos,
      ordenesTrabajo,
      exportDate: new Date().toISOString()
    };
    exportBackupJSON(fullBackup, 'prodexus_cmms_backup');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const confirmed = await confirmAction({
          title: 'Restaurar Copia de Seguridad',
          message: '¿Restaurar los datos de esta copia de seguridad? Se reemplazarán los datos globales en la nube.',
          confirmText: 'Sí, Restaurar',
          tone: 'warning'
        });
        if (confirmed) {
          importBackup(parsed);
        }
      } catch (err) {
        addToast('El archivo no tiene un formato JSON válido.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-blue-600" />
            Configuración & Parámetros del CMMS
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Sistemas funcionales de planta, tolerancias de frecuencias y copias de seguridad de la base de datos.
          </p>
        </div>

        {/* Subtabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('sistemas')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'sistemas'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sistemas ({sistemas.length})
          </button>
          <button
            onClick={() => setActiveTab('frecuencias')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'frecuencias'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Frecuencias & Tolerancias ({frecuencias.length})
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('backup')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'backup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Respaldos & Datos
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Sistemas */}
      {activeTab === 'sistemas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-600">
              Categorías de sistemas de ingeniería (Chillers, Calderas, Neumática, Eléctrico, etc.)
            </span>
            {canEdit && (
              <button
                onClick={handleOpenSisCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Sistema</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sistemas.map(s => (
              <div
                key={s.codigo_sis}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {s.codigo_sis}
                    </span>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => handleOpenSisEdit(s)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={async () => {
                            const confirmed = await confirmAction({
                              title: 'Eliminar Sistema',
                              message: `¿Está seguro de eliminar el sistema "${s.nombre}"?`,
                              confirmText: 'Sí, Eliminar',
                              tone: 'danger'
                            });
                            if (confirmed) {
                              deleteSistema(s.codigo_sis);
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
                  <h3 className="font-bold text-slate-900 text-sm mt-2">{s.nombre}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.descripcion || 'Sin descripción'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Frecuencias */}
      {activeTab === 'frecuencias' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-600">
              Periodicidades y días de tolerancia permitidos antes de catalogar una orden como "Fuera de término"
            </span>
            {canEdit && (
              <button
                onClick={handleOpenFreqCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Frecuencia</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Frecuencia</th>
                  <th className="py-3 px-4 text-center">Tolerancia Permisible (Días ±)</th>
                  <th className="py-3 px-4 text-center">Paso en Meses</th>
                  <th className="py-3 px-4 text-slate-500">Regla de Cálculo</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {frecuencias.map(f => (
                  <tr key={f.nombre_freq} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {f.nombre_freq}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-blue-600">
                      ±{f.dias_tolerancia} días
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {f.paso_meses === 0 ? 'Sub-mensual (días)' : `Cada ${f.paso_meses} mes(es)`}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {f.paso_meses === 0
                        ? 'Ocurrencias repetitivas por día o semana'
                        : `Ocurrencia fija en el mes programado con ventana de ±${f.dias_tolerancia} días`}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenFreqEdit(f)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={async () => {
                              const confirmed = await confirmAction({
                                title: 'Eliminar Frecuencia',
                                message: `¿Está seguro de eliminar la frecuencia "${f.nombre_freq}"?`,
                                confirmText: 'Sí, Eliminar',
                                tone: 'danger'
                              });
                              if (confirmed) {
                                deleteFrecuencia(f.nombre_freq);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Exportar Respaldo Completo (JSON)
                </h3>
                <p className="text-xs text-slate-500">
                  Descarga una copia íntegra con todos los clientes, equipos, historial, órdenes de trabajo y técnicos.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadBackup}
              className="w-full py-2.5 px-4 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs text-xs flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Archivo de Respaldo (.json)</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Importar y Restaurar Respaldo
                </h3>
                <p className="text-xs text-slate-500">
                  Cargue un archivo JSON previamente exportado para recuperar toda la información.
                </p>
              </div>
            </div>

            <label className="block w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-600 cursor-pointer hover:border-blue-500 transition-colors">
              <span className="font-semibold text-blue-600">Haga clic aquí para seleccionar archivo JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="bg-white p-6 rounded-xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Restablecer a Datos de Demostración Industrial
                </h3>
                <p className="text-xs text-slate-500">
                  Restaura los equipos industriales de ejemplo (Chiller Trane, Caldera Cleaver Brooks, Compresor Atlas Copco, etc.).
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                const confirmed = await confirmAction({
                  title: 'Restablecer Valores Iniciales',
                  message: '¿Restablecer toda la base de datos a los valores de demostración iniciales? Se perderán los cambios actuales.',
                  confirmText: 'Sí, Restablecer',
                  tone: 'danger'
                });
                if (confirmed) {
                  resetAllData();
                }
              }}
              className="py-2 px-4 font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors text-xs"
            >
              Restablecer Valores Iniciales
            </button>
          </div>
        </div>
      )}

      {/* Modal Sistema */}
      {modalSis && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {modalSis === 'create' ? 'Nuevo Sistema Industrial' : `Modificar Sistema ${sisCodigo}`}
              </h2>
              <button
                onClick={() => setModalSis(null)}
                className="text-slate-400 hover:text-slate-600 font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSisSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Código de Sistema *
                </label>
                <input
                  type="text"
                  required
                  disabled={modalSis === 'edit'}
                  placeholder="Ej. SIS-HVAC"
                  value={sisCodigo}
                  onChange={(e) => setSisCodigo(e.target.value)}
                  className="w-full font-mono font-semibold uppercase text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre del Sistema *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Climatización Central & Chiller"
                  value={sisNombre}
                  onChange={(e) => setSisNombre(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Alcance técnico del sistema..."
                  value={sisDesc}
                  onChange={(e) => setSisDesc(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalSis(null)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Guardar Sistema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Frecuencia */}
      {modalFreq && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {modalFreq === 'create' ? 'Nueva Frecuencia de Mantenimiento' : `Modificar Frecuencia ${freqNombre}`}
              </h2>
              <button
                onClick={() => setModalFreq(null)}
                className="text-slate-400 hover:text-slate-600 font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFreqSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre de Frecuencia *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cuatrimestral"
                  value={freqNombre}
                  onChange={(e) => setFreqNombre(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Días Tolerancia (±) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={freqTol}
                    onChange={(e) => setFreqTol(Number(e.target.value))}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Paso en Meses (0 = submensual) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={freqPaso}
                    onChange={(e) => setFreqPaso(Number(e.target.value))}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalFreq(null)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Guardar Frecuencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
