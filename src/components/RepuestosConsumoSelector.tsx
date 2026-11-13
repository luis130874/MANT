/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { PackageMinus, Plus, Trash2, AlertTriangle, Boxes } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';

export interface SelectedRepuestoConsumo {
  repuestoId: string;
  cantidad: number;
}

interface RepuestosConsumoSelectorProps {
  clienteNombre?: string;
  equipoCodigo?: string;
  selectedItems: SelectedRepuestoConsumo[];
  onChangeItems: (items: SelectedRepuestoConsumo[]) => void;
  manualText: string;
  onChangeManualText: (val: string) => void;
  manualLabel?: string;
  manualPlaceholder?: string;
}

export const RepuestosConsumoSelector: React.FC<RepuestosConsumoSelectorProps> = ({
  clienteNombre,
  equipoCodigo,
  selectedItems,
  onChangeItems,
  manualText,
  onChangeManualText,
  manualLabel = 'Repuestos / Insumos No Registrados o Adicionales (Texto Libre)',
  manualPlaceholder = 'Ej. Consumibles menores, tornillería no inventariada, sellador, repuesto externo...'
}) => {
  const { repuestos } = useMaintenance();

  const [pickedId, setPickedId] = useState('');
  const [pickedQty, setPickedQty] = useState(1);

  // Filter repuestos available for the client (or 'Todas las Plantas')
  // Sort so items linked to the specific equipment appear first, then in-stock items
  const availableRepuestos = useMemo(() => {
    const filtered = repuestos.filter(r => {
      if (!clienteNombre || clienteNombre === 'Todos') return true;
      return r.cliente.trim() === clienteNombre.trim() || r.cliente === 'Todas las Plantas';
    });

    return [...filtered].sort((a, b) => {
      const aLinked = equipoCodigo && a.equipos_asociados.includes(equipoCodigo) ? 1 : 0;
      const bLinked = equipoCodigo && b.equipos_asociados.includes(equipoCodigo) ? 1 : 0;
      if (aLinked !== bLinked) return bLinked - aLinked;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [repuestos, clienteNombre, equipoCodigo]);

  const handleAddRepuesto = () => {
    if (!pickedId) return;
    const qty = Math.max(1, Number(pickedQty) || 1);

    const existing = selectedItems.find(item => item.repuestoId === pickedId);
    if (existing) {
      onChangeItems(
        selectedItems.map(item =>
          item.repuestoId === pickedId
            ? { ...item, cantidad: item.cantidad + qty }
            : item
        )
      );
    } else {
      onChangeItems([...selectedItems, { repuestoId: pickedId, cantidad: qty }]);
    }

    setPickedId('');
    setPickedQty(1);
  };

  const handleUpdateQty = (repuestoId: string, newQty: number) => {
    const safeQty = Math.max(1, Number(newQty) || 1);
    onChangeItems(
      selectedItems.map(item =>
        item.repuestoId === repuestoId ? { ...item, cantidad: safeQty } : item
      )
    );
  };

  const handleRemove = (repuestoId: string) => {
    onChangeItems(selectedItems.filter(item => item.repuestoId !== repuestoId));
  };

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
            <Boxes className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs">
              Consumo y Baja de Repuestos del Inventario (Stock)
            </h4>
            <p className="text-[10.5px] text-slate-500">
              Seleccione repuestos del almacén para descontar automáticamente al cerrar la orden, o ingrese ítems no registrados abajo.
            </p>
          </div>
        </div>
        {selectedItems.length > 0 && (
          <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] shrink-0">
            {selectedItems.length} por descontar
          </span>
        )}
      </div>

      {/* Selector Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={pickedId}
          onChange={(e) => setPickedId(e.target.value)}
          className="flex-1 font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Seleccionar repuesto registrado en stock --</option>
          {availableRepuestos.map(rep => {
            const isLinked = equipoCodigo && rep.equipos_asociados.includes(equipoCodigo);
            return (
              <option key={rep.id} value={rep.id}>
                {isLinked ? '★ ' : ''}[{rep.codigo_repuesto}] {rep.nombre} — Stock: {rep.stock_actual} {rep.unidad_medida}
                {rep.stock_actual === 0 ? ' (AGOTADO)' : rep.stock_actual <= rep.stock_minimo ? ' (STOCK BAJO)' : ''}
              </option>
            );
          })}
        </select>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
            <span className="text-[10px] font-bold text-slate-500">Cant:</span>
            <input
              type="number"
              min="1"
              value={pickedQty}
              onChange={(e) => setPickedQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-14 font-mono font-bold text-slate-900 text-center focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleAddRepuesto}
            disabled={!pickedId}
            className="flex items-center gap-1 px-3 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dar de baja</span>
          </button>
        </div>
      </div>

      {/* Selected Items Table / List */}
      {selectedItems.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {selectedItems.map(item => {
            const rep = repuestos.find(r => r.id === item.repuestoId);
            if (!rep) return null;
            const nuevoSaldo = Math.max(0, rep.stock_actual - item.cantidad);
            const excedeStock = item.cantidad > rep.stock_actual;
            const quedaBajo = nuevoSaldo <= rep.stock_minimo;

            return (
              <div
                key={item.repuestoId}
                className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border bg-white ${
                  excedeStock ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <PackageMinus className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="font-mono font-bold text-slate-900">{rep.codigo_repuesto}</span>
                    <span className="font-semibold text-slate-800 truncate">{rep.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-slate-500">
                    <span>
                      Stock actual: <strong className="font-mono text-slate-800">{rep.stock_actual}</strong> → Nuevo saldo:{' '}
                      <strong className={`font-mono ${quedaBajo ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {nuevoSaldo} {rep.unidad_medida}
                      </strong>
                    </span>
                    {excedeStock && (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                        <AlertTriangle className="w-3 h-3" /> Supera stock disponible (quedará en 0)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-[10px] font-bold text-slate-500">Cant:</label>
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => handleUpdateQty(item.repuestoId, Number(e.target.value))}
                    className="w-16 font-mono font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(item.repuestoId)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Quitar de la lista de baja"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Free-Text Field Preserved */}
      <div className="pt-2 border-t border-slate-200">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {manualLabel}
        </label>
        <input
          type="text"
          placeholder={manualPlaceholder}
          value={manualText}
          onChange={(e) => onChangeManualText(e.target.value)}
          className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};
