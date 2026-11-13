/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Building2, Calendar, LogOut, ShieldCheck } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel, hasActionAccess, hasModuleAccess } from '../utils/rbac';
import { ModuloKey } from '../types';

interface TopBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenNewOrder: () => void;
  onOpenPrintMasterPlan?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onTabChange,
  onOpenNewOrder
}) => {
  const {
    clientes,
    selectedCliente,
    setSelectedCliente,
    selectedAnio,
    setSelectedAnio,
    availableYears
  } = useMaintenance();
  const { userProfile, isSuperAdmin, signOut } = useAuth();

  const navLinks: Array<{ id: ModuloKey; label: string }> = [
    { id: 'dashboard', label: 'Indicadores' },
    { id: 'plan', label: 'Plan Maestro' },
    { id: 'calibracion', label: 'Calibración (CAL)' },
    { id: 'preventivos', label: 'Preventivos (MP)' },
    { id: 'correctivos', label: 'Correctivos (MC)' },
    { id: 'ordenes', label: 'Trabajos (OT)' },
    { id: 'equipos', label: 'Equipos' },
    { id: 'repuestos', label: 'Repuestos' }
  ];

  const visibleLinks = navLinks.filter((l) => hasModuleAccess(userProfile, l.id));
  const canEmitir = hasActionAccess(userProfile, 'emitir_ordenes');

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 no-print">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark with Official Prodexus Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-11 px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-center hover:border-slate-300 transition-colors">
            <img
              src="/assets/aistudio/prodexus_921c729e.jpeg"
              alt="Prodexus Logo"
              className="h-9 w-auto max-w-[170px] object-contain"
            />
          </div>
          <span className="font-mono text-[11px] font-black tracking-wider uppercase px-2 py-1 rounded-md bg-slate-900 text-white shadow-2xs">
            CMMS
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1">
          {visibleLinks.map(link => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onTabChange(link.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-blue-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Year, Facility Selector, Primary Action & User Session */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 text-xs text-blue-800">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(Number(e.target.value))}
              aria-label="Seleccionar año del plan"
              className="bg-transparent border-none text-xs font-extrabold text-blue-900 focus:outline-none cursor-pointer"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  Año {yr}
                </option>
              ))}
            </select>
          </div>

          {isSuperAdmin ? (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedCliente}
                onChange={(e) => setSelectedCliente(e.target.value)}
                aria-label="Seleccionar empresa o planta activa"
                className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[165px] truncate"
              >
                <option value="Todos">Todas las Plantas</option>
                {clientes.map(c => (
                  <option key={c.codigo} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 max-w-[185px]">
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-semibold truncate" title={selectedCliente}>
                {selectedCliente}
              </span>
            </div>
          )}

          {canEmitir && (
            <button
              onClick={onOpenNewOrder}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap shrink-0 active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Nueva Orden</span>
            </button>
          )}

          {/* Active User & Sign Out */}
          {userProfile && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden md:block text-right leading-tight max-w-[150px]">
                <p className="text-[11px] font-bold text-slate-900 truncate">
                  {userProfile.nombre}
                </p>
                <p className="text-[10px] font-semibold text-blue-700 flex items-center justify-end gap-1 truncate">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span>{getRoleLabel(userProfile.role)}</span>
                </p>
              </div>
              <button
                onClick={() => void signOut()}
                title={`Cerrar sesión (${userProfile.email})`}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
