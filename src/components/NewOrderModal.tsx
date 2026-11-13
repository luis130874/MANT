/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, AlertTriangle, FileCheck2, ClipboardList, Plus, Compass } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { formatFechaDDMMYYYY, parseFecha } from '../utils/maintenanceEngine';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose }) => {
  const {
    selectedCliente,
    clientes,
    equipos,
    tecnicos,
    crearCorrectivo,
    crearOrdenTrabajo,
    registrarCierrePreventivo,
    crearOrdenCalibracion,
    addToast
  } = useMaintenance();

  const [tipo, setTipo] = useState<'MC' | 'OT' | 'MP' | 'CAL'>('MC');
  const [equipoCode, setEquipoCode] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaTentativa, setFechaTentativa] = useState(new Date().toISOString().slice(0, 10));
  const [diasTolerancia, setDiasTolerancia] = useState(2);
  const [tecnico, setTecnico] = useState('');

  if (!isOpen) return null;

  const equiposDisponibles = selectedCliente === 'Todos'
    ? equipos
    : equipos.filter(e => e.cliente.trim() === selectedCliente.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      addToast('Por favor ingrese la descripción de la orden.', 'warning');
      return;
    }

    const eqObj = equipos.find(e => e.codigo_eq === equipoCode);
    const clienteName = eqObj?.cliente || (selectedCliente !== 'Todos' ? selectedCliente : clientes[0]?.nombre || 'Planta');
    const hoyStr = formatFechaDDMMYYYY(new Date());
    const tentStr = formatFechaDDMMYYYY(parseFecha(fechaTentativa) || new Date());

    if (tipo === 'MC') {
      crearCorrectivo({
        codigo_eq: equipoCode || (equiposDisponibles[0]?.codigo_eq || 'EQ-01'),
        cliente: clienteName,
        fecha_emision: hoyStr,
        fecha_tentativa: tentStr,
        dias_tolerancia: diasTolerancia,
        falla_reportada: descripcion,
        tecnico: tecnico || 'Por Cuadrilla'
      });
    } else if (tipo === 'OT') {
      crearOrdenTrabajo({
        codigo_eq: equipoCode || 'PLANTA-GEN',
        cliente: clienteName,
        fecha_emision: hoyStr,
        fecha_tentativa: tentStr,
        dias_tolerancia: diasTolerancia,
        trabajo_solicitado: descripcion,
        tecnico: tecnico || 'Por Cuadrilla'
      });
    } else if (tipo === 'MP') {
      const mesActual = new Date().getMonth() + 1;
      const anioActual = new Date().getFullYear();
      const folioGen = `MP-${anioActual}-${String(mesActual).padStart(2, '0')}-MANUAL`;
      registrarCierrePreventivo({
        codigo_eq: equipoCode || (equiposDisponibles[0]?.codigo_eq || 'EQ-01'),
        mes_n: mesActual,
        fecha_real: hoyStr,
        id_ot: folioGen,
        comentarios: descripcion,
        tecnico: tecnico || 'Técnico de Turno',
        duracion_horas: 2.0
      });
    } else if (tipo === 'CAL') {
      crearOrdenCalibracion({
        codigo_eq: equipoCode || (equiposDisponibles[0]?.codigo_eq || 'INST-01'),
        cliente: clienteName,
        instrumento_nombre: eqObj ? `Instrumento de ${eqObj.nombre}` : descripcion,
        variable_medicion: 'Presión / Temperatura',
        rango_operacion: '0 a 100%',
        tolerancia_emp: '± 0.5% FS',
        frecuencia_calibracion: 'Semestral',
        fecha_emision: hoyStr,
        fecha_programada: tentStr,
        fecha_tentativa: tentStr,
        dias_tolerancia: diasTolerancia,
        metrologo_laboratorio: tecnico || 'Metrología Interna',
        observaciones: descripcion
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Nueva Orden de Mantenimiento & Metrología
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-semibold p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Selector */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => { setTipo('MC'); setDiasTolerancia(2); }}
            className={`p-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
              tipo === 'MC'
                ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Correctivo</span>
          </button>

          <button
            type="button"
            onClick={() => { setTipo('CAL'); setDiasTolerancia(7); }}
            className={`p-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
              tipo === 'CAL'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-xs'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Calibración</span>
          </button>

          <button
            type="button"
            onClick={() => { setTipo('OT'); setDiasTolerancia(5); }}
            className={`p-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
              tipo === 'OT'
                ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-xs'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
            <span>Trabajo/OT</span>
          </button>

          <button
            type="button"
            onClick={() => { setTipo('MP'); setDiasTolerancia(0); }}
            className={`p-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center gap-1 transition-all ${
              tipo === 'MP'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Preventivo</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Equipo Asociado *
            </label>
            <select
              value={equipoCode}
              onChange={(e) => setEquipoCode(e.target.value)}
              className="w-full font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- Toda la Planta / Ubicación General --</option>
              {equiposDisponibles.map(e => (
                <option key={e.codigo_eq} value={e.codigo_eq}>
                  {e.codigo_eq} - {e.nombre} ({e.sistema})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fecha Compromiso
              </label>
              <input
                type="date"
                value={fechaTentativa}
                onChange={(e) => setFechaTentativa(e.target.value)}
                required
                className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Técnico Asignado
            </label>
            <select
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
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
              Descripción / Tareas a Realizar *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describa el requerimiento, síntomas observados o trabajo a ejecutar..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              Crear Orden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
