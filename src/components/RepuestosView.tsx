/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  History,
  Building2,
  Cpu,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Printer,
  FileDown,
  Layers,
  ShieldAlert,
  Wrench,
  Clock,
  ExternalLink,
  Phone,
  Mail,
  Info,
  Loader2,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';
import { hasActionAccess } from '../utils/rbac';
import { Repuesto, CriticidadRepuesto, MovimientoRepuesto } from '../types';
import { formatFechaDDMMYYYY } from '../utils/maintenanceEngine';
import { exportElementToPDF } from '../utils/pdfGenerator';

const CATEGORIAS_REPUESTOS = [
  'Rodamientos',
  'Sellos y Empaques',
  'Filtros',
  'Lubricantes',
  'Eléctrico',
  'Neumático',
  'Hidráulico',
  'Válvulas',
  'Instrumentación',
  'Transmisión y Correas',
  'General / Ferretería'
];

export const RepuestosView: React.FC = () => {
  const {
    selectedCliente,
    clientes,
    equipos,
    repuestos,
    movimientosRepuestos,
    addRepuesto,
    updateRepuesto,
    deleteRepuesto,
    registrarMovimientoStock,
    confirmAction,
    addToast
  } = useMaintenance();
  const { userProfile, isSuperAdmin } = useAuth();
  const canEdit = hasActionAccess(userProfile, 'crear_editar');
  const canDelete = hasActionAccess(userProfile, 'eliminar');
  const canManageStock = hasActionAccess(userProfile, 'gestionar_stock');
  const canPrint = hasActionAccess(userProfile, 'imprimir_pdf');

  const printAreaRef = useRef<HTMLDivElement>(null);
  const pdfExportRef = useRef<HTMLDivElement>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todas');
  const [filtroCriticidad, setFiltroCriticidad] = useState<'Todas' | 'Critico' | 'StockBajo'>('Todas');

  // Modals
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingRepuestoId, setEditingRepuestoId] = useState<string | null>(null);
  const [movimientoModalRepuesto, setMovimientoModalRepuesto] = useState<Repuesto | null>(null);
  const [historyModalRepuesto, setHistoryModalRepuesto] = useState<Repuesto | null>(null);

  // Form states for Create / Edit
  const [formCodigo, setFormCodigo] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formCategoria, setFormCategoria] = useState(CATEGORIAS_REPUESTOS[0]);
  const [formCliente, setFormCliente] = useState(selectedCliente === 'Todos' ? (clientes[0]?.nombre || '') : selectedCliente);
  const [formEquipos, setFormEquipos] = useState<string[]>([]);
  const [formCriticidad, setFormCriticidad] = useState<CriticidadRepuesto>('Crítico');
  const [formStockActual, setFormStockActual] = useState(1);
  const [formStockMinimo, setFormStockMinimo] = useState(1);
  const [formStockSeguridad, setFormStockSeguridad] = useState(1);
  const [formUnidad, setFormUnidad] = useState('Unidad');
  const [formUbicacion, setFormUbicacion] = useState('Almacén Central - Estante A1');
  const [formPrecio, setFormPrecio] = useState(100);
  const [formMoneda, setFormMoneda] = useState('USD');
  const [formProveedor, setFormProveedor] = useState('');
  const [formContactoProveedor, setFormContactoProveedor] = useState('');
  const [formLeadTime, setFormLeadTime] = useState(3);
  const [formOEM, setFormOEM] = useState('');
  const [formObservaciones, setFormObservaciones] = useState('');

  // Form states for Quick Stock Movement
  const [movTipo, setMovTipo] = useState<'Entrada' | 'Salida' | 'Ajuste'>('Salida');
  const [movCantidad, setMovCantidad] = useState(1);
  const [movMotivo, setMovMotivo] = useState('');
  const [movOT, setMovOT] = useState('');
  const [movEquipo, setMovEquipo] = useState('');
  const [movSolicitante, setMovSolicitante] = useState('Téc. Mantenimiento');

  // Filtered list
  const repuestosFiltrados = useMemo(() => {
    return repuestos.filter(rep => {
      const matchesClient = selectedCliente === 'Todos' || rep.cliente.trim() === selectedCliente.trim() || rep.cliente === 'Todas las Plantas';
      const matchesCat = selectedCategoria === 'Todas' || rep.categoria === selectedCategoria;
      
      let matchesCrit = true;
      if (filtroCriticidad === 'Critico') matchesCrit = rep.criticidad === 'Crítico';
      if (filtroCriticidad === 'StockBajo') matchesCrit = rep.stock_actual <= rep.stock_minimo;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        rep.codigo_repuesto.toLowerCase().includes(q) ||
        rep.nombre.toLowerCase().includes(q) ||
        (rep.descripcion && rep.descripcion.toLowerCase().includes(q)) ||
        rep.proveedor.toLowerCase().includes(q) ||
        (rep.numero_parte_fabricante && rep.numero_parte_fabricante.toLowerCase().includes(q)) ||
        rep.equipos_asociados.some(eq => eq.toLowerCase().includes(q));

      return matchesClient && matchesCat && matchesCrit && matchesSearch;
    });
  }, [repuestos, selectedCliente, selectedCategoria, filtroCriticidad, searchQuery]);

  // KPIs
  const kpis = useMemo(() => {
    const scoped = repuestos.filter(rep => selectedCliente === 'Todos' || rep.cliente.trim() === selectedCliente.trim() || rep.cliente === 'Todas las Plantas');
    const totalItems = scoped.length;
    const totalCriticos = scoped.filter(r => r.criticidad === 'Crítico').length;
    const stockBajoAlerts = scoped.filter(r => r.stock_actual <= r.stock_minimo).length;
    const valorTotal = scoped.reduce((acc, r) => acc + (r.stock_actual * (r.precio_unitario || 0)), 0);
    const totalUnidades = scoped.reduce((acc, r) => acc + r.stock_actual, 0);

    return { totalItems, totalCriticos, stockBajoAlerts, valorTotal, totalUnidades };
  }, [repuestos, selectedCliente]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingRepuestoId(null);
    setFormCodigo(`REP-${String(repuestos.length + 1).padStart(3, '0')}`);
    setFormNombre('');
    setFormDescripcion('');
    setFormCategoria(CATEGORIAS_REPUESTOS[0]);
    const targetCli = selectedCliente === 'Todos' ? (clientes[0]?.nombre || '') : selectedCliente;
    setFormCliente(targetCli);
    setFormEquipos([]);
    setFormCriticidad('Crítico');
    setFormStockActual(2);
    setFormStockMinimo(1);
    setFormStockSeguridad(1);
    setFormUnidad('Unidad');
    setFormUbicacion('Almacén Central - Estante A1 - Gaveta 01');
    setFormPrecio(150);
    setFormMoneda('USD');
    setFormProveedor('Distribuidor Industrial Autorizado');
    setFormContactoProveedor('ventas@proveedor.com / +56 2 2000 0000');
    setFormLeadTime(5);
    setFormOEM('');
    setFormObservaciones('');
  };

  // Open Edit Modal
  const handleOpenEdit = (rep: Repuesto) => {
    setModalMode('edit');
    setEditingRepuestoId(rep.id);
    setFormCodigo(rep.codigo_repuesto);
    setFormNombre(rep.nombre);
    setFormDescripcion(rep.descripcion || '');
    setFormCategoria(rep.categoria);
    setFormCliente(rep.cliente);
    setFormEquipos(rep.equipos_asociados || []);
    setFormCriticidad(rep.criticidad);
    setFormStockActual(rep.stock_actual);
    setFormStockMinimo(rep.stock_minimo);
    setFormStockSeguridad(rep.stock_seguridad || 1);
    setFormUnidad(rep.unidad_medida);
    setFormUbicacion(rep.ubicacion_almacen);
    setFormPrecio(rep.precio_unitario);
    setFormMoneda(rep.moneda || 'USD');
    setFormProveedor(rep.proveedor);
    setFormContactoProveedor(rep.contacto_proveedor || '');
    setFormLeadTime(rep.tiempo_entrega_dias || 3);
    setFormOEM(rep.numero_parte_fabricante || '');
    setFormObservaciones(rep.observaciones || '');
  };

  // Submit Create / Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCodigo.trim() || !formNombre.trim()) {
      addToast('El código y el nombre del repuesto son obligatorios.', 'warning');
      return;
    }

    const repuestoData: Repuesto = {
      id: editingRepuestoId || `REP-${Date.now()}`,
      codigo_repuesto: formCodigo.trim().toUpperCase(),
      nombre: formNombre.trim(),
      descripcion: formDescripcion.trim(),
      categoria: formCategoria,
      cliente: formCliente,
      equipos_asociados: formEquipos,
      criticidad: formCriticidad,
      stock_actual: Number(formStockActual),
      stock_minimo: Number(formStockMinimo),
      stock_seguridad: Number(formStockSeguridad),
      unidad_medida: formUnidad,
      ubicacion_almacen: formUbicacion.trim(),
      precio_unitario: Number(formPrecio),
      moneda: formMoneda,
      proveedor: formProveedor.trim(),
      contacto_proveedor: formContactoProveedor.trim(),
      tiempo_entrega_dias: Number(formLeadTime),
      numero_parte_fabricante: formOEM.trim(),
      fecha_ultima_compra: formatFechaDDMMYYYY(new Date()),
      observaciones: formObservaciones.trim()
    };

    if (modalMode === 'create') {
      const codeExists = repuestos.some(
        r => r.codigo_repuesto.toUpperCase() === repuestoData.codigo_repuesto && r.cliente === repuestoData.cliente
      );
      if (codeExists) {
        addToast(`Ya existe un repuesto con el código ${repuestoData.codigo_repuesto} para esta planta.`, 'warning');
        return;
      }
      addRepuesto(repuestoData);
    } else if (modalMode === 'edit' && editingRepuestoId) {
      updateRepuesto(editingRepuestoId, repuestoData);
    }

    setModalMode(null);
  };

  // Open Quick Stock Movement Modal
  const handleOpenMovementModal = (rep: Repuesto) => {
    setMovimientoModalRepuesto(rep);
    setMovTipo('Salida');
    setMovCantidad(1);
    setMovMotivo(`Consumo de ${rep.nombre} en mantenimiento`);
    setMovOT('');
    setMovEquipo(rep.equipos_asociados[0] || '');
    setMovSolicitante('Téc. de Mantenimiento');
  };

  // Submit Quick Movement
  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movimientoModalRepuesto) return;

    if (movCantidad <= 0) {
      addToast('La cantidad debe ser mayor a 0.', 'warning');
      return;
    }

    if (movTipo === 'Salida' && movCantidad > movimientoModalRepuesto.stock_actual) {
      const confirmed = await confirmAction({
        title: 'Stock Insuficiente',
        message: `La cantidad a retirar (${movCantidad}) es mayor al stock disponible (${movimientoModalRepuesto.stock_actual}). El inventario quedará en 0. ¿Desea continuar?`,
        confirmText: 'Sí, Registrar Salida',
        tone: 'warning'
      });
      if (!confirmed) {
        return;
      }
    }

    registrarMovimientoStock({
      repuesto_id: movimientoModalRepuesto.id,
      tipo: movTipo,
      cantidad: Number(movCantidad),
      motivo: movMotivo.trim() || `${movTipo} rápida de almacén`,
      ot_asociada: movOT.trim() || undefined,
      equipo_asociado: movEquipo.trim() || undefined,
      solicitante: movSolicitante.trim() || 'Personal de Planta'
    });

    setMovimientoModalRepuesto(null);
  };

  // Delete
  const handleDeleteRepuesto = async (rep: Repuesto) => {
    const confirmed = await confirmAction({
      title: 'Eliminar Repuesto',
      message: `¿Está seguro de eliminar permanentemente el repuesto "${rep.nombre}" (${rep.codigo_repuesto}) del catálogo de inventario?`,
      confirmText: 'Sí, Eliminar',
      tone: 'danger'
    });
    if (confirmed) {
      deleteRepuesto(rep.id);
    }
  };

  // Current Client Object
  const currentClienteObj = clientes.find(c => c.nombre.trim() === selectedCliente.trim());

  // Paginated chunks for PDF / Print Sheet (12 items per landscape A4 sheet)
  const ITEMS_PER_PRINT_PAGE = 12;
  const totalPrintPages = Math.max(1, Math.ceil(repuestosFiltrados.length / ITEMS_PER_PRINT_PAGE));
  const pagedRepuestos = useMemo(() => {
    const pages: Repuesto[][] = [];
    for (let i = 0; i < totalPrintPages; i++) {
      pages.push(repuestosFiltrados.slice(i * ITEMS_PER_PRINT_PAGE, (i + 1) * ITEMS_PER_PRINT_PAGE));
    }
    return pages;
  }, [repuestosFiltrados, totalPrintPages]);

  const valorTotalFiltrado = useMemo(() => {
    return repuestosFiltrados.reduce((acc, r) => acc + r.stock_actual * (r.precio_unitario || 0), 0);
  }, [repuestosFiltrados]);

  // Download PDF Inventory Report
  const handleDownloadPDF = async () => {
    const targetEl = pdfExportRef.current || printAreaRef.current;
    if (!targetEl) return;
    try {
      setIsGeneratingPDF(true);
      addToast('Generando reporte PDF de inventario de repuestos...', 'info');
      const safeCliente = selectedCliente.replace(/\s+/g, '_');
      await exportElementToPDF(
        targetEl,
        `Inventario_Repuestos_${safeCliente}_${new Date().toISOString().slice(0, 10)}`,
        'landscape'
      );
      addToast('Inventario descargado en PDF exitosamente.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Error al generar el PDF del inventario. Intente nuevamente.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Open Print Preview & trigger print
  const handleOpenPrintPreview = () => {
    setShowPrintPreview(true);
  };

  const handleTriggerNativePrint = () => {
    try {
      window.print();
      addToast('Si su navegador bloquea la impresión en vista embebida, use "Descargar PDF" para imprimir.', 'info');
    } catch (err) {
      console.warn('window.print() blocked, falling back to PDF download', err);
      handleDownloadPDF();
    }
  };

  const handleExportRepuestosCSV = () => {
    const headers = [
      'Código',
      'OEM P/N',
      'Nombre',
      'Categoría',
      'Planta',
      'Equipos Asociados',
      'Criticidad',
      'Stock Actual',
      'Stock Mínimo',
      'Unidad',
      'Ubicación Almacén',
      'Precio Unitario',
      'Moneda',
      'Valor Total',
      'Proveedor',
      'Entrega (Días)'
    ];
    const rows = repuestosFiltrados.map(r => [
      r.codigo_repuesto,
      r.numero_parte_fabricante || '',
      r.nombre,
      r.categoria,
      r.cliente,
      r.equipos_asociados.length > 0 ? r.equipos_asociados.join(' / ') : 'General',
      r.criticidad,
      String(r.stock_actual),
      String(r.stock_minimo),
      r.unidad_medida,
      r.ubicacion_almacen || '',
      String(r.precio_unitario || 0),
      r.moneda || 'USD',
      (r.stock_actual * (r.precio_unitario || 0)).toFixed(2),
      r.proveedor || '',
      String(r.tiempo_entrega_dias || 3)
    ]);

    const escapeCsv = (val: string) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };
    const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(escapeCsv).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeCliente = selectedCliente.replace(/\s+/g, '_');
    a.download = `Listado_Repuestos_${safeCliente}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Listado de repuestos exportado (${repuestosFiltrados.length} ítems).`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 shadow-2xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Gestión de Repuestos e Insumos Críticos
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Control de inventario de repuestos, stock mínimo de seguridad, costos valorizados y trazabilidad de proveedores.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canPrint && (
            <>
              <button
                onClick={handleExportRepuestosCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>{isGeneratingPDF ? 'Generando PDF...' : 'PDF'}</span>
              </button>
              <button
                onClick={handleOpenPrintPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Emitir Listado / Imprimir</span>
              </button>
            </>
          )}
          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Repuesto</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Total Repuestos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Catálogo Activo</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{kpis.totalItems}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{kpis.totalUnidades} unidades físicas en stock</p>
          </div>
          <div className="w-11 h-11 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Repuestos Críticos */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Repuestos Críticos</p>
            <p className="text-2xl font-black text-rose-900 mt-0.5">{kpis.totalCriticos}</p>
            <p className="text-[10px] text-rose-600 mt-0.5 font-medium">Piezas vitales para cero paradas</p>
          </div>
          <div className="w-11 h-11 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Alertas de Stock Bajo / Quiebre */}
        <button
          onClick={() => setFiltroCriticidad(filtroCriticidad === 'StockBajo' ? 'Todas' : 'StockBajo')}
          className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between shadow-2xs ${
            kpis.stockBajoAlerts > 0
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Alertas de Stock Bajo</p>
              {kpis.stockBajoAlerts > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <p className="text-2xl font-black text-amber-900 mt-0.5">{kpis.stockBajoAlerts}</p>
            <p className="text-[10px] text-amber-700 mt-0.5 font-medium">
              {filtroCriticidad === 'StockBajo' ? 'Filtrando en tabla (clic para quitar)' : 'Existencia <= Stock mínimo'}
            </p>
          </div>
          <div className="w-11 h-11 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </button>

        {/* Valor Total Inventario */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inventario Valorizado</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              ${kpis.valorTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-xs font-semibold text-slate-500">USD</span>
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Capital protegido en almacén</p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs no-print">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, nombre, parte OEM, proveedor o equipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
            />
          </div>

          {/* Categoría */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="Todas">Todas las Categorías</option>
              {CATEGORIAS_REPUESTOS.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Criticidad */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600">
            <button
              onClick={() => setFiltroCriticidad('Todas')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filtroCriticidad === 'Todas' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroCriticidad('Critico')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filtroCriticidad === 'Critico' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Solo Críticos
            </button>
            <button
              onClick={() => setFiltroCriticidad('StockBajo')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filtroCriticidad === 'StockBajo' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Stock Bajo ({kpis.stockBajoAlerts})
            </button>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Mostrando {repuestosFiltrados.length} de {repuestos.length} repuestos
        </span>
      </div>

      {/* Main Interactive Table Viewport */}
      <div ref={printAreaRef} className={`space-y-4 ${showPrintPreview ? 'no-print' : ''}`}>
        {/* Printable Official Header (Visible on print only) */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 max-w-[140px]">
                <img
                  src="/assets/aistudio/prodexus_921c729e.jpeg"
                  alt="Prodexus Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              {currentClienteObj?.logo && (
                <div className="h-10 max-w-[130px]">
                  <img
                    src={currentClienteObj.logo}
                    alt={currentClienteObj.nombre}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              <div>
                <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                  PRODEXUS CMMS · INVENTARIO Y CONTROL DE REPUESTOS CRÍTICOS
                </h2>
                <p className="text-[10px] text-slate-600 font-medium">
                  Planta: <strong>{selectedCliente.toUpperCase()}</strong> · Emisión: {new Date().toLocaleDateString('es-ES')} · Auditoría ISO 55001
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                DOC-ALM-REP26
              </span>
            </div>
          </div>
        </div>

        {/* Repuestos Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold text-[10.5px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Código / OEM P/N</th>
                  <th className="py-3 px-3.5">Repuesto & Categoría</th>
                  <th className="py-3 px-3.5">Equipos Vinculados</th>
                  <th className="py-3 px-3 text-center">Criticidad</th>
                  <th className="py-3 px-3 text-center">Stock / Mínimo</th>
                  <th className="py-3 px-3">Ubicación Física</th>
                  <th className="py-3 px-3 text-right">Precio Unitario</th>
                  <th className="py-3 px-3 text-right">Valor Total</th>
                  <th className="py-3 px-3.5">Proveedor & Entrega</th>
                  <th className="py-3 px-3 text-right no-print">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repuestosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                      No se encontraron repuestos registrados para los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  repuestosFiltrados.map(rep => {
                    const isBajoStock = rep.stock_actual <= rep.stock_minimo;
                    const valorFila = rep.stock_actual * (rep.precio_unitario || 0);

                    return (
                      <tr
                        key={rep.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isBajoStock ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        {/* Código & OEM */}
                        <td className="py-3 px-3.5 font-mono">
                          <span className="font-bold text-slate-900 block">{rep.codigo_repuesto}</span>
                          {rep.numero_parte_fabricante ? (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              P/N: {rep.numero_parte_fabricante}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block italic">Sin P/N OEM</span>
                          )}
                        </td>

                        {/* Nombre & Categoría */}
                        <td className="py-3 px-3.5">
                          <span className="font-bold text-slate-900 block leading-tight">{rep.nombre}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-slate-100 text-slate-700">
                              {rep.categoria}
                            </span>
                            <span className="text-[10px] text-slate-400">· {rep.cliente}</span>
                          </div>
                          {rep.descripcion && (
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 max-w-xs" title={rep.descripcion}>
                              {rep.descripcion}
                            </p>
                          )}
                        </td>

                        {/* Equipos Vinculados */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {rep.equipos_asociados.length > 0 ? (
                              rep.equipos_asociados.map(eq => (
                                <span
                                  key={eq}
                                  className="px-1.5 py-0.5 rounded font-mono text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                  {eq}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Uso general</span>
                            )}
                          </div>
                        </td>

                        {/* Criticidad */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide inline-block ${
                              rep.criticidad === 'Crítico'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : rep.criticidad === 'Media'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {rep.criticidad}
                          </span>
                        </td>

                        {/* Stock / Mínimo */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <div className="flex items-center gap-1">
                              <span className={`font-mono text-xs font-black ${
                                isBajoStock ? 'text-rose-600' : 'text-slate-900'
                              }`}>
                                {rep.stock_actual}
                              </span>
                              <span className="text-[10px] text-slate-400">/ {rep.stock_minimo} min</span>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                              rep.stock_actual === 0
                                ? 'bg-rose-100 text-rose-800'
                                : isBajoStock
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {rep.stock_actual === 0
                                ? 'Agotado'
                                : isBajoStock
                                ? 'Reorden'
                                : 'En Stock'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                              {rep.unidad_medida}
                            </span>
                          </div>
                        </td>

                        {/* Ubicación */}
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          <span className="text-[11px] block">{rep.ubicacion_almacen}</span>
                        </td>

                        {/* Precio Unitario */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                          ${rep.precio_unitario.toFixed(2)}
                          <span className="text-[9px] text-slate-400 block font-normal">{rep.moneda || 'USD'}</span>
                        </td>

                        {/* Valor Total */}
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                          ${valorFila.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Proveedor & Lead Time */}
                        <td className="py-3 px-3.5">
                          <span className="font-bold text-slate-800 text-[11px] block">{rep.proveedor}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Entrega: {rep.tiempo_entrega_dias || 3} días
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-3 text-right no-print">
                          <div className="flex items-center justify-end gap-1">
                            {canManageStock && (
                              <button
                                onClick={() => handleOpenMovementModal(rep)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                                title="Registrar Entrada / Salida / Ajuste de Stock"
                              >
                                <ArrowUpDown className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setHistoryModalRepuesto(rep)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Ver Historial de Movimientos de este Repuesto"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => handleOpenEdit(rep)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Modificar Datos Técnicos"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteRepuesto(rep)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Eliminar Repuesto"
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
      </div>

      {/* MODAL: REGISTRAR / EDITAR REPUESTO */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {modalMode === 'create' ? 'Registrar Nuevo Repuesto en Inventario' : `Modificar Ficha ${formCodigo}`}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Definición técnica, punto de reorden y datos del proveedor.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Código de Repuesto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. REP-ROD-6312"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    className="w-full font-mono font-bold uppercase text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Número de Parte OEM
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 6312-2Z/C3"
                    value={formOEM}
                    onChange={(e) => setFormOEM(e.target.value)}
                    className="w-full font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    required
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIAS_REPUESTOS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre descriptivo del Repuesto / Pieza *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Rodamiento Rígido de Bolas SKF 6312/C3"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción Técnica y Dimensiones
                </label>
                <textarea
                  rows={2}
                  placeholder="Diámetro interno, externo, tolerancia, materiales, compatibilidad..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="w-full font-normal text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11.5px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Planta / Cliente Destino *
                  </label>
                  <select
                    value={formCliente}
                    onChange={(e) => setFormCliente(e.target.value)}
                    disabled={!isSuperAdmin}
                    required
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    {isSuperAdmin && <option value="Todas las Plantas">Todas las Plantas (Multi-planta)</option>}
                    {clientes.map(c => (
                      <option key={c.codigo} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Criticidad Operacional *
                  </label>
                  <select
                    value={formCriticidad}
                    onChange={(e) => setFormCriticidad(e.target.value as CriticidadRepuesto)}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Crítico">Crítico (Parada de línea si falta)</option>
                    <option value="Media">Media (Impacto moderado)</option>
                    <option value="Baja">Baja (Consumible auxiliar)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Unidad de Medida *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Unidad, Kit, Litros, Metros, Balde..."
                    value={formUnidad}
                    onChange={(e) => setFormUnidad(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Equipos Asociados Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Equipos Vinculados (Donde se utiliza este repuesto):
                </label>
                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg max-h-24 overflow-y-auto">
                  {Array.from(new Map(equipos.map(e => [e.codigo_eq, e])).values()).map(eq => {
                    const isSelected = formEquipos.includes(eq.codigo_eq);
                    return (
                      <button
                        type="button"
                        key={eq.codigo_eq}
                        onClick={() => {
                          if (isSelected) {
                            setFormEquipos(formEquipos.filter(code => code !== eq.codigo_eq));
                          } else {
                            setFormEquipos([...formEquipos, eq.codigo_eq]);
                          }
                        }}
                        className={`px-2 py-1 rounded text-[10.5px] font-mono transition-colors border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {eq.codigo_eq} ({eq.nombre.slice(0, 20)}...)
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock y Precios */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Stock Actual *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStockActual}
                    onChange={(e) => setFormStockActual(Number(e.target.value))}
                    className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Stock Mínimo (Reorden) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStockMinimo}
                    onChange={(e) => setFormStockMinimo(Number(e.target.value))}
                    className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Precio Unitario ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(Number(e.target.value))}
                    className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Moneda
                  </label>
                  <select
                    value={formMoneda}
                    onChange={(e) => setFormMoneda(e.target.value)}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CLP">CLP ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {/* Ubicación y Proveedor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ubicación en Almacén *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Estante B2 - Gaveta 14"
                    value={formUbicacion}
                    onChange={(e) => setFormUbicacion(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Proveedor Habitual *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Razón Social del Proveedor"
                    value={formProveedor}
                    onChange={(e) => setFormProveedor(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tiempo de Entrega (Días)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Lead time"
                    value={formLeadTime}
                    onChange={(e) => setFormLeadTime(Number(e.target.value))}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Contacto del Proveedor (Teléfono / Email / Vendedor)
                </label>
                <input
                  type="text"
                  placeholder="Ej. ventas@distribuidor.cl / +56 9 8765 4321 / At: Juan Pérez"
                  value={formContactoProveedor}
                  onChange={(e) => setFormContactoProveedor(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observaciones Técnicas o Instrucciones de Almacenamiento
                </label>
                <input
                  type="text"
                  placeholder="Condiciones de temperatura, lubricación previa, precauciones..."
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  className="w-full font-normal text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-5 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                >
                  {modalMode === 'create' ? 'Ingresar Repuesto' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVIMIENTO RÁPIDO DE STOCK (ENTRADA / SALIDA / AJUSTE) */}
      {movimientoModalRepuesto && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Movimiento de Stock: {movimientoModalRepuesto.codigo_repuesto}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {movimientoModalRepuesto.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMovimientoModalRepuesto(null)}
                className="text-slate-400 hover:text-slate-600 font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Current Stock Banner */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Stock Actual en Almacén</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">
                  {movimientoModalRepuesto.stock_actual} {movimientoModalRepuesto.unidad_medida}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium text-slate-500">Punto Mínimo Reorden</p>
                <p className="text-sm font-bold text-amber-700">{movimientoModalRepuesto.stock_minimo} {movimientoModalRepuesto.unidad_medida}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitMovement} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMovTipo('Salida')}
                  className={`p-2 rounded-lg border font-bold text-center transition-all ${
                    movTipo === 'Salida'
                      ? 'bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                  Salida / Uso
                </button>
                <button
                  type="button"
                  onClick={() => setMovTipo('Entrada')}
                  className={`p-2 rounded-lg border font-bold text-center transition-all ${
                    movTipo === 'Entrada'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-2 ring-emerald-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  Entrada / Compra
                </button>
                <button
                  type="button"
                  onClick={() => setMovTipo('Ajuste')}
                  className={`p-2 rounded-lg border font-bold text-center transition-all ${
                    movTipo === 'Ajuste'
                      ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpDown className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                  Ajuste Físico
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {movTipo === 'Ajuste' ? 'Nuevo Stock Real *' : 'Cantidad a Mover *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={movCantidad}
                    onChange={(e) => setMovCantidad(Number(e.target.value))}
                    className="w-full font-mono text-base font-black text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Técnico / Responsable *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del solicitante"
                    value={movSolicitante}
                    onChange={(e) => setMovSolicitante(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motivo / Justificación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cambio preventivo en Chiller, Factura F-5900, Inventario cíclico..."
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Folio de OT / Orden MP / MC (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. MP-2026-01-0001"
                    value={movOT}
                    onChange={(e) => setMovOT(e.target.value)}
                    className="w-full font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Equipo Intervenido (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. CH-01"
                    value={movEquipo}
                    onChange={(e) => setMovEquipo(e.target.value)}
                    className="w-full font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setMovimientoModalRepuesto(null)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-bold text-white rounded-lg transition-colors shadow-xs ${
                    movTipo === 'Salida'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : movTipo === 'Entrada'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Confirmar {movTipo}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIAL DE MOVIMIENTOS DEL REPUESTO */}
      {historyModalRepuesto && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Kardex / Historial de Movimientos: {historyModalRepuesto.codigo_repuesto}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {historyModalRepuesto.nombre} · Stock Actual: <strong className="text-slate-900">{historyModalRepuesto.stock_actual} {historyModalRepuesto.unidad_medida}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalRepuesto(null)}
                className="text-slate-400 hover:text-slate-600 font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Movements List */}
            {(() => {
              const movs = movimientosRepuestos.filter(m => m.repuesto_id === historyModalRepuesto.id || m.codigo_repuesto === historyModalRepuesto.codigo_repuesto);

              if (movs.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No hay movimientos registrados para este repuesto aún.
                  </div>
                );
              }

              return (
                <div className="space-y-2.5">
                  {movs.map(m => {
                    const isEntrada = m.tipo === 'Entrada';
                    const isSalida = m.tipo === 'Salida';

                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase shrink-0 mt-0.5 ${
                            isEntrada
                              ? 'bg-emerald-100 text-emerald-800'
                              : isSalida
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {m.tipo} ({m.cantidad})
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">{m.motivo}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Solicitado / Gestionado por: <span className="font-semibold text-slate-700">{m.solicitante}</span>
                              {m.ot_asociada && ` · Folio OT: ${m.ot_asociada}`}
                              {m.equipo_asociado && ` · Equipo: ${m.equipo_asociado}`}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{m.fecha}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-xs">
                            <span className="text-slate-400 line-through mr-1.5">{m.stock_anterior}</span>
                            <span className="font-black text-slate-900">{m.stock_nuevo}</span>
                          </div>
                          <span className="text-[9.5px] text-slate-400 block font-medium">saldo</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setHistoryModalRepuesto(null)}
                className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-xs"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Off-screen Paginated Printable Sheets for 1-Click PDF Generation */}
      <div
        ref={pdfExportRef}
        aria-hidden="true"
        className="fixed -left-[99999px] top-0 w-[1120px] pointer-events-none space-y-6 no-print"
      >
        {pagedRepuestos.map((chunk, pageIdx) => (
          <div
            key={`pdf_rep_page_${pageIdx}`}
            className="print-sheet bg-white text-slate-900 p-6 space-y-4 flex flex-col justify-between"
            style={{ minHeight: '760px' }}
          >
            <div className="space-y-3">
              {/* Sheet Header */}
              <div className="border-b-2 border-slate-900 pb-2.5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 max-w-[140px] bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
                    <img
                      src="/assets/aistudio/prodexus_921c729e.jpeg"
                      alt="Prodexus CMMS"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  {currentClienteObj?.logo && (
                    <div className="h-11 max-w-[130px] bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={currentClienteObj.logo}
                        alt={currentClienteObj.nombre}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                      {currentClienteObj?.nombre || 'PRODEXUS ENTERPRISE CMMS'} · INVENTARIO DE REPUESTOS CRÍTICOS
                    </h2>
                    <p className="text-[10px] text-slate-600 font-medium">
                      Planta: <strong>{selectedCliente.toUpperCase()}</strong>
                      {currentClienteObj?.rut ? ` · RUT: ${currentClienteObj.rut}` : ''} · Fecha de Emisión: {formatFechaDDMMYYYY(new Date())} · Auditoría ISO 55001
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[11px] font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded">
                    DOC-ALM-REP26
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Hoja {pageIdx + 1} de {totalPrintPages}
                  </p>
                </div>
              </div>

              {/* KPI Summary Strip */}
              <div className="grid grid-cols-4 gap-2.5 text-[10px]">
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500 font-semibold uppercase block">Ítems en Reporte</span>
                  <span className="text-sm font-black text-slate-900">{repuestosFiltrados.length} códigos</span>
                </div>
                <div className="p-2 bg-rose-50/60 border border-rose-200 rounded">
                  <span className="text-rose-700 font-semibold uppercase block">Repuestos Críticos</span>
                  <span className="text-sm font-black text-rose-900">
                    {repuestosFiltrados.filter(r => r.criticidad === 'Crítico').length} ítems
                  </span>
                </div>
                <div className="p-2 bg-amber-50/70 border border-amber-200 rounded">
                  <span className="text-amber-800 font-semibold uppercase block">En Punto de Reorden</span>
                  <span className="text-sm font-black text-amber-900">
                    {repuestosFiltrados.filter(r => r.stock_actual <= r.stock_minimo).length} alertas
                  </span>
                </div>
                <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded">
                  <span className="text-emerald-800 font-semibold uppercase block">Valorización Total</span>
                  <span className="text-sm font-black font-mono text-emerald-900">
                    ${valorTotalFiltrado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>

              {/* Clean Printable Table */}
              <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                  <tr>
                    <th className="py-2 px-2 border border-slate-700">Código / OEM</th>
                    <th className="py-2 px-2 border border-slate-700">Repuesto & Categoría</th>
                    <th className="py-2 px-2 border border-slate-700">Equipos</th>
                    <th className="py-2 px-2 border border-slate-700 text-center">Criticidad</th>
                    <th className="py-2 px-2 border border-slate-700 text-center">Stock / Mín</th>
                    <th className="py-2 px-2 border border-slate-700">Ubicación Física</th>
                    <th className="py-2 px-2 border border-slate-700 text-right">P. Unitario</th>
                    <th className="py-2 px-2 border border-slate-700 text-right">Valor Total</th>
                    <th className="py-2 px-2 border border-slate-700">Proveedor</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        Sin repuestos registrados para este filtro.
                      </td>
                    </tr>
                  ) : (
                    chunk.map(rep => {
                      const isBajo = rep.stock_actual <= rep.stock_minimo;
                      const valor = rep.stock_actual * (rep.precio_unitario || 0);
                      return (
                        <tr key={rep.id} className={isBajo ? 'bg-amber-50/40' : 'bg-white'}>
                          <td className="py-1.5 px-2 border border-slate-300 font-mono">
                            <span className="font-bold text-slate-900 block">{rep.codigo_repuesto}</span>
                            {rep.numero_parte_fabricante && (
                              <span className="text-[8.5px] text-slate-500">P/N: {rep.numero_parte_fabricante}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300">
                            <span className="font-bold text-slate-900 block">{rep.nombre}</span>
                            <span className="text-[8.5px] text-slate-500">{rep.categoria} · {rep.cliente}</span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 font-mono text-[9px] text-blue-800">
                            {rep.equipos_asociados.length > 0 ? rep.equipos_asociados.join(', ') : 'General'}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                            <span className={
                              rep.criticidad === 'Crítico'
                                ? 'text-rose-700'
                                : rep.criticidad === 'Media'
                                ? 'text-amber-700'
                                : 'text-slate-600'
                            }>
                              {rep.criticidad.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-center font-mono">
                            <span className={`font-black ${isBajo ? 'text-rose-700' : 'text-slate-900'}`}>
                              {rep.stock_actual}
                            </span>
                            <span className="text-slate-500"> / {rep.stock_minimo}</span>
                            <span className="block text-[8.5px] text-slate-500">{rep.unidad_medida}</span>
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-slate-700">
                            {rep.ubicacion_almacen}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-right font-mono">
                            ${rep.precio_unitario.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300 text-right font-mono font-bold text-slate-900">
                            ${valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-2 border border-slate-300">
                            <span className="font-semibold text-slate-800 block">{rep.proveedor}</span>
                            <span className="text-[8.5px] text-slate-500">Entrega: {rep.tiempo_entrega_dias || 3}d</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Signatures */}
            <div className="mt-auto pt-4 border-t border-slate-300">
              <div className="grid grid-cols-3 gap-6 text-center text-[9.5px] text-slate-600 mb-2">
                <div>
                  <div className="border-b border-slate-400 h-6 mb-1" />
                  <p className="font-bold text-slate-800">Encargado de Almacén / Pañol</p>
                  <p className="text-[8.5px] text-slate-400">Control Físico de Existencias</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 h-6 mb-1" />
                  <p className="font-bold text-slate-800">Jefe de Mantenimiento</p>
                  <p className="text-[8.5px] text-slate-400">Validación de Criticidad y Stock Mínimo</p>
                </div>
                <div>
                  <div className="border-b border-slate-400 h-6 mb-1" />
                  <p className="font-bold text-slate-800">Control de Costos / Gerencia</p>
                  <p className="text-[8.5px] text-slate-400">Aprobación de Reposición</p>
                </div>
              </div>
              <p className="text-center text-[8.5px] text-slate-400">
                PRODEXUS CMMS · Reporte Oficial de Almacén &amp; Repuestos Críticos · Hoja {pageIdx + 1} de {totalPrintPages}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* INTERACTIVE MODAL: VISTA PREVIA DE IMPRESIÓN Y PDF DEL INVENTARIO */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-6">
          <div className="sticky top-0 z-10 w-full max-w-6xl bg-white border border-slate-200 rounded-xl p-3 shadow-lg flex items-center justify-between gap-4 mb-4 no-print">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-bold text-slate-900">
                Vista Previa de Impresión de Stock ({repuestosFiltrados.length} repuestos · {totalPrintPages} {totalPrintPages === 1 ? 'hoja' : 'hojas'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportRepuestosCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel (CSV)</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>{isGeneratingPDF ? 'Generando PDF...' : 'Descargar PDF'}</span>
              </button>
              <button
                onClick={handleTriggerNativePrint}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Ahora</span>
              </button>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-lg"
                title="Cerrar Vista Previa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="w-full max-w-6xl space-y-6 print-container">
            {pagedRepuestos.map((chunk, pageIdx) => (
              <div
                key={`preview_rep_page_${pageIdx}`}
                className="print-sheet bg-white text-slate-900 p-6 rounded-xl shadow-md border border-slate-300 space-y-4 flex flex-col justify-between"
                style={{ minHeight: '760px' }}
              >
                <div className="space-y-3">
                  <div className="border-b-2 border-slate-900 pb-2.5 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 max-w-[140px] bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
                        <img
                          src="/assets/aistudio/prodexus_921c729e.jpeg"
                          alt="Prodexus CMMS"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      {currentClienteObj?.logo && (
                        <div className="h-11 max-w-[130px] bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={currentClienteObj.logo}
                            alt={currentClienteObj.nombre}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                      <div>
                        <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                          {currentClienteObj?.nombre || 'PRODEXUS ENTERPRISE CMMS'} · INVENTARIO DE REPUESTOS CRÍTICOS
                        </h2>
                        <p className="text-[10px] text-slate-600 font-medium">
                          Planta: <strong>{selectedCliente.toUpperCase()}</strong>
                          {currentClienteObj?.rut ? ` · RUT: ${currentClienteObj.rut}` : ''} · Emisión: {formatFechaDDMMYYYY(new Date())} · Auditoría ISO 55001
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-[11px] font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded">
                        DOC-ALM-REP26
                      </span>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">
                        Hoja {pageIdx + 1} de {totalPrintPages}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5 text-[10px]">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-slate-500 font-semibold uppercase block">Ítems en Reporte</span>
                      <span className="text-sm font-black text-slate-900">{repuestosFiltrados.length} códigos</span>
                    </div>
                    <div className="p-2 bg-rose-50/60 border border-rose-200 rounded">
                      <span className="text-rose-700 font-semibold uppercase block">Repuestos Críticos</span>
                      <span className="text-sm font-black text-rose-900">
                        {repuestosFiltrados.filter(r => r.criticidad === 'Crítico').length} ítems
                      </span>
                    </div>
                    <div className="p-2 bg-amber-50/70 border border-amber-200 rounded">
                      <span className="text-amber-800 font-semibold uppercase block">En Punto de Reorden</span>
                      <span className="text-sm font-black text-amber-900">
                        {repuestosFiltrados.filter(r => r.stock_actual <= r.stock_minimo).length} alertas
                      </span>
                    </div>
                    <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded">
                      <span className="text-emerald-800 font-semibold uppercase block">Valorización Total</span>
                      <span className="text-sm font-black font-mono text-emerald-900">
                        ${valorTotalFiltrado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </span>
                    </div>
                  </div>

                  <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                    <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                      <tr>
                        <th className="py-2 px-2 border border-slate-700">Código / OEM</th>
                        <th className="py-2 px-2 border border-slate-700">Repuesto & Categoría</th>
                        <th className="py-2 px-2 border border-slate-700">Equipos</th>
                        <th className="py-2 px-2 border border-slate-700 text-center">Criticidad</th>
                        <th className="py-2 px-2 border border-slate-700 text-center">Stock / Mín</th>
                        <th className="py-2 px-2 border border-slate-700">Ubicación Física</th>
                        <th className="py-2 px-2 border border-slate-700 text-right">P. Unitario</th>
                        <th className="py-2 px-2 border border-slate-700 text-right">Valor Total</th>
                        <th className="py-2 px-2 border border-slate-700">Proveedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500">
                            Sin repuestos registrados para este filtro.
                          </td>
                        </tr>
                      ) : (
                        chunk.map(rep => {
                          const isBajo = rep.stock_actual <= rep.stock_minimo;
                          const valor = rep.stock_actual * (rep.precio_unitario || 0);
                          return (
                            <tr key={rep.id} className={isBajo ? 'bg-amber-50/40' : 'bg-white'}>
                              <td className="py-1.5 px-2 border border-slate-300 font-mono">
                                <span className="font-bold text-slate-900 block">{rep.codigo_repuesto}</span>
                                {rep.numero_parte_fabricante && (
                                  <span className="text-[8.5px] text-slate-500">P/N: {rep.numero_parte_fabricante}</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 border border-slate-300">
                                <span className="font-bold text-slate-900 block">{rep.nombre}</span>
                                <span className="text-[8.5px] text-slate-500">{rep.categoria} · {rep.cliente}</span>
                              </td>
                              <td className="py-1.5 px-2 border border-slate-300 font-mono text-[9px] text-blue-800">
                                {rep.equipos_asociados.length > 0 ? rep.equipos_asociados.join(', ') : 'General'}
                              </td>
                              <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                                <span className={
                                  rep.criticidad === 'Crítico'
                                    ? 'text-rose-700'
                                    : rep.criticidad === 'Media'
                                    ? 'text-amber-700'
                                    : 'text-slate-600'
                                }>
                                  {rep.criticidad.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 border border-slate-300 text-center font-mono">
                                <span className={`font-black ${isBajo ? 'text-rose-700' : 'text-slate-900'}`}>
                                  {rep.stock_actual}
                                </span>
                                <span className="text-slate-500"> / {rep.stock_minimo}</span>
                                <span className="block text-[8.5px] text-slate-500">{rep.unidad_medida}</span>
                              </td>
                              <td className="py-1.5 px-2 border border-slate-300 text-slate-700">
                                {rep.ubicacion_almacen}
                              </td>
                              <td className="py-1.5 px-2 border border-slate-300 text-right font-mono">
                                ${rep.precio_unitario.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-2 border border-slate-300 text-right font-mono font-bold text-slate-900">
                                ${valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-1.5 px-2 border border-slate-300">
                                <span className="font-semibold text-slate-800 block">{rep.proveedor}</span>
                                <span className="text-[8.5px] text-slate-500">Entrega: {rep.tiempo_entrega_dias || 3}d</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-300">
                  <div className="grid grid-cols-3 gap-6 text-center text-[9.5px] text-slate-600 mb-2">
                    <div>
                      <div className="border-b border-slate-400 h-6 mb-1" />
                      <p className="font-bold text-slate-800">Encargado de Almacén / Pañol</p>
                      <p className="text-[8.5px] text-slate-400">Control Físico de Existencias</p>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 h-6 mb-1" />
                      <p className="font-bold text-slate-800">Jefe de Mantenimiento</p>
                      <p className="text-[8.5px] text-slate-400">Validación de Criticidad y Stock Mínimo</p>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 h-6 mb-1" />
                      <p className="font-bold text-slate-800">Control de Costos / Gerencia</p>
                      <p className="text-[8.5px] text-slate-400">Aprobación de Reposición</p>
                    </div>
                  </div>
                  <p className="text-center text-[8.5px] text-slate-400">
                    PRODEXUS CMMS · Reporte Oficial de Almacén &amp; Repuestos Críticos · Hoja {pageIdx + 1} de {totalPrintPages}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
