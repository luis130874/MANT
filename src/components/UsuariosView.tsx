/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  KeyRound,
  RefreshCw,
  Users,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMaintenance } from '../context/MaintenanceContext';
import { AccionKey, EmpresaUserSummary, ModuloKey, UserPermisos, UserRole } from '../types';
import {
  ACCIONES_META,
  FULL_PERMISOS,
  getRoleLabel,
  MODULOS_META,
  PERMISO_PRESETS
} from '../utils/rbac';

export const UsuariosView: React.FC = () => {
  const {
    userProfile,
    isSuperAdmin,
    isCompanyAdmin,
    saveUserAccess,
    deleteUserAccess,
    loadCompanyUsersRoster,
    loadAllUsersForSuperAdmin
  } = useAuth();
  const { clientes, addToast, confirmAction } = useMaintenance();

  const [usersList, setUsersList] = useState<EmpresaUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('ALL');

  // Modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingTarget, setEditingTarget] = useState<EmpresaUserSummary | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [fEmail, setFEmail] = useState('');
  const [fNombre, setFNombre] = useState('');
  const [fCargo, setFCargo] = useState('');
  const [fRole, setFRole] = useState<UserRole>('company_user');
  const [fEmpresaCodigo, setFEmpresaCodigo] = useState('');
  const [fActivo, setFActivo] = useState(true);
  const [fPermisos, setFPermisos] = useState<UserPermisos>(PERMISO_PRESETS[1].permisos);

  const fetchUsers = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      if (isSuperAdmin) {
        const codigos = clientes.map((c) => c.codigo);
        const all = await loadAllUsersForSuperAdmin(codigos);
        setUsersList(all);
      } else if (userProfile.empresaCodigo) {
        const roster = await loadCompanyUsersRoster(userProfile.empresaCodigo);
        setUsersList(roster);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      addToast('Error al cargar el directorio de usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  }, [userProfile, isSuperAdmin, clientes, loadAllUsersForSuperAdmin, loadCompanyUsersRoster, addToast]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  if (!isCompanyAdmin) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
        <Lock className="w-8 h-8 text-slate-400 mx-auto" />
        <h2 className="text-sm font-bold text-slate-900">Acceso Restringido</h2>
        <p className="text-xs text-slate-500">
          Solo el Administrador General o el Administrador de Empresa pueden gestionar usuarios y permisos.
        </p>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingTarget(null);
    setFEmail('');
    setFNombre('');
    setFCargo('');
    setFRole('company_user');
    setFEmpresaCodigo(
      isSuperAdmin
        ? clientes[0]?.codigo || ''
        : userProfile?.empresaCodigo || ''
    );
    setFActivo(true);
    setFPermisos(JSON.parse(JSON.stringify(PERMISO_PRESETS[1].permisos)));
  };

  const handleOpenEdit = (u: EmpresaUserSummary) => {
    setModalMode('edit');
    setEditingTarget(u);
    setFEmail(u.email);
    setFNombre(u.nombre);
    setFCargo(u.cargo || '');
    setFRole(u.role);
    setFEmpresaCodigo(u.empresaCodigo || '');
    setFActivo(u.activo);
    setFPermisos(JSON.parse(JSON.stringify(u.permisos || PERMISO_PRESETS[1].permisos)));
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = PERMISO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    if (fRole !== 'super_admin') {
      setFRole(preset.defaultRole);
    }
    setFPermisos(JSON.parse(JSON.stringify(preset.permisos)));
  };

  const handleRoleChange = (newRole: UserRole) => {
    setFRole(newRole);
    if (newRole === 'super_admin' || newRole === 'company_admin') {
      setFPermisos(JSON.parse(JSON.stringify(FULL_PERMISOS)));
    }
  };

  const toggleModulo = (key: ModuloKey) => {
    setFPermisos((prev) => ({
      ...prev,
      modulos: {
        ...prev.modulos,
        [key]: !prev.modulos[key]
      }
    }));
  };

  const toggleAccion = (key: AccionKey) => {
    setFPermisos((prev) => ({
      ...prev,
      acciones: {
        ...prev.acciones,
        [key]: !prev.acciones[key]
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = fEmail.trim().toLowerCase();
    if (!emailClean || !emailClean.includes('@')) {
      addToast('Ingrese un correo electrónico válido (Google Workspace / Gmail).', 'warning');
      return;
    }
    if (!fNombre.trim()) {
      addToast('El nombre del usuario es obligatorio.', 'warning');
      return;
    }

    const empresaObj = clientes.find((c) => c.codigo === fEmpresaCodigo);
    if (fRole !== 'super_admin' && !empresaObj && !userProfile?.empresaCodigo) {
      addToast('Seleccione la empresa a la que pertenecerá el usuario.', 'warning');
      return;
    }

    const finalEmpresaCodigo =
      fRole === 'super_admin'
        ? ''
        : isSuperAdmin
        ? empresaObj?.codigo || fEmpresaCodigo
        : userProfile?.empresaCodigo || '';

    const finalEmpresaNombre =
      fRole === 'super_admin'
        ? 'Todas las Empresas'
        : isSuperAdmin
        ? empresaObj?.nombre || ''
        : userProfile?.empresaNombre || '';

    setSaving(true);
    try {
      await saveUserAccess({
        email: emailClean,
        nombre: fNombre.trim(),
        cargo: fCargo.trim(),
        role: fRole,
        empresaCodigo: finalEmpresaCodigo,
        empresaNombre: finalEmpresaNombre,
        permisos: fRole === 'super_admin' ? FULL_PERMISOS : fPermisos,
        activo: fActivo,
        existingInviteId: editingTarget?.inviteId || editingTarget?.id,
        existingUid: editingTarget?.uid
      });
      addToast(
        modalMode === 'create'
          ? `Acceso creado para "${emailClean}".`
          : `Permisos actualizados para "${emailClean}".`
      );
      setModalMode(null);
      await fetchUsers();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'No se pudo guardar el usuario.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: EmpresaUserSummary) => {
    if (u.uid && u.uid === userProfile?.uid) {
      addToast('No puede eliminar su propio usuario activo.', 'warning');
      return;
    }
    if (!isSuperAdmin && u.role === 'super_admin') {
      addToast('Solo un Administrador General puede eliminar a otro Administrador General.', 'warning');
      return;
    }

    const confirmed = await confirmAction({
      title: 'Revocar y Eliminar Acceso',
      message: `¿Está seguro de eliminar el acceso de "${u.nombre}" (${u.email})? Perderá inmediatamente el acceso al sistema.`,
      confirmText: 'Sí, Eliminar Acceso',
      tone: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteUserAccess(u);
      addToast(`Acceso eliminado para ${u.email}.`, 'info');
      await fetchUsers();
    } catch (err) {
      addToast('Error al eliminar usuario.', 'error');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.cargo || '').toLowerCase().includes(q) ||
      u.empresaNombre.toLowerCase().includes(q);
    const matchesEmp =
      !isSuperAdmin ||
      filterEmpresa === 'ALL' ||
      (filterEmpresa === 'GLOBAL' ? u.role === 'super_admin' : u.empresaCodigo === filterEmpresa);
    return matchesSearch && matchesEmp;
  });

  const activeCount = usersList.filter((u) => u.activo).length;
  const adminCount = usersList.filter((u) => u.role === 'super_admin' || u.role === 'company_admin').length;
  const pendingClaimCount = usersList.filter((u) => u.activo && !u.uid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Control de Acceso, Roles & Usuarios
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isSuperAdmin
              ? 'Gestión global multiempresa: administre administradores generales, administradores de planta y permisos granulares.'
              : `Administración de usuarios y permisos exclusiva para ${userProfile?.empresaNombre}.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="Actualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Usuarios Activos</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{activeCount}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Administradores</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{adminCount}</p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Pendientes 1er Ingreso</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{pendingClaimCount}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar usuario, correo o cargo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>

          {isSuperAdmin && (
            <select
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas las Empresas</option>
              <option value="GLOBAL">Administradores Generales</option>
              {clientes.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        <span className="text-xs font-semibold text-slate-500">
          {filteredUsers.length} Usuario{filteredUsers.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Usuario & Cargo</th>
              <th className="py-3 px-4">Correo Google</th>
              <th className="py-3 px-4">Rol</th>
              <th className="py-3 px-4">Empresa Asignada</th>
              <th className="py-3 px-4">Permisos Activos</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Cargando usuarios autorizados...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No hay usuarios registrados para mostrar. Use "Nuevo Usuario" para autorizar accesos.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const modCount = Object.values(u.permisos?.modulos || {}).filter(Boolean).length;
                const actCount = Object.values(u.permisos?.acciones || {}).filter(Boolean).length;
                const isSelf = Boolean(u.uid && u.uid === userProfile?.uid);

                return (
                  <tr key={u.id || u.email} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{u.nombre}</span>
                        {isSelf && (
                          <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{u.cargo || 'Sin cargo especificado'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                          u.role === 'super_admin'
                            ? 'bg-slate-900 text-white'
                            : u.role === 'company_admin'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {u.role === 'super_admin' ? 'Todas las Empresas (Global)' : u.empresaNombre || u.empresaCodigo}
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'super_admin' ? (
                        <span className="text-[11px] font-bold text-emerald-700">Acceso Total</span>
                      ) : (
                        <div className="text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-900">{modCount}</span> módulos ·{' '}
                          <span className="font-semibold text-slate-900">{actCount}</span> acciones
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {!u.activo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10.5px] font-bold">
                          <XCircle className="w-3 h-3" />
                          Suspendido
                        </span>
                      ) : u.uid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10.5px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10.5px] font-bold">
                          Autorizado (Pendiente 1er login)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          disabled={!isSuperAdmin && u.role === 'super_admin'}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded disabled:opacity-30"
                          title="Editar permisos"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isSelf || (!isSuperAdmin && u.role === 'super_admin')}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30"
                          title="Eliminar acceso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit User Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>
                  {modalMode === 'create'
                    ? 'Autorizar Nuevo Usuario'
                    : `Editar Permisos: ${editingTarget?.email}`}
                </span>
              </h2>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Identity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Correo Electrónico Google *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="usuario@empresa.com"
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                    className="w-full font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Mendoza"
                    value={fNombre}
                    onChange={(e) => setFNombre(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cargo / Puesto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Jefe de Mantenimiento / Técnico"
                    value={fCargo}
                    onChange={(e) => setFCargo(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nivel de Rol *
                  </label>
                  <select
                    value={fRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {isSuperAdmin && (
                      <option value="super_admin">Administrador General (Todas las Empresas)</option>
                    )}
                    <option value="company_admin">Administrador de Empresa (Gestiona su Empresa y Usuarios)</option>
                    <option value="company_user">Usuario de Empresa (Solo ve su Empresa)</option>
                  </select>
                </div>

                {fRole !== 'super_admin' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Empresa Asignada *
                    </label>
                    <select
                      value={fEmpresaCodigo}
                      disabled={!isSuperAdmin || modalMode === 'edit'}
                      onChange={(e) => setFEmpresaCodigo(e.target.value)}
                      className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    >
                      <option value="">Seleccione empresa...</option>
                      {clientes.map((c) => (
                        <option key={c.codigo} value={c.codigo}>
                          {c.nombre} ({c.codigo})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full">
                    <input
                      type="checkbox"
                      checked={fActivo}
                      onChange={(e) => setFActivo(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span className="font-bold text-slate-800">Usuario Activo (Puede ingresar)</span>
                  </label>
                </div>
              </div>

              {/* Granular Permissions */}
              {fRole === 'super_admin' ? (
                <div className="p-4 rounded-xl bg-slate-900 text-white text-xs space-y-1">
                  <p className="font-bold">Privilegios de Administrador General</p>
                  <p className="text-slate-300">
                    Tiene acceso irrestricto a todas las empresas, creación/eliminación de empresas, emisión/cierre de órdenes y gestión global de usuarios.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  {/* Presets */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700">Plantillas Rápidas de Permisos:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {PERMISO_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleApplyPreset(p.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 rounded-lg transition-colors"
                        >
                          {p.label.split(' (')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modules Grid */}
                  <div>
                    <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[11px]">
                      Módulos Visibles para este Usuario
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {MODULOS_META.map((m) => {
                        const checked = Boolean(fPermisos.modulos[m.key]);
                        return (
                          <label
                            key={m.key}
                            className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                              checked
                                ? 'bg-blue-50/70 border-blue-300 text-slate-900'
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleModulo(m.key)}
                              className="w-4 h-4 accent-blue-600 mt-0.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-bold block leading-tight">{m.label}</span>
                              <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                                {m.desc}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div>
                    <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[11px]">
                      Permisos de Acción Operativa
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {ACCIONES_META.map((a) => {
                        const checked = Boolean(fPermisos.acciones[a.key]);
                        return (
                          <label
                            key={a.key}
                            className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                              checked
                                ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAccion(a.key)}
                              className="w-4 h-4 accent-emerald-600 mt-0.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-bold block leading-tight">{a.label}</span>
                              <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                                {a.desc}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-xs"
                >
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Autorizar Usuario' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
