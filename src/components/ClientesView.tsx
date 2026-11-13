/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  Phone,
  Mail,
  MapPin,
  Upload,
  Image as ImageIcon,
  X,
  FileText
} from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';
import { hasActionAccess } from '../utils/rbac';
import { Cliente } from '../types';

export const ClientesView: React.FC = () => {
  const {
    clientes,
    equipos,
    addCliente,
    updateCliente,
    deleteCliente,
    confirmAction,
    addToast
  } = useMaintenance();
  const { userProfile, isSuperAdmin, isCompanyAdmin } = useAuth();
  const canEditEmpresa = isSuperAdmin || (isCompanyAdmin && hasActionAccess(userProfile, 'crear_editar'));

  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingCodigo, setEditingCodigo] = useState<string | null>(null);

  // Form states
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [logo, setLogo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredClientes = clientes.filter(c => {
    return c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.rut.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleOpenCreate = () => {
    if (!isSuperAdmin) {
      addToast('Solo el Administrador General puede crear nuevas empresas.', 'warning');
      return;
    }
    setModalMode('create');
    setEditingCodigo(null);
    setCodigo(`CLI-${String(clientes.length + 1).padStart(2, '0')}`);
    setNombre('');
    setRut('');
    setDireccion('');
    setTelefono('');
    setCorreo('');
    setLogo('');
  };

  const handleOpenEdit = (c: Cliente) => {
    if (!canEditEmpresa) return;
    setModalMode('edit');
    setEditingCodigo(c.codigo);
    setCodigo(c.codigo);
    setNombre(c.nombre);
    setRut(c.rut);
    setDireccion(c.direccion);
    setTelefono(c.telefono);
    setCorreo(c.correo);
    setLogo(c.logo || '');
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG, WebP).', 'warning');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      addToast('La imagen no debe superar 4 MB de tamaño.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const rawDataUrl = reader.result;
      if (rawDataUrl.length <= 320000) {
        setLogo(rawDataUrl);
        return;
      }
      // Compress via canvas so it fits comfortably under Firestore limits
      const img = new Image();
      img.onload = () => {
        const maxW = 520;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setLogo(compressed);
        } else {
          setLogo(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogo('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      addToast('El nombre de la empresa/planta es obligatorio.', 'warning');
      return;
    }

    const data: Cliente = {
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      rut: rut.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      correo: correo.trim(),
      logo: logo.trim() || undefined
    };

    if (modalMode === 'create') {
      if (!isSuperAdmin) return;
      if (clientes.some(c => c.codigo === data.codigo)) {
        addToast('Ya existe un cliente con este código.', 'warning');
        return;
      }
      addCliente(data);
    } else if (modalMode === 'edit' && editingCodigo) {
      updateCliente(editingCodigo, data);
    }

    setModalMode(null);
  };

  const handleDelete = async (c: Cliente) => {
    if (!isSuperAdmin) {
      addToast('Solo el Administrador General puede eliminar empresas.', 'warning');
      return;
    }
    const equiposAsociados = equipos.filter(e => e.cliente.trim() === c.nombre.trim()).length;
    const msg = equiposAsociados > 0
      ? `ATENCIÓN: La empresa "${c.nombre}" tiene ${equiposAsociados} equipo(s) e historial asociado. Al eliminarla se borrarán en cascada. ¿Desea continuar?`
      : `¿Está seguro de eliminar la empresa "${c.nombre}"?`;

    const confirmed = await confirmAction({
      title: 'Eliminar Empresa / Planta',
      message: msg,
      confirmText: 'Sí, Eliminar',
      tone: 'danger'
    });

    if (confirmed) {
      deleteCliente(c.codigo, c.nombre);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            {isSuperAdmin ? 'Plantas Industriales & Clientes' : 'Mi Empresa / Planta Industrial'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isSuperAdmin
              ? 'Gestión global de empresas clientes, ubicaciones físicas y logotipos corporativos.'
              : 'Información corporativa y logotipo oficial de su planta asignada.'}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Empresa</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT o código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {filteredClientes.length} Empresa{filteredClientes.length === 1 ? '' : 's'} Visible{filteredClientes.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Grid of Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClientes.map(c => {
          const eqCount = equipos.filter(e => e.cliente.trim() === c.nombre.trim()).length;
          return (
            <div
              key={c.codigo}
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    {c.logo ? (
                      <div className="w-16 h-12 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                        <img
                          src={c.logo}
                          alt={`Logo ${c.nombre}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-mono text-[10.5px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {c.codigo}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1 leading-snug truncate" title={c.nombre}>
                        {c.nombre}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-500">RUT: {c.rut}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {canEditEmpresa && (
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Modificar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Eliminar Empresa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-3 mt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.direccion || 'Dirección no especificada'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.telefono || 'Sin teléfono'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.correo || 'Sin correo'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Equipos protegidos:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{eqCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Alta / Modificar */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>{modalMode === 'create' ? 'Registrar Nueva Planta / Cliente' : `Modificar ${codigo}`}</span>
              </h2>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="CLI-01"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="w-full font-mono font-semibold uppercase text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    RUT / Tax ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="76.452.190-8"
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Razón Social / Nombre de Planta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. TermoIndustrial del Sur S.A."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Logotipo Oficial del Cliente */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">
                    Logotipo Oficial de la Planta / Empresa
                  </label>
                  {logo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Quitar logo
                    </button>
                  )}
                </div>

                {logo ? (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                    <img
                      src={logo}
                      alt="Vista previa logo"
                      className="h-12 max-w-[140px] object-contain rounded border border-slate-100 bg-slate-50 p-1"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-emerald-700 block">✓ Logo cargado</span>
                      <span className="text-[10px] text-slate-500">Se incluirá en membretes de órdenes y planes.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white p-3 rounded-lg text-center cursor-pointer transition-colors"
                  >
                    <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-[11px] font-semibold text-slate-700">
                      Haga clic para cargar imagen de logotipo (PNG, JPG, SVG, WebP)
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Máx. 2.5 MB · Tamaño recomendado: rectangular horizontal
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />

                <p className="text-[10px] text-slate-500 leading-tight">
                  ℹ️ <strong>Trazabilidad Documental:</strong> Este logo aparecerá en el encabezado de todas las órdenes de mantenimiento (MP, MC, OT), certificados de calibración y hojas del Plan Maestro Anual correspondientes a este cliente.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  placeholder="Parque Industrial #120"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="+56 2 2840 9200"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Correo Operaciones
                  </label>
                  <input
                    type="email"
                    placeholder="operaciones@empresa.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  className="px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  {modalMode === 'create' ? 'Guardar Cliente' : 'Actualizar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
