/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Calendar,
  Printer,
  FileDown,
  Loader2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  FileCheck2,
  Trash2,
  Eye,
  SlidersHorizontal,
  Edit2,
  Archive,
  RotateCcw,
  AlertOctagon,
  ShieldCheck,
  Check,
  Gauge,
  XCircle,
  FileText,
  Share2,
  Smartphone
} from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';
import { hasActionAccess } from '../utils/rbac';
import {
  MESES_L,
  addFrequencyStep,
  calcularOcurrenciasInstrumento,
  formatFechaDDMMYYYY,
  formatFechaYYYYMMDD,
  obtenerFrecuenciaConfig,
  parseFecha
} from '../utils/maintenanceEngine';
import { exportElementToPDF } from '../utils/pdfGenerator';
import { resolveSheetClientes } from '../utils/logoResolver';
import { OrdenCalibracion, PuntoCalibracion, Equipo, Instrumento } from '../types';
import { RepuestosConsumoSelector, SelectedRepuestoConsumo } from './RepuestosConsumoSelector';
import { CatalogoListadoModal } from './CatalogoListadoModal';
import { PrintableDocument } from './PrintModal';
import { DigitalOrderTarget } from '../utils/digitalOrderLink';

interface CalibracionViewProps {
  initialTab?: 'plan' | 'instrumentos' | 'emision' | 'cierre' | 'historial';
  onPrintCalibration?: (order: PrintableDocument) => void;
  onPrintBatchCalibration?: (orders: PrintableDocument[]) => void;
  onShareOrder?: (target: DigitalOrderTarget) => void;
  onOpenDigitalExecution?: (target: DigitalOrderTarget) => void;
}

export const CalibracionView: React.FC<CalibracionViewProps> = ({
  initialTab,
  onPrintCalibration,
  onPrintBatchCalibration,
  onShareOrder,
  onOpenDigitalExecution
}) => {
  const {
    selectedCliente,
    selectedAnio,
    setSelectedAnio,
    availableYears,
    clientes,
    equipos,
    calibraciones,
    instrumentos,
    tecnicos,
    frecuencias,
    addInstrumento,
    updateInstrumento,
    darDeBajaInstrumento,
    reactivarInstrumento,
    deleteInstrumento,
    crearOrdenCalibracion,
    crearOrdenesCalibracionLote,
    cerrarOrdenCalibracion,
    certificarCalibracionProyectada,
    deleteOrdenCalibracion,
    registrarSalidasStockBatch,
    confirmAction,
    addToast
  } = useMaintenance();
  const { userProfile, isSuperAdmin } = useAuth();
  const canEdit = hasActionAccess(userProfile, 'crear_editar');
  const canEmit = hasActionAccess(userProfile, 'emitir_ordenes');
  const canClose = hasActionAccess(userProfile, 'cerrar_ordenes');
  const canDelete = hasActionAccess(userProfile, 'eliminar');
  const canPrint = hasActionAccess(userProfile, 'imprimir_pdf');

  const planCalibPrintRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [activeTab, setActiveTab] = useState<'plan' | 'instrumentos' | 'emision' | 'cierre' | 'historial'>(initialTab || 'plan');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [historialAnioMode, setHistorialAnioMode] = useState<'selected' | 'all'>('all');
  const [selectedCellInfo, setSelectedCellInfo] = useState<{
    order: OrdenCalibracion;
    isProjectedOnly?: boolean;
    mes_n?: number;
  } | null>(null);

  // States for Instrumentos Catalog & Lifecycle
  const [instSearchQuery, setInstSearchQuery] = useState('');
  const [instFilterEstado, setInstFilterEstado] = useState<'Todos' | 'Activo' | 'Baja'>('Activo');
  const [instModalMode, setInstModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingInstCodigo, setEditingInstCodigo] = useState<string | null>(null);
  const [showInstListadoModal, setShowInstListadoModal] = useState(false);

  // Instrument Modal Form states
  const [fInstCodigo, setFInstCodigo] = useState('');
  const [fInstNombre, setFInstNombre] = useState('');
  const [fInstCliente, setFInstCliente] = useState('');
  const [fInstEquipoAsoc, setFInstEquipoAsoc] = useState('');
  const [fInstVariable, setFInstVariable] = useState('Presión Hidráulica / Neumática');
  const [fInstRango, setFInstRango] = useState('0 a 300 PSI');
  const [fInstEMP, setFInstEMP] = useState('± 0.5% FS');
  const [fInstFrecuencia, setFInstFrecuencia] = useState('Semestral');
  const [fInstFechaInicio, setFInstFechaInicio] = useState(new Date().toISOString().slice(0, 10));
  const [fInstMarca, setFInstMarca] = useState('');
  const [fInstModelo, setFInstModelo] = useState('');
  const [fInstSerie, setFInstSerie] = useState('');
  const [fInstUbicacion, setFInstUbicacion] = useState('');
  const [fInstPatron, setFInstPatron] = useState('');
  const [fInstMetrologo, setFInstMetrologo] = useState('');
  const [fInstNotas, setFInstNotas] = useState('');

  // Dar de Baja Modal State
  const [bajaModalInst, setBajaModalInst] = useState<Instrumento | null>(null);
  const [bajaFecha, setBajaFecha] = useState(new Date().toISOString().slice(0, 10));
  const [bajaMotivo, setBajaMotivo] = useState('');

  // Form states for Emisión (Individual & Masiva por Mes)
  const [selectedMesEmit, setSelectedMesEmit] = useState<number>(new Date().getMonth() + 1);
  const [emisionMode, setEmisionMode] = useState<'masiva' | 'individual'>('masiva');
  const [batchFechaProg, setBatchFechaProg] = useState<string>(() => `${selectedAnio}-${String(new Date().getMonth() + 1).padStart(2, '0')}-15`);
  const [batchFechaTent, setBatchFechaTent] = useState<string>(() => `${selectedAnio}-${String(new Date().getMonth() + 1).padStart(2, '0')}-22`);
  const [batchTolDias, setBatchTolDias] = useState<number>(7);
  const [respectProjectedDates, setRespectProjectedDates] = useState<boolean>(true);
  const [batchMetrologoDefault, setBatchMetrologoDefault] = useState<string>(tecnicos[0]?.nombre || 'Metrología Interna');
  const [selectedBatchInsts, setSelectedBatchInsts] = useState<string[]>([]);
  const [lastBatchFolios, setLastBatchFolios] = useState<string[]>([]);

  const [formEqCode, setFormEqCode] = useState('');
  const [formNombreInst, setFormNombreInst] = useState('');
  const [formVariable, setFormVariable] = useState('Presión Hidráulica / Neumática');
  const [formRango, setFormRango] = useState('0 a 300 PSI');
  const [formEMP, setFormEMP] = useState('± 0.5% FS');
  const [formFrecuencia, setFormFrecuencia] = useState('Semestral');
  const [formFechaProg, setFormFechaProg] = useState(new Date().toISOString().slice(0, 10));
  const [formFechaTent, setFormFechaTent] = useState(new Date().toISOString().slice(0, 10));
  const [formTolDias, setFormTolDias] = useState(7);
  const [formMetrologo, setFormMetrologo] = useState(tecnicos[0]?.nombre || 'Metrología Interna');
  const [formObs, setFormObs] = useState('');

  // Form states for Cierre / Certificado
  const [selectedCalToClose, setSelectedCalToClose] = useState('');
  const [cierreFechaReal, setCierreFechaReal] = useState(new Date().toISOString().slice(0, 10));
  const [cierreDictamen, setCierreDictamen] = useState<'Conforme' | 'Ajustado y Conforme' | 'No Conforme'>('Conforme');
  const [cierreErrorMax, setCierreErrorMax] = useState('+0.25%');
  const [cierrePatron, setCierrePatron] = useState('Balanza de Pesos Muertos Ametek PKII S/N 84120');
  const [cierreTrazabilidad, setCierreTrazabilidad] = useState('CERT-MET-INT-2025-441 (Laboratorio Acreditado)');
  const [cierreMetrologo, setCierreMetrologo] = useState('');
  const [cierreCertNo, setCierreCertNo] = useState('');
  const [cierreObs, setCierreObs] = useState('');
  const [cierreRepuestos, setCierreRepuestos] = useState('');
  const [stockConsumido, setStockConsumido] = useState<SelectedRepuestoConsumo[]>([]);
  const [lastEmittedCalFolio, setLastEmittedCalFolio] = useState<string | null>(null);
  const [cierrePuntos, setCierrePuntos] = useState<PuntoCalibracion[]>([
    { punto_nominal: '0% (0.0)', lectura_patron: '0.00', lectura_instrumento: '0.0', error_calculado: '0.00%', conforme: true },
    { punto_nominal: '25% (75.0)', lectura_patron: '75.02', lectura_instrumento: '75.1', error_calculado: '+0.10%', conforme: true },
    { punto_nominal: '50% (150.0)', lectura_patron: '150.05', lectura_instrumento: '150.3', error_calculado: '+0.16%', conforme: true },
    { punto_nominal: '75% (225.0)', lectura_patron: '225.02', lectura_instrumento: '225.4', error_calculado: '+0.17%', conforme: true },
    { punto_nominal: '100% (300.0)', lectura_patron: '300.00', lectura_instrumento: '300.2', error_calculado: '+0.07%', conforme: true }
  ]);

  const calibracionesCliente = selectedCliente === 'Todos'
    ? calibraciones
    : calibraciones.filter(c => c.cliente.trim() === selectedCliente.trim());

  const instrumentosCliente = selectedCliente === 'Todos'
    ? instrumentos
    : instrumentos.filter(i => i.cliente.trim() === selectedCliente.trim());

  const instrumentosActivos = instrumentosCliente.filter(i => i.estado === 'Activo');
  const instrumentosBaja = instrumentosCliente.filter(i => i.estado === 'Baja');

  const pendientesList = calibracionesCliente.filter(c => c.estado === 'Pendiente');
  const cerradasList = calibracionesCliente.filter(c => c.estado !== 'Pendiente');

  // Projected calibration occurrences (not yet emitted) across selectedAnio up to maxMesPendiente
  const currentYearNow = new Date().getFullYear();
  const currentMonthNow = new Date().getMonth() + 1;
  const maxMesPendienteCal = selectedAnio < currentYearNow ? 12 : selectedAnio === currentYearNow ? currentMonthNow : 12;

  interface CloseableCalItem {
    key: string;
    label: string;
    isProjectedOnly: boolean;
    order: OrdenCalibracion;
    mes_n: number;
  }

  const projectedPendientesList: CloseableCalItem[] = [];
  for (const inst of instrumentosActivos) {
    const occurs = calcularOcurrenciasInstrumento(inst, selectedAnio, frecuencias, calibracionesCliente);
    for (const occ of occurs) {
      if (!occ.ordenMatch && occ.mes_n <= maxMesPendienteCal) {
        const dtStr = formatFechaDDMMYYYY(occ.fecha);
        const { tolerancia } = obtenerFrecuenciaConfig(inst.frecuencia, frecuencias);
        const dtTent = new Date(occ.fecha);
        dtTent.setDate(dtTent.getDate() + Math.max(3, Math.min(7, tolerancia)));
        const virtualFolio = `CAL-${selectedAnio}-${String(occ.mes_n).padStart(2, '0')}-PROY-${inst.codigo_inst}`;
        const virtualOrder: OrdenCalibracion = {
          id_ot: virtualFolio,
          codigo_eq: inst.codigo_inst,
          cliente: inst.cliente,
          instrumento_nombre: inst.nombre,
          variable_medicion: inst.variable_medicion,
          rango_operacion: inst.rango_operacion,
          tolerancia_emp: inst.tolerancia_emp,
          frecuencia_calibracion: inst.frecuencia,
          patron_utilizado: inst.patron_habitual,
          fecha_emision: formatFechaDDMMYYYY(new Date()),
          fecha_programada: dtStr,
          fecha_tentativa: formatFechaDDMMYYYY(dtTent),
          dias_tolerancia: tolerancia,
          estado: 'Pendiente',
          fecha_real: '',
          metrologo_laboratorio: inst.metrologo_habitual || tecnicos[0]?.nombre || 'Metrología Interna',
          observaciones: inst.notas || `Programación automática (${MESES_L[occ.mes_n - 1]} ${selectedAnio}).`
        };
        projectedPendientesList.push({
          key: virtualFolio,
          label: `[PROYECTADA ${MESES_L[occ.mes_n - 1]} ${selectedAnio}] ${inst.codigo_inst} - ${inst.nombre} (${dtStr})`,
          isProjectedOnly: true,
          order: virtualOrder,
          mes_n: occ.mes_n
        });
      }
    }
  }

  const closeableCalItems: CloseableCalItem[] = [
    ...pendientesList.map(c => {
      const d = parseFecha(c.fecha_programada || c.fecha_tentativa || c.fecha_emision);
      return {
        key: c.id_ot,
        label: `${c.id_ot} | ${c.instrumento_nombre} | Programada: ${c.fecha_programada} | EMP: ${c.tolerancia_emp}`,
        isProjectedOnly: false,
        order: c,
        mes_n: d ? d.getMonth() + 1 : 1
      };
    }),
    ...projectedPendientesList
  ];

  // Pre-fill fields on selecting an equipment in Emission form
  const handleSelectEquipForCalibration = (code: string) => {
    setFormEqCode(code);
    const eq = equipos.find(e => e.codigo_eq === code);
    if (eq) {
      if (eq.sistema.toLowerCase().includes('hvac') || eq.sistema.toLowerCase().includes('chiller')) {
        setFormNombreInst(`Manómetro Presión Evaporador ${eq.nombre}`);
        setFormVariable('Presión Refrigerante R-134a');
        setFormRango('0 a 300 PSI');
        setFormEMP('± 0.5% FS');
      } else if (eq.sistema.toLowerCase().includes('caldera') || eq.sistema.toLowerCase().includes('vapor')) {
        setFormNombreInst(`Transmisor de Presión Vapor ${eq.nombre}`);
        setFormVariable('Presión de Vapor Saturado');
        setFormRango('0 a 200 PSI');
        setFormEMP('± 0.5% FS');
      } else if (eq.sistema.toLowerCase().includes('neum') || eq.sistema.toLowerCase().includes('compresor')) {
        setFormNombreInst(`Sensor Transmisor Presión Red 4-20mA ${eq.nombre}`);
        setFormVariable('Presión de Aire Comprimido');
        setFormRango('0 a 16 Bar');
        setFormEMP('± 0.25% FS');
      } else {
        setFormNombreInst(`Instrumento de Control ${eq.nombre}`);
        setFormVariable('Presión / Temperatura');
        setFormRango('0 a 100%');
        setFormEMP('± 1.0%');
      }
    }
  };

  const handleEmitirSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombreInst.trim()) {
      addToast('Por favor ingrese el nombre del instrumento.', 'warning');
      return;
    }

    const eqObj = equipos.find(e => e.codigo_eq === formEqCode);
    const clienteName = eqObj?.cliente || (selectedCliente !== 'Todos' ? selectedCliente : 'Planta General');
    const dProg = parseFecha(formFechaProg) || new Date();
    const dTent = parseFecha(formFechaTent) || new Date();
    const hoyStr = formatFechaDDMMYYYY(new Date());

    const folioEmitido = crearOrdenCalibracion({
      codigo_eq: formEqCode || 'INST-GEN',
      cliente: clienteName,
      instrumento_nombre: formNombreInst,
      variable_medicion: formVariable,
      rango_operacion: formRango,
      tolerancia_emp: formEMP,
      frecuencia_calibracion: formFrecuencia,
      fecha_emision: hoyStr,
      fecha_programada: formatFechaDDMMYYYY(dProg),
      fecha_tentativa: formatFechaDDMMYYYY(dTent),
      dias_tolerancia: formTolDias,
      metrologo_laboratorio: formMetrologo,
      observaciones: formObs
    });

    setLastEmittedCalFolio(folioEmitido);
    setFormNombreInst('');
    setFormObs('');
  };

  const handleCierreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCalToClose) {
      addToast('Por favor seleccione la orden de calibración pendiente.', 'warning');
      return;
    }

    const closeItem = closeableCalItems.find(item => item.key === selectedCalToClose);
    if (!closeItem) {
      addToast('No se encontró la orden seleccionada.', 'error');
      return;
    }

    const dReal = parseFecha(cierreFechaReal) || new Date();
    const calMatch = closeItem.order;
    const nextDate = addFrequencyStep(
      dReal,
      calMatch.frecuencia_calibracion || 'Semestral',
      frecuencias,
      dReal.getDate()
    );

    const metrologoFinal = cierreMetrologo || (calMatch.metrologo_laboratorio || 'Metrología Interna');
    const deductedLabels = stockConsumido.length > 0
      ? registrarSalidasStockBatch(
          stockConsumido.map(item => ({ repuesto_id: item.repuestoId, cantidad: item.cantidad })),
          {
            motivo: `Consumo en Calibración Metrológica ${selectedCalToClose}`,
            ot_asociada: closeItem.isProjectedOnly ? undefined : selectedCalToClose,
            equipo_asociado: calMatch.codigo_eq,
            solicitante: metrologoFinal
          }
        )
      : [];

    const repuestosFinal = [...deductedLabels, cierreRepuestos.trim()].filter(Boolean).join(' | ');

    if (closeItem.isProjectedOnly) {
      const { id_ot: _ignore, estado: _st, fecha_real: _fr, ...orderBase } = calMatch;
      certificarCalibracionProyectada(
        {
          ...orderBase,
          mes_objetivo: closeItem.mes_n,
          anio_objetivo: selectedAnio
        },
        {
          fecha_real: formatFechaDDMMYYYY(dReal),
          dictamen: cierreDictamen,
          error_max_hallado: cierreErrorMax,
          patron_utilizado: cierrePatron,
          trazabilidad_patron: cierreTrazabilidad,
          metrologo_laboratorio: metrologoFinal,
          puntos_calibracion: cierrePuntos,
          observaciones: cierreObs,
          repuestos_utilizados: repuestosFinal,
          numero_certificado: cierreCertNo && !cierreCertNo.includes('PROY') ? cierreCertNo : undefined,
          proxima_calibracion: formatFechaDDMMYYYY(nextDate)
        }
      );
    } else {
      cerrarOrdenCalibracion(selectedCalToClose, {
        fecha_real: formatFechaDDMMYYYY(dReal),
        dictamen: cierreDictamen,
        error_max_hallado: cierreErrorMax,
        patron_utilizado: cierrePatron,
        trazabilidad_patron: cierreTrazabilidad,
        metrologo_laboratorio: metrologoFinal,
        puntos_calibracion: cierrePuntos,
        observaciones: cierreObs,
        repuestos_utilizados: repuestosFinal,
        numero_certificado: cierreCertNo || `CAL-CERT-${selectedAnio}-${selectedCalToClose.replace(/CAL-\d+-/g, '')}`,
        proxima_calibracion: formatFechaDDMMYYYY(nextDate)
      });
    }

    setSelectedCalToClose('');
    setCierreObs('');
    setCierreRepuestos('');
    setStockConsumido([]);
    setActiveTab('historial');
  };

  const buildDigitalTargetCAL = (
    cal: OrdenCalibracion,
    extra?: { isProjectedCal?: boolean; mes_n?: number }
  ): DigitalOrderTarget => {
    const eqMatched = equipos.find(
      e => e.codigo_eq === cal.codigo_eq && e.cliente.trim() === cal.cliente.trim()
    ) || equipos.find(e => e.codigo_eq === cal.codigo_eq);
    const dProg = parseFecha(cal.fecha_programada || cal.fecha_tentativa);
    return {
      tipo: 'CAL',
      folio: cal.id_ot,
      cliente: cal.cliente,
      codigoEq: cal.codigo_eq,
      nombreActivo: cal.instrumento_nombre,
      fechaProgramada: cal.fecha_programada,
      mes_n: extra?.mes_n || (dProg ? dProg.getMonth() + 1 : undefined),
      anio: dProg ? dProg.getFullYear() : selectedAnio,
      frecuencia: cal.frecuencia_calibracion,
      tecnicoSugerido: cal.metrologo_laboratorio,
      equipo: eqMatched,
      calibracion: cal,
      isProjectedCal: extra?.isProjectedCal
    };
  };

  const buildPrintableCalDoc = (cal: OrdenCalibracion): PrintableDocument => {
    const eqMatched = equipos.find(
      e => e.codigo_eq === cal.codigo_eq && e.cliente.trim() === cal.cliente.trim()
    ) || equipos.find(e => e.codigo_eq === cal.codigo_eq);
    const eq: Equipo = eqMatched
      ? { ...eqMatched, cliente: cal.cliente }
      : {
          codigo_eq: cal.codigo_eq,
          cliente: cal.cliente,
          nombre: cal.instrumento_nombre,
          sistema: 'Metrología',
          marca: 'Instrumento Industrial',
          modelo: 'N/A',
          frecuencia: cal.frecuencia_calibracion,
          tareas: '',
          tecnico: cal.metrologo_laboratorio,
          fecha_proxima: ''
        };
    return {
      tipo: 'CAL' as const,
      folio: cal.id_ot,
      equipo: eq,
      calibracion: cal,
      isCerrada: cal.estado !== 'Pendiente',
      fechaReal: cal.fecha_real,
      firmaTecnico: cal.firma_tecnico,
      firmaSupervisor: cal.firma_supervisor,
      firmadoPor: cal.firmado_por,
      firmadoSupervisorPor: cal.firmado_supervisor_por,
      fechaFirmaDigital: cal.fecha_firma_digital,
      ejecucionDigital: cal.ejecucion_digital
    };
  };

  const handlePrintCertificate = (cal: OrdenCalibracion) => {
    if (!onPrintCalibration) return;
    onPrintCalibration(buildPrintableCalDoc(cal));
  };

  const handlePrintBatchCalibraciones = (orders: OrdenCalibracion[]) => {
    if (!onPrintBatchCalibration || orders.length === 0) return;
    onPrintBatchCalibration(orders.map(buildPrintableCalDoc));
  };

  // Projected occurrence lookup in selectedAnio using the real-date anchored engine
  const getProjectedOccInMonth = (inst: Instrumento, mes: number, anioTarget: number) => {
    const occurs = calcularOcurrenciasInstrumento(inst, anioTarget, frecuencias, calibracionesCliente);
    return occurs.find(o => o.mes_n === mes);
  };

  // Reset transient feedback only when user switches month, year or plant
  useEffect(() => {
    setLastBatchFolios([]);
  }, [selectedMesEmit, selectedAnio, selectedCliente]);

  // Sync batch defaults & pre-selected instruments when selectedMesEmit, selectedAnio, selectedCliente or data changes
  useEffect(() => {
    const mm = String(selectedMesEmit).padStart(2, '0');
    setBatchFechaProg(`${selectedAnio}-${mm}-15`);
    setBatchFechaTent(`${selectedAnio}-${mm}-22`);

    const instsInClient = selectedCliente === 'Todos'
      ? instrumentos.filter(i => i.estado === 'Activo')
      : instrumentos.filter(i => i.estado === 'Activo' && i.cliente.trim() === selectedCliente.trim());

    const calsInClient = selectedCliente === 'Todos'
      ? calibraciones
      : calibraciones.filter(c => c.cliente.trim() === selectedCliente.trim());

    const emittedSet = new Set(
      calsInClient
        .filter(ord => {
          const d = parseFecha(ord.fecha_programada || ord.fecha_tentativa || ord.fecha_emision);
          return d && d.getFullYear() === selectedAnio && (d.getMonth() + 1) === selectedMesEmit;
        })
        .map(ord => ord.codigo_eq.trim().toUpperCase())
    );

    const dueCodes = instsInClient
      .filter(inst => !emittedSet.has(inst.codigo_inst.trim().toUpperCase()))
      .filter(inst => {
        const occurs = calcularOcurrenciasInstrumento(inst, selectedAnio, frecuencias, calsInClient);
        return occurs.some(o => o.mes_n === selectedMesEmit);
      })
      .map(inst => inst.codigo_inst);

    setSelectedBatchInsts(dueCodes);
  }, [selectedMesEmit, selectedAnio, selectedCliente, instrumentos, calibraciones, frecuencias]);

  const handleEmitirLoteMes = (e: React.FormEvent) => {
    e.preventDefault();
    const targetInsts = instrumentosActivos.filter(i => selectedBatchInsts.includes(i.codigo_inst));
    if (targetInsts.length === 0) {
      addToast('Seleccione al menos un instrumento activo para emitir las órdenes del mes.', 'warning');
      return;
    }

    const dProgBatch = parseFecha(batchFechaProg) || new Date(selectedAnio, selectedMesEmit - 1, 15);
    const dTentBatch = parseFecha(batchFechaTent) || new Date(selectedAnio, selectedMesEmit - 1, 22);
    const leadDays = Math.max(1, Math.round((dTentBatch.getTime() - dProgBatch.getTime()) / (1000 * 60 * 60 * 24)));
    const hoyStr = formatFechaDDMMYYYY(new Date());

    const payload = targetInsts.map(inst => {
      const projOcc = getProjectedOccInMonth(inst, selectedMesEmit, selectedAnio);
      const useProj = respectProjectedDates && !!projOcc;
      const dProg = useProj ? projOcc!.fecha : dProgBatch;
      const dTent = useProj ? new Date(dProg.getFullYear(), dProg.getMonth(), dProg.getDate() + leadDays) : dTentBatch;

      return {
        codigo_eq: inst.codigo_inst,
        cliente: inst.cliente,
        instrumento_nombre: inst.nombre,
        variable_medicion: inst.variable_medicion,
        rango_operacion: inst.rango_operacion,
        tolerancia_emp: inst.tolerancia_emp,
        frecuencia_calibracion: inst.frecuencia,
        patron_utilizado: inst.patron_habitual,
        fecha_emision: hoyStr,
        fecha_programada: formatFechaDDMMYYYY(dProg),
        fecha_tentativa: formatFechaDDMMYYYY(dTent),
        dias_tolerancia: batchTolDias,
        metrologo_laboratorio: inst.metrologo_habitual || batchMetrologoDefault || 'Metrología Interna',
        observaciones: inst.notas || `Emisión mensual programada (${MESES_L[selectedMesEmit - 1]} ${selectedAnio}).`,
        mes_objetivo: selectedMesEmit,
        anio_objetivo: selectedAnio
      };
    });

    const creadas = crearOrdenesCalibracionLote(payload);
    setLastBatchFolios(creadas.map(c => c.id_ot));
    setSelectedBatchInsts([]);
  };

  // BUILD ANNUAL CALIBRATION PLAN MATRIX (Same structure and real-date projection as Maintenance Master Plan)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const toFullDateDDMMYYYY = (dtStr: string): string => {
    if (!dtStr) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dtStr)) return dtStr;
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(dtStr)) {
      const p = dtStr.split('/');
      return `${p[0]}/${p[1]}/20${p[2]}`;
    }
    if (/^\d{1,2}\/\d{1,2}$/.test(dtStr)) {
      const p = dtStr.split('/');
      return `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}/${selectedAnio}`;
    }
    const d = parseFecha(dtStr);
    if (d && !isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear() || selectedAnio;
      return `${day}/${month}/${year}`;
    }
    return dtStr;
  };

  const toShortId = (fullId: string): string => {
    if (!fullId) return '';
    if (fullId.startsWith('CAL-CERT-')) {
      const last = fullId.split('-').pop() || '';
      return `CAL-${last}`;
    }
    if (fullId.startsWith('CAL-')) {
      const parts = fullId.split('-');
      const last = parts[parts.length - 1];
      return `CAL-${last}`;
    }
    if (fullId.startsWith('MP-')) {
      const parts = fullId.split('-');
      const last = parts[parts.length - 1];
      return `MP-${last}`;
    }
    return fullId;
  };

  interface CalMatrixRow {
    codigo: string;
    cliente: string;
    nombre: string;
    variable: string;
    rango: string;
    emp: string;
    frecuencia: string;
    rowPrevista: Record<string, string>;
    rowReal: Record<string, string>;
    rowCertificado: Record<string, string>;
    rowCertificadoShort: Record<string, string>;
    rowDictamen: Record<string, string>;
    rowStatus: Record<string, 'conforme_a_tiempo' | 'conforme_fuera' | 'no_conforme' | 'vencida' | 'programada' | 'vacio'>;
    matchOrders: Record<string, { order: OrdenCalibracion; isProjectedOnly: boolean; mes_n: number }>;
  }

  // Filtered list of instruments for the Padrón tab
  const instrumentosListado = instrumentosCliente.filter(inst => {
    const matchesEstado = instFilterEstado === 'Todos' || inst.estado === instFilterEstado;
    const q = instSearchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      inst.codigo_inst.toLowerCase().includes(q) ||
      inst.nombre.toLowerCase().includes(q) ||
      (inst.marca && inst.marca.toLowerCase().includes(q)) ||
      (inst.modelo && inst.modelo.toLowerCase().includes(q)) ||
      (inst.numero_serie && inst.numero_serie.toLowerCase().includes(q)) ||
      (inst.ubicacion && inst.ubicacion.toLowerCase().includes(q)) ||
      (inst.equipo_asociado && inst.equipo_asociado.toLowerCase().includes(q));
    return matchesEstado && matchesSearch;
  });

  // Instrument Catalog Handlers
  const handleOpenCreateInst = () => {
    setInstModalMode('create');
    setEditingInstCodigo(null);
    const nextNum = instrumentos.length + 1;
    setFInstCodigo(`INST-${String(nextNum).padStart(2, '0')}`);
    setFInstNombre('');
    setFInstCliente(selectedCliente === 'Todos' ? (clientes[0]?.nombre || '') : selectedCliente);
    setFInstEquipoAsoc(equipos[0]?.codigo_eq || '');
    setFInstVariable('Presión Hidráulica / Neumática');
    setFInstRango('0 a 300 PSI');
    setFInstEMP('± 0.5% FS');
    setFInstFrecuencia('Semestral');
    setFInstFechaInicio(new Date().toISOString().slice(0, 10));
    setFInstMarca('');
    setFInstModelo('');
    setFInstSerie('');
    setFInstUbicacion('');
    setFInstPatron('Balanza de Pesos Muertos / Calibrador Patrón');
    setFInstMetrologo(tecnicos[0]?.nombre || 'Metrología Interna');
    setFInstNotas('');
  };

  const handleOpenEditInst = (inst: Instrumento) => {
    setInstModalMode('edit');
    setEditingInstCodigo(inst.codigo_inst);
    setFInstCodigo(inst.codigo_inst);
    setFInstNombre(inst.nombre);
    setFInstCliente(inst.cliente);
    setFInstEquipoAsoc(inst.equipo_asociado || '');
    setFInstVariable(inst.variable_medicion);
    setFInstRango(inst.rango_operacion);
    setFInstEMP(inst.tolerancia_emp);
    setFInstFrecuencia(inst.frecuencia);
    const altaParsed = parseFecha(inst.fecha_alta);
    setFInstFechaInicio(inst.fecha_proxima || (altaParsed ? formatFechaYYYYMMDD(altaParsed) : new Date().toISOString().slice(0, 10)));
    setFInstMarca(inst.marca || '');
    setFInstModelo(inst.modelo || '');
    setFInstSerie(inst.numero_serie || '');
    setFInstUbicacion(inst.ubicacion || '');
    setFInstPatron(inst.patron_habitual || '');
    setFInstMetrologo(inst.metrologo_habitual || '');
    setFInstNotas(inst.notas || '');
  };

  const handleSubmitInst = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fInstNombre.trim()) {
      addToast('Por favor ingrese el nombre del instrumento.', 'warning');
      return;
    }
    if (!fInstCodigo.trim()) {
      addToast('Por favor ingrese el código del instrumento.', 'warning');
      return;
    }
    if (!fInstFechaInicio) {
      addToast('Por favor indique la fecha de inicio / primera calibración.', 'warning');
      return;
    }

    const codNorm = fInstCodigo.trim().toUpperCase();

    if (instModalMode === 'create') {
      if (instrumentos.some(i => i.codigo_inst.trim().toUpperCase() === codNorm)) {
        addToast(`Ya existe un instrumento con el código ${codNorm}. Por favor especifique un código único.`, 'warning');
        return;
      }

      const nuevo: Instrumento = {
        codigo_inst: codNorm,
        nombre: fInstNombre.trim(),
        cliente: fInstCliente || (selectedCliente !== 'Todos' ? selectedCliente : (clientes[0]?.nombre || '')),
        equipo_asociado: fInstEquipoAsoc.trim() || undefined,
        variable_medicion: fInstVariable.trim(),
        rango_operacion: fInstRango.trim(),
        tolerancia_emp: fInstEMP.trim(),
        frecuencia: fInstFrecuencia.trim(),
        marca: fInstMarca.trim() || undefined,
        modelo: fInstModelo.trim() || undefined,
        numero_serie: fInstSerie.trim() || undefined,
        ubicacion: fInstUbicacion.trim() || undefined,
        estado: 'Activo',
        fecha_alta: formatFechaDDMMYYYY(new Date()),
        fecha_proxima: fInstFechaInicio,
        patron_habitual: fInstPatron.trim() || undefined,
        metrologo_habitual: fInstMetrologo.trim() || undefined,
        notas: fInstNotas.trim() || undefined
      };

      addInstrumento(nuevo);
    } else if (instModalMode === 'edit' && editingInstCodigo) {
      const existing = instrumentos.find(i => i.codigo_inst === editingInstCodigo);
      if (existing) {
        const actualizado: Instrumento = {
          ...existing,
          codigo_inst: codNorm,
          nombre: fInstNombre.trim(),
          cliente: fInstCliente || existing.cliente,
          equipo_asociado: fInstEquipoAsoc.trim() || undefined,
          variable_medicion: fInstVariable.trim(),
          rango_operacion: fInstRango.trim(),
          tolerancia_emp: fInstEMP.trim(),
          frecuencia: fInstFrecuencia.trim(),
          fecha_proxima: fInstFechaInicio,
          marca: fInstMarca.trim() || undefined,
          modelo: fInstModelo.trim() || undefined,
          numero_serie: fInstSerie.trim() || undefined,
          ubicacion: fInstUbicacion.trim() || undefined,
          patron_habitual: fInstPatron.trim() || undefined,
          metrologo_habitual: fInstMetrologo.trim() || undefined,
          notas: fInstNotas.trim() || undefined
        };
        updateInstrumento(editingInstCodigo, actualizado);
      }
    }

    setInstModalMode(null);
    setEditingInstCodigo(null);
  };

  const handleOpenBaja = (inst: Instrumento) => {
    setBajaModalInst(inst);
    setBajaFecha(new Date().toISOString().slice(0, 10));
    setBajaMotivo('');
  };

  const handleConfirmBaja = () => {
    if (!bajaModalInst) return;
    if (!bajaMotivo.trim()) {
      addToast('Por favor ingrese el motivo técnico para la baja del instrumento.', 'warning');
      return;
    }
    const fParsed = parseFecha(bajaFecha);
    const fStr = fParsed ? formatFechaDDMMYYYY(fParsed) : formatFechaDDMMYYYY(new Date());
    darDeBajaInstrumento(bajaModalInst.codigo_inst, fStr, bajaMotivo.trim());
    setBajaModalInst(null);
    setBajaMotivo('');
  };

  const handleReactivar = async (codigo_inst: string) => {
    const confirmed = await confirmAction({
      title: 'Reactivar Instrumento',
      message: `¿Confirma reactivar el instrumento ${codigo_inst} a servicio activo en el plan?`,
      confirmText: 'Sí, Reactivar',
      tone: 'info'
    });
    if (confirmed) {
      reactivarInstrumento(codigo_inst);
    }
  };

  const handleDeleteInst = async (codigo_inst: string, nombre: string) => {
    const confirmed = await confirmAction({
      title: 'Eliminar Instrumento',
      message: `¿Confirma eliminar permanentemente el instrumento "${nombre}" (${codigo_inst}) del padrón?`,
      confirmText: 'Sí, Eliminar',
      tone: 'danger'
    });
    if (confirmed) {
      deleteInstrumento(codigo_inst);
    }
  };

  const handleEmitirParaInstrumento = (inst: Instrumento) => {
    setFormEqCode(inst.codigo_inst);
    setFormNombreInst(inst.nombre);
    setFormVariable(inst.variable_medicion);
    setFormRango(inst.rango_operacion);
    setFormEMP(inst.tolerancia_emp);
    setFormFrecuencia(inst.frecuencia);
    if (inst.metrologo_habitual) setFormMetrologo(inst.metrologo_habitual);
    if (inst.notas) setFormObs(inst.notas);
    setActiveTab('emision');
  };

  // The Annual Calibration Plan is driven automatically from Active Instruments (fecha_proxima + frecuencia + last fecha_real)
  // merged with emitted/closed OrdenCalibracion records for selectedAnio (exact parity with MP Master Plan).
  const calProjMonthSeq: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    const prefix = `CAL-${selectedAnio}-${String(m).padStart(2, '0')}-`;
    calProjMonthSeq[m] = calibracionesCliente.filter(c => c.id_ot.startsWith(prefix)).length + 1;
  }

  const planCalibracionRows: CalMatrixRow[] = instrumentosActivos.map(inst => {
    const occurs = calcularOcurrenciasInstrumento(inst, selectedAnio, frecuencias, calibracionesCliente);

    const rPrev: Record<string, string> = { ID: inst.codigo_inst, Instrumento: inst.nombre, Variable: inst.variable_medicion, Rango: inst.rango_operacion, Detalle: 'Fecha Programada' };
    const rReal: Record<string, string> = { ID: '', Instrumento: '', Variable: '', Rango: '', Detalle: 'Fecha Calibrada' };
    const rCert: Record<string, string> = { ID: '', Instrumento: '', Variable: '', Rango: '', Detalle: 'N° Certificado / Folio' };
    const rCertShort: Record<string, string> = {};
    const rDict: Record<string, string> = { ID: '', Instrumento: '', Variable: '', Rango: '', Detalle: 'Dictamen / Error' };
    const rStat: Record<string, 'conforme_a_tiempo' | 'conforme_fuera' | 'no_conforme' | 'vencida' | 'programada' | 'vacio'> = {};
    const matchOrders: Record<string, { order: OrdenCalibracion; isProjectedOnly: boolean; mes_n: number }> = {};

    for (let mIdx = 1; mIdx <= 12; mIdx++) {
      const mLabel = MESES_L[mIdx - 1];
      const occ = occurs.find(o => o.mes_n === mIdx);

      if (occ) {
        if (occ.ordenMatch) {
          const match = occ.ordenMatch;
          matchOrders[mLabel] = { order: match, isProjectedOnly: false, mes_n: mIdx };
          rPrev[mLabel] = toFullDateDDMMYYYY(match.fecha_programada || match.fecha_tentativa || '');
          rCert[mLabel] = match.id_ot || match.numero_certificado || '';
          rCertShort[mLabel] = toShortId(rCert[mLabel]);

          if (match.estado === 'Pendiente') {
            rReal[mLabel] = '';
            rDict[mLabel] = 'Pendiente';
            const dtTent = parseFecha(match.fecha_tentativa || match.fecha_programada);
            if (dtTent && dtTent.getTime() < hoy.getTime()) {
              rStat[mLabel] = 'vencida';
            } else {
              rStat[mLabel] = 'programada';
            }
          } else {
            rReal[mLabel] = toFullDateDDMMYYYY(match.fecha_real || '');
            rDict[mLabel] = match.dictamen ? `${match.dictamen} (${match.error_max_hallado || ''})` : 'Conforme';

            if (match.dictamen === 'No Conforme') {
              rStat[mLabel] = 'no_conforme';
            } else if (match.estado.includes('Fuera de término')) {
              rStat[mLabel] = 'conforme_fuera';
            } else {
              rStat[mLabel] = 'conforme_a_tiempo';
            }
          }
        } else {
          // Projected occurrence not yet formally emitted
          const seqNum = calProjMonthSeq[mIdx]++;
          const provisionalFolio = `CAL-${selectedAnio}-${String(mIdx).padStart(2, '0')}-${String(seqNum).padStart(4, '0')}`;
          const dtProgStr = formatFechaDDMMYYYY(occ.fecha);
          const { tolerancia } = obtenerFrecuenciaConfig(inst.frecuencia, frecuencias);
          const dtTent = new Date(occ.fecha);
          dtTent.setDate(dtTent.getDate() + Math.max(3, Math.min(7, tolerancia)));
          const dtTentStr = formatFechaDDMMYYYY(dtTent);

          const virtualOrder: OrdenCalibracion = {
            id_ot: provisionalFolio,
            codigo_eq: inst.codigo_inst,
            cliente: inst.cliente,
            instrumento_nombre: inst.nombre,
            variable_medicion: inst.variable_medicion,
            rango_operacion: inst.rango_operacion,
            tolerancia_emp: inst.tolerancia_emp,
            frecuencia_calibracion: inst.frecuencia,
            patron_utilizado: inst.patron_habitual,
            fecha_emision: formatFechaDDMMYYYY(new Date()),
            fecha_programada: dtProgStr,
            fecha_tentativa: dtTentStr,
            dias_tolerancia: tolerancia,
            estado: 'Pendiente',
            fecha_real: '',
            metrologo_laboratorio: inst.metrologo_habitual || tecnicos[0]?.nombre || 'Metrología Interna',
            observaciones: inst.notas || `Programación automática (${inst.frecuencia} - ${MESES_L[mIdx - 1]} ${selectedAnio}).`
          };

          matchOrders[mLabel] = { order: virtualOrder, isProjectedOnly: true, mes_n: mIdx };
          rPrev[mLabel] = dtProgStr;
          rReal[mLabel] = '';
          rCert[mLabel] = provisionalFolio;
          rCertShort[mLabel] = toShortId(provisionalFolio);
          rDict[mLabel] = 'Proyectada';
          const prevD = new Date(occ.fecha);
          prevD.setHours(0, 0, 0, 0);
          rStat[mLabel] = prevD.getTime() < hoy.getTime() ? 'vencida' : 'programada';
        }
      } else {
        rPrev[mLabel] = '';
        rReal[mLabel] = '';
        rCert[mLabel] = '';
        rCertShort[mLabel] = '';
        rDict[mLabel] = '';
        rStat[mLabel] = 'vacio';
      }
    }

    return {
      codigo: inst.codigo_inst,
      cliente: inst.cliente,
      nombre: inst.nombre,
      variable: inst.variable_medicion,
      rango: inst.rango_operacion,
      emp: inst.tolerancia_emp,
      frecuencia: inst.frecuencia,
      rowPrevista: rPrev,
      rowReal: rReal,
      rowCertificado: rCert,
      rowCertificadoShort: rCertShort,
      rowDictamen: rDict,
      rowStatus: rStat,
      matchOrders
    };
  });

  // Paginate instruments in chunks of 8 so instruments fit comfortably per A4 landscape page without unnecessary breaks
  const ITEMS_PER_PAGE_CAL = 8;
  const totalPagesCal = Math.max(1, Math.ceil(planCalibracionRows.length / ITEMS_PER_PAGE_CAL));
  const pagedCalibracionRows: (typeof planCalibracionRows)[] = [];
  for (let i = 0; i < totalPagesCal; i++) {
    pagedCalibracionRows.push(planCalibracionRows.slice(i * ITEMS_PER_PAGE_CAL, (i + 1) * ITEMS_PER_PAGE_CAL));
  }

  const handleDownloadPlanPDF = async () => {
    if (!planCalibPrintRef.current) return;
    try {
      setIsGeneratingPDF(true);
      addToast('Generando documento PDF oficial del Plan de Calibración...', 'info');
      await exportElementToPDF(
        planCalibPrintRef.current,
        `Plan_Calibracion_Anual_${selectedAnio}_${selectedCliente.replace(/\s+/g, '_')}`,
        'landscape'
      );
      addToast('Plan de Calibración descargado como PDF exitosamente.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Error al generar el PDF de calibración. Intente nuevamente.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrintPlan = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('window.print() prevented, fallback to PDF download', err);
      handleDownloadPlanPDF();
    }
  };

  return (
    <div className="space-y-6">
      <div className={showInstListadoModal ? 'space-y-6 no-print' : 'space-y-6'}>
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-indigo-600" />
            Plan & Certificación de Calibración Metrológica
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Control de instrumentos de medición, cronograma anual de calibración, patrones de referencia y emisión de certificados ISO/IEC 17025.
          </p>
        </div>

        {/* Navigation Subtabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'plan'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Plan Anual {selectedAnio}
          </button>
          <button
            onClick={() => setActiveTab('instrumentos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'instrumentos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Padrón de Instrumentos</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === 'instrumentos' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-slate-200 text-slate-700'
            }`}>
              {instrumentosActivos.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('emision')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'emision'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Emitir Orden (CAL)
          </button>
          <button
            onClick={() => setActiveTab('cierre')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'cierre'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cerrar & Certificar ({closeableCalItems.length})
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'historial'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Certificados ({cerradasList.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PLAN ANUAL DE CALIBRACIÓN (FORMATO EXACTO PLAN MAESTRO) */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* Controls & Legend */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs no-print">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-bold text-slate-800">
                Plan Matriz de Calibración {selectedAnio} ({planCalibracionRows.length} instrumentos bajo control metrológico)
              </span>
              <select
                value={selectedAnio}
                onChange={(e) => setSelectedAnio(Number(e.target.value))}
                className="bg-indigo-50 border border-indigo-200 rounded-lg py-1 px-2.5 text-xs font-bold text-indigo-900 focus:outline-none"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    Año {yr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Conforme
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Fuera de Fecha
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> No Conforme / Vencido
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300"></span> Programado
                </span>
              </div>

              {canPrint && (
                <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                  <button
                    onClick={handleDownloadPlanPDF}
                    disabled={isGeneratingPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    <span>{isGeneratingPDF ? 'Generando PDF...' : 'Descargar PDF'}</span>
                  </button>
                  <button
                    onClick={handlePrintPlan}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Plan</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Official Calibration Multi-Sheet Paginated Document */}
          <div ref={planCalibPrintRef} className="space-y-8 print-container">
            {planCalibracionRows.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                No hay instrumentos programados en el Plan de Calibración {selectedAnio} para esta planta.
              </div>
            ) : (
              pagedCalibracionRows.map((chunk, pageIdx) => {
                return (
                  <div
                    key={`page_cal_${pageIdx}`}
                    className="print-sheet bg-white rounded-xl border border-slate-300 p-5 sm:p-6 space-y-4 shadow-sm flex flex-col justify-between min-h-[690px]"
                  >
                    <div className="space-y-4">
                    {/* Sheet Header with Prodexus & Client Logo */}
                    {(() => {
                      const sheetClientes = resolveSheetClientes(
                        clientes,
                        selectedCliente,
                        chunk.map(r => r.cliente)
                      );
                      const plantLabel =
                        selectedCliente.trim().toLowerCase() === 'todos' && sheetClientes.length === 1
                          ? sheetClientes[0].nombre
                          : selectedCliente;
                      return (
                        <div className="border-b border-slate-900 pb-2.5 flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 max-w-[155px] bg-white rounded-lg border border-indigo-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                              <img
                                src="/assets/aistudio/prodexus_921c729e.jpeg"
                                alt="Prodexus Metrología"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            {sheetClientes.map(cli =>
                              cli.logo ? (
                                <div
                                  key={cli.codigo}
                                  className="h-12 max-w-[150px] bg-white rounded-lg border border-indigo-200 p-1 flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  <img
                                    src={cli.logo}
                                    alt={`Logo ${cli.nombre}`}
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                              ) : (
                                <div
                                  key={cli.codigo}
                                  className="h-12 max-w-[160px] bg-indigo-950 text-white rounded-lg border border-indigo-800 px-2.5 flex flex-col justify-center shrink-0 shadow-2xs"
                                >
                                  <span className="text-[9px] font-black uppercase tracking-tight leading-tight line-clamp-2">
                                    {cli.nombre}
                                  </span>
                                  {cli.rut && (
                                    <span className="text-[7px] font-mono text-indigo-200">{cli.rut}</span>
                                  )}
                                </div>
                              )
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[7.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                  SISTEMA METROLÓGICO ISO/IEC 17025
                                </span>
                                <span className="text-[8px] font-mono text-slate-500 font-bold">
                                  DOC-MET-CAL{String(selectedAnio).slice(-2)} (Rev. 03)
                                </span>
                              </div>
                              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-tight text-slate-900 mt-0.5">
                                PRODEXUS Metrología Industrial · Plan Anual de Calibración {selectedAnio}
                              </h2>
                              <p className="text-[9px] text-slate-600 font-medium mt-0.5">
                                Planta: <span className="font-bold text-slate-900">{plantLabel.toUpperCase()}</span> · Emisión: <span className="font-mono">{new Date().toLocaleDateString('es-ES')}</span> · Control de Instrumentación Crítica
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="inline-block bg-indigo-900 text-white font-mono font-bold text-[8.5px] px-2 py-0.5 rounded shadow-xs">
                              HOJA {pageIdx + 1} DE {totalPagesCal}
                            </div>
                            <p className="text-[8px] text-slate-500 font-medium mt-0.5">
                              Instrumentos en hoja: {chunk.length} (Total: {planCalibracionRows.length})
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Table with ALL 12 MONTHS (Full Width, Table-Fixed for exact alignment) */}
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-xs border-collapse table-fixed">
                        <thead className="bg-slate-900 text-white font-bold text-[7.5px] uppercase tracking-wider">
                          <tr>
                            <th className="py-1 px-1 border-r border-slate-700 w-[8%] text-center">ID</th>
                            <th className="py-1 px-1.5 border-r border-slate-700 w-[17%]">Instrumento</th>
                            <th className="py-1 px-0.5 border-r border-slate-700 w-[5%] text-center">Detalle</th>
                            {MESES_L.map(m => (
                              <th key={m} className="py-1 px-0.5 text-center border-r border-slate-700 w-[5.83%] text-[7.5px]">
                                {m}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {chunk.map((instRow, idx) => {
                            return (
                              <React.Fragment key={`${instRow.codigo}_${idx}`}>
                                {/* Row 1: Fecha Programada */}
                                <tr className="border-t-2 border-slate-300 font-semibold text-slate-900">
                                  <td
                                    rowSpan={3}
                                    className="py-1 px-1 text-center font-mono border-r border-slate-200 align-top pt-1.5 bg-slate-100/70"
                                  >
                                    <div
                                      className="font-mono font-bold text-slate-900 text-[7px] tracking-tighter leading-tight whitespace-nowrap"
                                      title={instRow.codigo}
                                    >
                                      {instRow.codigo}
                                    </div>
                                  </td>
                                  <td
                                    rowSpan={3}
                                    className="py-1 px-1.5 border-r border-slate-200 align-top pt-1 bg-white"
                                  >
                                    <div
                                      className="font-semibold text-slate-900 text-[7.5px] leading-snug line-clamp-2"
                                      title={instRow.nombre}
                                    >
                                      {instRow.nombre}
                                    </div>
                                  </td>
                                  <td className="py-0.5 px-0.5 text-slate-600 border-r border-slate-200 font-medium text-[7px] bg-slate-50 text-center whitespace-nowrap">
                                    Prog.
                                  </td>
                                  {MESES_L.map((m) => {
                                    const dateVal = instRow.rowPrevista[m];
                                    const status = instRow.rowStatus[m];
                                    const matchOrder = instRow.matchOrders[m];

                                    let statusBg = 'bg-slate-50/50';
                                    if (status === 'conforme_a_tiempo') statusBg = 'bg-emerald-50 text-emerald-800 font-bold';
                                    else if (status === 'conforme_fuera') statusBg = 'bg-amber-50 text-amber-800 font-bold';
                                    else if (status === 'no_conforme') statusBg = 'bg-rose-100 text-rose-900 font-bold';
                                    else if (status === 'vencida') statusBg = 'bg-rose-50 text-rose-800 font-bold';
                                    else if (status === 'programada') statusBg = 'bg-indigo-50/70 text-indigo-900 font-semibold';

                                    return (
                                      <td
                                        key={m}
                                        onClick={() => matchOrder && setSelectedCellInfo(matchOrder)}
                                        title={dateVal || ''}
                                        className={`py-0.5 px-0.5 text-center font-mono border-r border-slate-200 tabular-nums cursor-pointer transition-colors hover:brightness-95 whitespace-nowrap ${statusBg}`}
                                      >
                                        <span className="font-mono font-bold text-[6.5px] tracking-tighter block leading-none">
                                          {dateVal || '-'}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </tr>

                                {/* Row 2: Fecha Realizada */}
                                <tr className="text-slate-700 text-[10px]">
                                  <td className="py-0.5 px-0.5 text-slate-500 border-r border-slate-200 font-normal text-[7px] bg-white text-center whitespace-nowrap">
                                    Real.
                                  </td>
                                  {MESES_L.map(m => {
                                    const realVal = instRow.rowReal[m];
                                    return (
                                      <td
                                        key={m}
                                        title={realVal || ''}
                                        className="py-0.5 px-0.5 text-center font-mono border-r border-slate-200 tabular-nums font-semibold text-emerald-700 bg-white whitespace-nowrap"
                                      >
                                        <span className="font-mono font-semibold text-[6.5px] tracking-tighter block leading-none">
                                          {realVal || '-'}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </tr>

                                {/* Row 3: ID de MP */}
                                <tr className="text-slate-600 text-[10px]">
                                  <td className="py-0.5 px-0.5 text-slate-500 border-r border-slate-200 font-normal text-[7px] bg-slate-50/30 text-center whitespace-nowrap">
                                    Orden
                                  </td>
                                  {MESES_L.map(m => {
                                    const fullCert = instRow.rowCertificado[m];
                                    const shortCert = instRow.rowCertificadoShort[m] || fullCert;
                                    return (
                                      <td
                                        key={m}
                                        title={fullCert || ''}
                                        className="py-0.5 px-0.5 text-center font-mono border-r border-slate-200 tabular-nums text-slate-700 bg-slate-50/30 font-semibold whitespace-nowrap"
                                      >
                                        <span className="font-mono text-[6.5px] tracking-tighter block leading-none">
                                          {shortCert || '-'}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    </div>

              {/* Official Per-Sheet Sign-Off Block for Metrology ISO Audit */}
              <div className="mt-auto pt-2 border-t border-slate-300 text-xs text-slate-600">
                <div className="grid grid-cols-3 gap-6">
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold text-[8px] text-slate-900 uppercase">RESPONSABLE DE METROLOGÍA:</p>
                    <p className="text-[7.5px] text-slate-400 mt-0.5">Firma: ___________________________</p>
                    <p className="text-[7.5px] text-slate-700 font-semibold mt-0.5">Ing. Encargado de Calibración</p>
                    <p className="text-[7px] text-slate-400">Patrones & Trazabilidad (ISO 17025)</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold text-[8px] text-slate-900 uppercase">ASEGURAMIENTO DE CALIDAD:</p>
                    <p className="text-[7.5px] text-slate-400 mt-0.5">Firma: ___________________________</p>
                    <p className="text-[7.5px] text-slate-700 font-semibold mt-0.5">Jefe de Gestión de Calidad</p>
                    <p className="text-[7px] text-slate-400">Conformidad de Tolerancias (EMP)</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold text-[8px] text-slate-900 uppercase">GERENCIA DE OPERACIONES:</p>
                    <p className="text-[7.5px] text-slate-400 mt-0.5">Firma: ___________________________</p>
                    <p className="text-[7.5px] text-slate-700 font-semibold mt-0.5">Dirección Técnica de Planta</p>
                    <p className="text-[7px] text-slate-400">Autorización Operacional de Instrumentos</p>
                  </div>
                </div>

                {/* ISO 17025 Compliance & Page Footer */}
                <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[7.5px] text-slate-400 font-mono">
                  <span>ISO/IEC 17025:2017 & ISO 9001:2015 Cláusula 7.1.5 · Trazabilidad Metrológica Nacional/Internacional</span>
                  <span className="font-bold text-slate-700">Página {pageIdx + 1} de {totalPagesCal}</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
)}

      {/* TAB: PADRÓN DE INSTRUMENTOS (METROLOGÍA ISO/IEC 17025) */}
      {activeTab === 'instrumentos' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Total Instrumentos</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{instrumentosCliente.length}</p>
                <span className="text-[11px] text-slate-500">Padrón metrológico registrado</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <Gauge className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Activos en Servicio</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{instrumentosActivos.length}</p>
                <span className="text-[11px] text-emerald-700 font-medium">Incluidos en Plan Anual {selectedAnio}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Dados de Baja / Retirados</span>
                <p className="text-2xl font-black text-rose-600 mt-1">{instrumentosBaja.length}</p>
                <span className="text-[11px] text-rose-600 font-medium">Fuera de servicio con trazabilidad</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                <AlertOctagon className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">Calibraciones {selectedAnio}</span>
                <p className="text-2xl font-black text-indigo-700 mt-1">
                  {calibracionesCliente.filter(c => {
                    const d = parseFecha(c.fecha_programada || c.fecha_real || c.fecha_emision);
                    return d && d.getFullYear() === selectedAnio;
                  }).length}
                </p>
                <span className="text-[11px] text-slate-500">Órdenes y certificados ({calibracionesCliente.length} hist.)</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action and Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre, marca, serie..."
                  value={instSearchQuery}
                  onChange={(e) => setInstSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>

              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setInstFilterEstado('Activo')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    instFilterEstado === 'Activo'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Activos ({instrumentosActivos.length})
                </button>
                <button
                  onClick={() => setInstFilterEstado('Baja')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    instFilterEstado === 'Baja'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dados de Baja ({instrumentosBaja.length})
                </button>
                <button
                  onClick={() => setInstFilterEstado('Todos')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    instFilterEstado === 'Todos'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({instrumentosCliente.length})
                </button>
              </div>
            </div>

            {(canPrint || canEdit) && (
              <div className="flex items-center gap-2">
                {canPrint && (
                  <button
                    type="button"
                    onClick={() => setShowInstListadoModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Emitir Listado</span>
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={handleOpenCreateInst}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ingresar Instrumento</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Instruments Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-200 uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Instrumento / Modelo</th>
                    <th className="py-2.5 px-3">Planta / Equipo</th>
                    <th className="py-2.5 px-3">Variable & Rango</th>
                    <th className="py-2.5 px-3">Tolerancia (EMP)</th>
                    <th className="py-2.5 px-3">Frecuencia</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {instrumentosListado.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Gauge className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No se encontraron instrumentos con los filtros seleccionados.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Haga clic en "Ingresar Instrumento" para dar de alta uno nuevo en el padrón.</p>
                      </td>
                    </tr>
                  ) : (
                    instrumentosListado.map((inst) => {
                      const isActivo = inst.estado === 'Activo';
                      return (
                        <tr
                          key={inst.codigo_inst}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !isActivo ? 'bg-rose-50/25 opacity-90' : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                            <span className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                              {inst.codigo_inst}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 leading-snug">{inst.nombre}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                              {inst.marca && <span>Marca: <strong className="text-slate-700">{inst.marca}</strong></span>}
                              {inst.modelo && <span>· Modelo: {inst.modelo}</span>}
                              {inst.numero_serie && <span>· S/N: <span className="font-mono">{inst.numero_serie}</span></span>}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">{inst.cliente}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {inst.equipo_asociado ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  Equipo: {inst.equipo_asociado}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Sin equipo vinculado</span>
                              )}
                              {inst.ubicacion && <span className="ml-1 text-[10px]">· {inst.ubicacion}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-900">{inst.variable_medicion}</div>
                            <div className="font-mono text-[11px] text-slate-500 mt-0.5">Rango: {inst.rango_operacion}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10.5px]">
                              {inst.tolerancia_emp}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700">
                            <div>{inst.frecuencia}</div>
                            {inst.fecha_proxima && (
                              <div className="text-[10px] text-indigo-700 font-mono mt-0.5">
                                Inicio: {toFullDateDDMMYYYY(inst.fecha_proxima)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isActivo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                ACTIVO
                              </span>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <AlertOctagon className="w-3 h-3 text-rose-600" />
                                  DADO DE BAJA
                                </span>
                                {inst.fecha_baja && (
                                  <div className="text-[9.5px] text-rose-700 mt-0.5 font-medium">
                                    Baja: {inst.fecha_baja}
                                  </div>
                                )}
                                {inst.motivo_baja && (
                                  <div className="text-[9.5px] text-slate-500 italic max-w-[180px] truncate" title={inst.motivo_baja}>
                                    Motivo: {inst.motivo_baja}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {isActivo ? (
                                <>
                                  {canEmit && (
                                    <button
                                      onClick={() => handleEmitirParaInstrumento(inst)}
                                      title="Emitir Orden de Calibración"
                                      className="p-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                                    >
                                      <Compass className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canEdit && (
                                    <button
                                      onClick={() => handleOpenEditInst(inst)}
                                      title="Editar Instrumento"
                                      className="p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canEdit && (
                                    <button
                                      onClick={() => handleOpenBaja(inst)}
                                      title="Dar de Baja Técnica (Desincorporar del Plan)"
                                      className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors flex items-center gap-1 text-[11px] font-semibold px-2"
                                    >
                                      <AlertOctagon className="w-3.5 h-3.5" />
                                      <span>Dar de Baja</span>
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteInst(inst.codigo_inst, inst.nombre)}
                                      title="Eliminar del Sistema"
                                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  {canEdit && (
                                    <button
                                      onClick={() => handleReactivar(inst.codigo_inst)}
                                      title="Reactivar Instrumento a Servicio"
                                      className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1 text-[11px] font-semibold px-2"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Reactivar</span>
                                    </button>
                                  )}
                                  {canEdit && (
                                    <button
                                      onClick={() => handleOpenEditInst(inst)}
                                      title="Editar Instrumento"
                                      className="p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteInst(inst.codigo_inst, inst.nombre)}
                                      title="Eliminar permanentemente"
                                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
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
      )}

      {/* TAB 2: EMISIÓN DE ORDEN DE CALIBRACIÓN (MASIVA POR MES E INDIVIDUAL) */}
      {activeTab === 'emision' && (() => {
        const ordenesMesEmit = calibracionesCliente.filter(ord => {
          const d = parseFecha(ord.fecha_programada || ord.fecha_tentativa || ord.fecha_emision);
          return d && d.getFullYear() === selectedAnio && (d.getMonth() + 1) === selectedMesEmit;
        });

        const emittedCodesInMes = new Set(ordenesMesEmit.map(o => o.codigo_eq.trim().toUpperCase()));
        const availableForBatch = instrumentosActivos.filter(
          inst => !emittedCodesInMes.has(inst.codigo_inst.trim().toUpperCase())
        );
        const dueForBatchCodes = availableForBatch
          .filter(inst => !!getProjectedOccInMonth(inst, selectedMesEmit, selectedAnio))
          .map(inst => inst.codigo_inst);

        const pendientesOtrosMeses = pendientesList.filter(
          p => !ordenesMesEmit.some(m => m.id_ot === p.id_ot)
        );
        const mesNombre = MESES_L[selectedMesEmit - 1];

        return (
          <div className="space-y-4">
            {/* Monthly Controls Bar (Matching MP Emisión UX) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-600">Mes de Emisión:</span>
                <select
                  value={selectedMesEmit}
                  onChange={(e) => setSelectedMesEmit(Number(e.target.value))}
                  className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {MESES_L.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {idx + 1} - {m} {selectedAnio}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedAnio}
                  onChange={(e) => setSelectedAnio(Number(e.target.value))}
                  className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500 font-medium">
                  ({ordenesMesEmit.length} emitidas en {mesNombre} {selectedAnio} · {dueForBatchCodes.length} proyectadas sin emitir)
                </span>
              </div>

              {canPrint && (
                <div className="flex flex-wrap items-center gap-2">
                  {ordenesMesEmit.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePrintBatchCalibraciones(ordenesMesEmit)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir / PDF Todas las CAL de {mesNombre} {selectedAnio} ({ordenesMesEmit.length})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Panel: Mode Switch (Emisión Masiva del Mes vs Individual) */}
              <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEmisionMode('masiva')}
                    className={`py-1.5 px-2 rounded-md transition-all ${
                      emisionMode === 'masiva'
                        ? 'bg-white text-indigo-700 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Emisión Masiva ({mesNombre})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmisionMode('individual')}
                    className={`py-1.5 px-2 rounded-md transition-all ${
                      emisionMode === 'individual'
                        ? 'bg-white text-indigo-700 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Emisión Individual
                  </button>
                </div>

                {emisionMode === 'masiva' ? (
                  <form onSubmit={handleEmitirLoteMes} className="space-y-3.5 text-xs">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Emitir Órdenes del Mes: {mesNombre} {selectedAnio}
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Calculado automáticamente desde fecha de inicio, frecuencia y última calibración real ejecutada.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          F. Base *
                        </label>
                        <input
                          type="date"
                          required
                          value={batchFechaProg}
                          onChange={(e) => setBatchFechaProg(e.target.value)}
                          className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Fecha Límite *
                        </label>
                        <input
                          type="date"
                          required
                          value={batchFechaTent}
                          onChange={(e) => setBatchFechaTent(e.target.value)}
                          className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Tol. (Días)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={batchTolDias}
                          onChange={(e) => setBatchTolDias(Number(e.target.value))}
                          className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50/70 border border-indigo-200 cursor-pointer text-[11px] text-indigo-900 font-semibold">
                      <input
                        type="checkbox"
                        checked={respectProjectedDates}
                        onChange={(e) => setRespectProjectedDates(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Respetar fecha proyectada individual de cada instrumento (recomendado)</span>
                    </label>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Metrólogo / Laboratorio por Defecto
                      </label>
                      <input
                        type="text"
                        placeholder="Se usa si el instrumento no tiene uno asignado"
                        value={batchMetrologoDefault}
                        onChange={(e) => setBatchMetrologoDefault(e.target.value)}
                        className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Selection toolbar */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-700">
                          Instrumentos Activos ({selectedBatchInsts.length} selec.)
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setSelectedBatchInsts(dueForBatchCodes)}
                            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold border border-indigo-200"
                          >
                            Programados ({dueForBatchCodes.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBatchInsts(availableForBatch.map(i => i.codigo_inst))}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold border border-slate-200"
                          >
                            Todos ({availableForBatch.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBatchInsts([])}
                            className="px-2 py-0.5 rounded bg-white text-slate-500 hover:text-slate-800 border border-slate-200"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>

                      {instrumentosActivos.length === 0 ? (
                        <div className="p-4 text-center bg-slate-50 rounded-lg border border-slate-200 text-slate-500">
                          No hay instrumentos activos en esta planta. Agregue instrumentos en la pestaña &ldquo;Padrón de Instrumentos&rdquo;.
                        </div>
                      ) : availableForBatch.length === 0 ? (
                        <div className="p-4 text-center bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 font-medium">
                          Todos los instrumentos activos de esta planta ya tienen orden emitida en {mesNombre} {selectedAnio}.
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                          {instrumentosActivos.map(inst => {
                            const alreadyEmitted = emittedCodesInMes.has(inst.codigo_inst.trim().toUpperCase());
                            const projOcc = getProjectedOccInMonth(inst, selectedMesEmit, selectedAnio);
                            const checked = selectedBatchInsts.includes(inst.codigo_inst);

                            return (
                              <label
                                key={inst.codigo_inst}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${
                                  alreadyEmitted
                                    ? 'bg-emerald-50/50 border-emerald-200 opacity-75 cursor-not-allowed'
                                    : checked
                                    ? 'bg-indigo-50/60 border-indigo-300 cursor-pointer'
                                    : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={alreadyEmitted}
                                  checked={alreadyEmitted ? true : checked}
                                  onChange={(e) => {
                                    if (alreadyEmitted) return;
                                    if (e.target.checked) {
                                      setSelectedBatchInsts(prev => [...prev, inst.codigo_inst]);
                                    } else {
                                      setSelectedBatchInsts(prev => prev.filter(c => c !== inst.codigo_inst));
                                    }
                                  }}
                                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono font-bold text-slate-900">
                                      {inst.codigo_inst}
                                    </span>
                                    {alreadyEmitted ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800">
                                        Ya emitida en {mesNombre.slice(0, 3)}
                                      </span>
                                    ) : projOcc ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-100 text-indigo-800">
                                        {projOcc.projectedFromReal ? 'Proy. fecha real: ' : 'Prog: '}
                                        {formatFechaDDMMYYYY(projOcc.fecha)}
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-slate-100 text-slate-500">
                                        {inst.frecuencia}
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-semibold text-slate-800 truncate">{inst.nombre}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {inst.variable_medicion} · EMP: <span className="font-mono">{inst.tolerancia_emp}</span>
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {canEmit ? (
                      <button
                        type="submit"
                        disabled={selectedBatchInsts.length === 0}
                        className="w-full py-2.5 px-4 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-xs"
                      >
                        Emitir Todas las Órdenes de {mesNombre} {selectedAnio} ({selectedBatchInsts.length})
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium text-center">
                        Sin permiso para emitir órdenes de calibración.
                      </div>
                    )}
                  </form>
                ) : (
                  <>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Nueva Orden de Calibración Individual (CAL)
                    </h2>

                    <form onSubmit={handleEmitirSubmit} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Instrumento del Padrón Metrológico (o Equipo Asociado)
                        </label>
                        <select
                          value={formEqCode}
                          onChange={(e) => {
                            const code = e.target.value;
                            const inst = instrumentos.find(i => i.codigo_inst === code);
                            if (inst) {
                              handleEmitirParaInstrumento(inst);
                            } else {
                              handleSelectEquipForCalibration(code);
                            }
                          }}
                          className="w-full font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="">-- Seleccionar Instrumento del Padrón --</option>
                          <optgroup label="Instrumentos del Padrón Metrológico">
                            {instrumentosActivos.map(inst => (
                              <option key={inst.codigo_inst} value={inst.codigo_inst}>
                                {inst.codigo_inst} - {inst.nombre} ({inst.variable_medicion})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Equipos de Planta">
                            {Array.from(new Map(equipos.map(e => [e.codigo_eq, e])).values()).map(eq => (
                              <option key={eq.codigo_eq} value={eq.codigo_eq}>
                                {eq.codigo_eq} - {eq.nombre} ({eq.sistema})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <p className="text-[10.5px] text-slate-500 mt-1">
                          Al seleccionar un instrumento registrado, se autocompletan sus tolerancias EMP, rango y variables.
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Nombre del Instrumento / Manómetro / Sensor *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Manómetro Digital Evaporador Chiller Trane"
                          value={formNombreInst}
                          onChange={(e) => setFormNombreInst(e.target.value)}
                          className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Variable de Medición *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Presión, Temperatura, Caudal..."
                            value={formVariable}
                            onChange={(e) => setFormVariable(e.target.value)}
                            className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Rango de Operación *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. 0 a 300 PSI, -50 a 150 °C"
                            value={formRango}
                            onChange={(e) => setFormRango(e.target.value)}
                            className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Error Máximo Permisible (EMP) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. ± 0.5% FS, ± 1.0 PSI"
                            value={formEMP}
                            onChange={(e) => setFormEMP(e.target.value)}
                            className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Frecuencia de Calibración *
                          </label>
                          <select
                            value={formFrecuencia}
                            onChange={(e) => setFormFrecuencia(e.target.value)}
                            className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Mensual">Mensual (Cada 1 mes)</option>
                            <option value="Trimestral">Trimestral (Cada 3 meses)</option>
                            <option value="Semestral">Semestral (Cada 6 meses)</option>
                            <option value="Anual">Anual (Cada 12 meses)</option>
                            <option value="Bianual">Bianual (Cada 24 meses)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Fecha Programada *
                          </label>
                          <input
                            type="date"
                            required
                            value={formFechaProg}
                            onChange={(e) => setFormFechaProg(e.target.value)}
                            className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Fecha Límite *
                          </label>
                          <input
                            type="date"
                            required
                            value={formFechaTent}
                            onChange={(e) => setFormFechaTent(e.target.value)}
                            className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Tolerancia (Días)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formTolDias}
                            onChange={(e) => setFormTolDias(Number(e.target.value))}
                            className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Metrólogo / Laboratorio Responsable
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Ing. Carlos Mendoza (Metrología Interna) o Laboratorio Externo"
                          value={formMetrologo}
                          onChange={(e) => setFormMetrologo(e.target.value)}
                          className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Notas de Calibración & Procedimiento
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Instrucciones para prueba: puntos de contraste, verificación de histéresis, estanqueidad..."
                          value={formObs}
                          onChange={(e) => setFormObs(e.target.value)}
                          className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {canEmit ? (
                        <button
                          type="submit"
                          className="w-full py-2.5 px-4 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                        >
                          Emitir Orden de Calibración (CAL)
                        </button>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium text-center">
                          Sin permiso para emitir órdenes de calibración.
                        </div>
                      )}
                    </form>
                  </>
                )}
              </div>

              {/* Right Column: Orders of Selected Month + Other Pending Orders */}
              <div className="lg:col-span-7 space-y-4">
                {lastBatchFolios.length > 0 && (() => {
                  const batchOrders = calibraciones.filter(c => lastBatchFolios.includes(c.id_ot));
                  if (!batchOrders.length) return null;
                  return (
                    <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs">
                        <p className="font-bold text-emerald-900">
                          Lote emitido: {batchOrders.length} {batchOrders.length === 1 ? 'orden generada' : 'órdenes generadas'} para {mesNombre} {selectedAnio}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-mono">
                          {batchOrders.map(b => b.id_ot).join(', ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrintBatchCalibraciones(batchOrders)}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimir / PDF Lote ({batchOrders.length})</span>
                      </button>
                    </div>
                  );
                })()}

                {lastEmittedCalFolio && (() => {
                  const justEmitted = calibraciones.find(c => c.id_ot === lastEmittedCalFolio);
                  if (!justEmitted) return null;
                  return (
                    <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs">
                        <p className="font-bold text-emerald-900">
                          Orden {justEmitted.id_ot} emitida correctamente
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          {justEmitted.instrumento_nombre} · Programada: {justEmitted.fecha_programada}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrintCertificate(justEmitted)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimir / Descargar PDF</span>
                      </button>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Órdenes de {mesNombre} {selectedAnio} ({ordenesMesEmit.length})
                  </h2>
                  {ordenesMesEmit.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handlePrintBatchCalibraciones(ordenesMesEmit)}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md flex items-center gap-1"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>PDF del Mes ({ordenesMesEmit.length})</span>
                    </button>
                  )}
                </div>

                {ordenesMesEmit.length === 0 ? (
                  <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-xs">
                    No hay órdenes de calibración emitidas para {mesNombre} {selectedAnio}. Seleccione los instrumentos en el panel izquierdo y presione &ldquo;Emitir Todas las Órdenes de {mesNombre} {selectedAnio}&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ordenesMesEmit.map(cal => {
                      const isPendiente = cal.estado === 'Pendiente';
                      const isHighlighted = lastEmittedCalFolio === cal.id_ot || lastBatchFolios.includes(cal.id_ot);
                      return (
                        <div
                          key={cal.id_ot}
                          className={`bg-white rounded-xl border p-4 space-y-2.5 shadow-xs transition-all ${
                            isHighlighted
                              ? 'border-indigo-400 ring-2 ring-indigo-200'
                              : isPendiente
                              ? 'border-indigo-200'
                              : 'border-emerald-200 bg-emerald-50/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  {cal.id_ot}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {cal.instrumento_nombre}
                                </span>
                                <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-slate-100 text-slate-700">
                                  {cal.codigo_eq}
                                </span>
                                {!isPendiente && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                    Certificada ({cal.fecha_real})
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Programada: <strong className="text-slate-800">{cal.fecha_programada}</strong> · Límite: <strong className="text-slate-800">{cal.fecha_tentativa}</strong> (±{cal.dias_tolerancia}d tol.) · EMP: <strong className="font-mono text-indigo-700">{cal.tolerancia_emp}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                              {onShareOrder && (
                                <button
                                  type="button"
                                  onClick={() => onShareOrder(buildDigitalTargetCAL(cal))}
                                  className="px-2 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md flex items-center gap-1"
                                  title="Enviar enlace o WhatsApp al metrólogo / técnico"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>Compartir</span>
                                </button>
                              )}
                              {onOpenDigitalExecution && (
                                <button
                                  type="button"
                                  onClick={() => onOpenDigitalExecution(buildDigitalTargetCAL(cal))}
                                  className="px-2 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md flex items-center gap-1"
                                  title={isPendiente ? 'Ejecutar y firmar digitalmente' : 'Ver certificado digital'}
                                >
                                  <Smartphone className="w-3.5 h-3.5" />
                                  <span>{isPendiente ? 'Digital' : 'Ver Digital'}</span>
                                </button>
                              )}
                              {canPrint && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintCertificate(cal)}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center gap-1 shadow-2xs"
                                  title="Vista Previa, Imprimir o Descargar PDF de la Orden"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Imprimir / PDF</span>
                                </button>
                              )}
                              {isPendiente && canClose && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCalToClose(cal.id_ot);
                                    setCierreMetrologo(cal.metrologo_laboratorio);
                                    setCierreCertNo(`CAL-CERT-${selectedAnio}-${cal.id_ot.replace(/CAL-\d+-/g, '')}`);
                                    setActiveTab('cierre');
                                  }}
                                  className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md"
                                  title="Ir a Certificar y Cerrar"
                                >
                                  Certificar
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const confirmed = await confirmAction({
                                      title: 'Eliminar Orden de Calibración',
                                      message: `¿Está seguro de eliminar la orden de calibración ${cal.id_ot} (${cal.instrumento_nombre})?`,
                                      confirmText: 'Sí, Eliminar',
                                      tone: 'danger'
                                    });
                                    if (confirmed) {
                                      deleteOrdenCalibracion(cal.id_ot);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                  title="Eliminar Orden"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                            <span>
                              Variable: <strong className="text-slate-700">{cal.variable_medicion}</strong> ({cal.rango_operacion})
                            </span>
                            <span>
                              Metrólogo: <strong className="text-slate-700">{cal.metrologo_laboratorio}</strong>
                            </span>
                          </div>
                          {cal.observaciones && (
                            <p className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                              {cal.observaciones}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Other Pending Orders Outside Selected Month */}
                {pendientesOtrosMeses.length > 0 && (
                  <div className="pt-2 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Otras Órdenes Pendientes de Otros Meses ({pendientesOtrosMeses.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => handlePrintBatchCalibraciones(pendientesOtrosMeses)}
                        className="px-2 py-1 text-[10.5px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Imprimir / PDF Pendientes</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      {pendientesOtrosMeses.map(cal => (
                        <div
                          key={cal.id_ot}
                          className="bg-white rounded-lg border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-700">{cal.id_ot}</span>
                              <span className="font-semibold text-slate-900 truncate">{cal.instrumento_nombre}</span>
                            </div>
                            <p className="text-[10.5px] text-slate-500">
                              Programada: <strong className="text-slate-700">{cal.fecha_programada}</strong> · EMP: {cal.tolerancia_emp}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                            {onShareOrder && (
                              <button
                                type="button"
                                onClick={() => onShareOrder(buildDigitalTargetCAL(cal))}
                                className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1"
                              >
                                <Share2 className="w-3 h-3" />
                                <span>Compartir</span>
                              </button>
                            )}
                            {onOpenDigitalExecution && (
                              <button
                                type="button"
                                onClick={() => onOpenDigitalExecution(buildDigitalTargetCAL(cal))}
                                className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1"
                              >
                                <Smartphone className="w-3 h-3" />
                                <span>Digital</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handlePrintCertificate(cal)}
                              className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Imprimir / PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCalToClose(cal.id_ot);
                                setCierreMetrologo(cal.metrologo_laboratorio);
                                setCierreCertNo(`CAL-CERT-${selectedAnio}-${cal.id_ot.replace(/CAL-\d+-/g, '')}`);
                                setActiveTab('cierre');
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                            >
                              Certificar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    Criterios de Aceptación Metrológica (ISO 17025)
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Puede emitir todas las órdenes de un mes en bloque y descargarlas en un solo archivo PDF o imprimir el lote completo desde el botón superior.
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Puntos estándar:</span>
                      <span className="font-semibold text-slate-800">0%, 25%, 50%, 75%, 100%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Histéresis:</span>
                      <span className="font-semibold text-slate-800">Subida y Bajada</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Dictamen Conforme:</span>
                      <span className="font-semibold text-emerald-700">Error ≤ EMP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: CIERRE & CERTIFICACIÓN METROLÓGICA */}
      {activeTab === 'cierre' && (
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl border border-slate-200 space-y-5 text-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Certificación de Calibración & Dictamen de Conformidad
            </h2>
            <p className="text-slate-500 mt-0.5">
              Ingrese los valores de los puntos medidos contra el patrón para calcular el error y emitir el certificado.
            </p>
          </div>

          {closeableCalItems.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 font-medium">
              No hay órdenes de calibración pendientes o proyectadas para cerrar en {selectedAnio}. Todos los instrumentos se encuentran al día.
            </div>
          ) : (
            <form onSubmit={handleCierreSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Seleccione Orden o Calibración Programada Pendiente *
                  </label>
                  {selectedCalToClose && (() => {
                    const match = closeableCalItems.find(c => c.key === selectedCalToClose);
                    if (!match) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => handlePrintCertificate(match.order)}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Imprimir / PDF Orden</span>
                      </button>
                    );
                  })()}
                </div>
                <select
                  value={selectedCalToClose}
                  onChange={(e) => {
                    const keyVal = e.target.value;
                    setSelectedCalToClose(keyVal);
                    const match = closeableCalItems.find(c => c.key === keyVal);
                    if (match) {
                      setCierreMetrologo(match.order.metrologo_laboratorio);
                      setCierreCertNo(
                        match.isProjectedOnly
                          ? `CAL-CERT-${selectedAnio}-${String(match.mes_n).padStart(2, '0')}-${String(cerradasList.length + 1).padStart(4, '0')}`
                          : `CAL-CERT-${selectedAnio}-${keyVal.replace(/CAL-\d+-/g, '')}`
                      );
                    }
                  }}
                  required
                  className="w-full font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar Orden / Programación Pendiente ({closeableCalItems.length}) --</option>
                  {closeableCalItems.map(item => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCalToClose && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Fecha Real de Calibración *
                      </label>
                      <input
                        type="date"
                        required
                        value={cierreFechaReal}
                        onChange={(e) => setCierreFechaReal(e.target.value)}
                        className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Dictamen Metrológico *
                      </label>
                      <select
                        value={cierreDictamen}
                        onChange={(e) => setCierreDictamen(e.target.value as any)}
                        className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Conforme">Conforme (Apto para uso operacional)</option>
                        <option value="Ajustado y Conforme">Ajustado y Conforme (Requiere ajuste de cero/span)</option>
                        <option value="No Conforme">No Conforme (Rechazado / Fuera de Tolerancia)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Patrón de Referencia Utilizado *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Balanza de Pesos Muertos Ametek, Horno Fluke 9142"
                        value={cierrePatron}
                        onChange={(e) => setCierrePatron(e.target.value)}
                        className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        N° Certificado de Trazabilidad del Patrón *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. CERT-MET-INT-2025-441 (Laboratorio INN/NIST)"
                        value={cierreTrazabilidad}
                        onChange={(e) => setCierreTrazabilidad(e.target.value)}
                        className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Error Máximo Hallado *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. +0.21% FS"
                        value={cierreErrorMax}
                        onChange={(e) => setCierreErrorMax(e.target.value)}
                        className="w-full font-semibold font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        N° de Certificado Oficial Emitido *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. CAL-CERT-2026-0089"
                        value={cierreCertNo}
                        onChange={(e) => setCierreCertNo(e.target.value)}
                        className="w-full font-semibold font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Calibration Test Points Table */}
                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-2">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">
                      Puntos de Calibración (Lectura Patrón vs Instrumento)
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-slate-500 font-bold border-b border-slate-200">
                            <th className="py-1 px-2 text-left">Punto Nominal</th>
                            <th className="py-1 px-2 text-left">Lectura Patrón</th>
                            <th className="py-1 px-2 text-left">Lectura Instrumento</th>
                            <th className="py-1 px-2 text-left">Error Calculado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cierrePuntos.map((p, pIdx) => (
                            <tr key={pIdx} className="border-b border-slate-100">
                              <td className="py-1 px-2 font-mono">{p.punto_nominal}</td>
                              <td className="py-1 px-2">
                                <input
                                  type="text"
                                  value={p.lectura_patron}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCierrePuntos(prev => prev.map((item, i) => i === pIdx ? { ...item, lectura_patron: val } : item));
                                  }}
                                  className="w-24 bg-white border border-slate-300 rounded px-1.5 py-0.5 font-mono"
                                />
                              </td>
                              <td className="py-1 px-2">
                                <input
                                  type="text"
                                  value={p.lectura_instrumento}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCierrePuntos(prev => prev.map((item, i) => i === pIdx ? { ...item, lectura_instrumento: val } : item));
                                  }}
                                  className="w-24 bg-white border border-slate-300 rounded px-1.5 py-0.5 font-mono"
                                />
                              </td>
                              <td className="py-1 px-2 font-mono font-bold text-emerald-700">{p.error_calculado}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {(() => {
                    const selectedCal = closeableCalItems.find(c => c.key === selectedCalToClose)?.order;
                    return (
                      <RepuestosConsumoSelector
                        clienteNombre={selectedCal?.cliente}
                        equipoCodigo={selectedCal?.codigo_eq}
                        selectedItems={stockConsumido}
                        onChangeItems={setStockConsumido}
                        manualText={cierreRepuestos}
                        onChangeManualText={setCierreRepuestos}
                        manualLabel="Repuestos / Consumibles de Calibración No Registrados (Texto Libre)"
                        manualPlaceholder="Ej. Sellos PTFE, cinta teflón, batería de instrumento, racores..."
                      />
                    );
                  })()}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Observaciones Metrológicas & Precintos Aplicados
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Indique etiqueta adherida, precinto de seguridad, condiciones ambientales (Temperatura 20°C, Humedad 45%)..."
                      value={cierreObs}
                      onChange={(e) => setCierreObs(e.target.value)}
                      className="w-full text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {canClose ? (
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                    >
                      Certificar Calibración & Emitir Certificado Oficial
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium text-center">
                      Su perfil no tiene permiso para cerrar ni certificar calibraciones.
                    </div>
                  )}
                </>
              )}
            </form>
          )}
        </div>
      )}

      {/* TAB 4: HISTORIAL DE CERTIFICADOS */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por certificado, instrumento o folio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
            </div>

            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setHistorialAnioMode('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  historialAnioMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Todos los Años ({cerradasList.length})
              </button>
              <button
                type="button"
                onClick={() => setHistorialAnioMode('selected')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  historialAnioMode === 'selected' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Año {selectedAnio}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Certificado / Folio</th>
                  <th className="py-2.5 px-3">Instrumento</th>
                  <th className="py-2.5 px-3">Variable & Rango</th>
                  <th className="py-2.5 px-3 text-center">Fecha Real</th>
                  <th className="py-2.5 px-3 text-center">Dictamen</th>
                  <th className="py-2.5 px-3 text-center">Error Hallado</th>
                  <th className="py-2.5 px-3">Metrólogo / Laboratorio</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cerradasList
                  .filter(c => {
                    if (historialAnioMode === 'selected') {
                      const d = parseFecha(c.fecha_real || c.fecha_programada);
                      if (!d || d.getFullYear() !== selectedAnio) return false;
                    }
                    if (!searchQuery) return true;
                    return c.id_ot.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (c.numero_certificado || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.instrumento_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.codigo_eq.toLowerCase().includes(searchQuery.toLowerCase());
                  })
                  .map(row => (
                    <tr key={row.id_ot} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                        {row.numero_certificado || row.id_ot}
                        <span className="block text-[10px] text-slate-400 font-normal">{row.id_ot}</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {row.instrumento_nombre}
                        <span className="block text-[10px] text-slate-400 font-normal">Activo: {row.codigo_eq}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div>{row.variable_medicion}</div>
                        <div className="font-mono text-[10px] text-slate-400">{row.rango_operacion}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-emerald-700">
                        {row.fecha_real}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.dictamen === 'Conforme'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : row.dictamen === 'Ajustado y Conforme'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {row.dictamen || 'Conforme'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        {row.error_max_hallado || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {row.metrologo_laboratorio}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handlePrintCertificate(row)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded flex items-center gap-1 ml-auto"
                          title="Imprimir Certificado"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Certificado</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal for Selected Calibration in Matrix */}
      {selectedCellInfo && (() => {
        const ord = selectedCellInfo.order;
        const isProj = !!selectedCellInfo.isProjectedOnly;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Certificado & Control Metrológico
                    </h3>
                    {isProj && (
                      <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mt-0.5">
                        Programación Automática Proyectada ({selectedAnio})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCellInfo(null)}
                  className="text-slate-400 hover:text-slate-600 font-semibold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Folio de Calibración:</span>
                  <span className="font-mono font-bold text-indigo-600">{ord.id_ot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Instrumento:</span>
                  <span className="font-bold text-slate-900">{ord.instrumento_nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Variable & Rango:</span>
                  <span className="text-slate-800">{ord.variable_medicion} ({ord.rango_operacion})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Error Máximo Permisible:</span>
                  <span className="font-semibold text-slate-800">{ord.tolerancia_emp}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Fecha Programada</span>
                  <p className="text-sm font-mono font-bold text-slate-900 mt-0.5">{ord.fecha_programada}</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Fecha Real Calibrada</span>
                  <p className="text-sm font-mono font-bold text-emerald-600 mt-0.5">{ord.fecha_real || 'Pendiente'}</p>
                </div>
              </div>

              {ord.numero_certificado && (
                <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/40 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">N° Certificado:</span>
                    <span className="font-mono font-bold text-indigo-800">{ord.numero_certificado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">Dictamen:</span>
                    <span className="font-bold text-emerald-700">{ord.dictamen}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">Error Máximo Encontrado:</span>
                    <span className="font-mono font-bold text-slate-900">{ord.error_max_hallado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">Patrón de Referencia:</span>
                    <span className="text-slate-700 truncate max-w-[240px]">{ord.patron_utilizado}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-wrap justify-between items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {isProj ? (
                    canEmit && (
                      <button
                        onClick={() => {
                          const { id_ot: _ignore, estado: _st, fecha_real: _fr, ...payload } = ord;
                          const folioReal = crearOrdenCalibracion(payload);
                          const createdOrder: OrdenCalibracion = {
                            ...payload,
                            id_ot: folioReal,
                            estado: 'Pendiente',
                            fecha_real: ''
                          };
                          setSelectedCellInfo(null);
                          if (canPrint) handlePrintCertificate(createdOrder);
                        }}
                        className="px-3.5 py-1.5 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{canPrint ? 'Emitir e Imprimir / PDF Orden CAL' : 'Emitir Orden CAL'}</span>
                      </button>
                    )
                  ) : (
                    canPrint && (
                      <button
                        onClick={() => handlePrintCertificate(ord)}
                        className="px-3.5 py-1.5 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>
                          {ord.fecha_real
                            ? 'Imprimir / PDF Certificado'
                            : 'Imprimir / PDF Orden CAL'}
                        </span>
                      </button>
                    )
                  )}

                  {onShareOrder && (
                    <button
                      type="button"
                      onClick={() =>
                        onShareOrder(
                          buildDigitalTargetCAL(ord, {
                            isProjectedCal: isProj,
                            mes_n: selectedCellInfo.mes_n
                          })
                        )
                      }
                      className="px-3 py-1.5 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartir</span>
                    </button>
                  )}

                  {onOpenDigitalExecution && (
                    <button
                      type="button"
                      onClick={() => {
                        const t = buildDigitalTargetCAL(ord, {
                          isProjectedCal: isProj,
                          mes_n: selectedCellInfo.mes_n
                        });
                        setSelectedCellInfo(null);
                        onOpenDigitalExecution(t);
                      }}
                      className="px-3 py-1.5 font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>{ord.fecha_real ? 'Ver Digital' : 'Ejecutar Digital'}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedCellInfo(null)}
                  className="px-4 py-1.5 font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors ml-auto"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Ingresar / Editar Instrumento Metrológico */}
      {instModalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 my-8 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {instModalMode === 'create' ? 'Ingreso de Nuevo Instrumento Metrológico' : `Editar Instrumento ${editingInstCodigo}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Padrón de Instrumentación y Control Metrológico (ISO/IEC 17025)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInstModalMode(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitInst} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Código de Instrumento / Tag *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. MAN-CH01, TERM-02, TRAN-COMP01"
                    value={fInstCodigo}
                    onChange={(e) => setFInstCodigo(e.target.value.toUpperCase())}
                    className="w-full font-mono font-bold text-indigo-700 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Empresa / Planta Asignada *
                  </label>
                  <select
                    value={fInstCliente}
                    onChange={(e) => setFInstCliente(e.target.value)}
                    disabled={!isSuperAdmin}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
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
                  Nombre Descriptivo del Instrumento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Manómetro Digital Presión Alta Chiller Trane"
                  value={fInstNombre}
                  onChange={(e) => setFInstNombre(e.target.value)}
                  className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Equipo o Máquina Principal Asociada
                  </label>
                  <select
                    value={fInstEquipoAsoc}
                    onChange={(e) => setFInstEquipoAsoc(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Sin equipo vinculado (Autónomo) --</option>
                    {Array.from(new Map(
                      equipos
                        .filter(eq => !fInstCliente || eq.cliente.trim() === fInstCliente.trim())
                        .map(eq => [eq.codigo_eq, eq])
                    ).values()).map(eq => (
                      <option key={eq.codigo_eq} value={eq.codigo_eq}>
                        {eq.codigo_eq} - {eq.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ubicación Física en Planta
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Sala de Máquinas - Manifold Descarga"
                    value={fInstUbicacion}
                    onChange={(e) => setFInstUbicacion(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Variable de Medición *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Presión, Temperatura, Caudal"
                    value={fInstVariable}
                    onChange={(e) => setFInstVariable(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Rango de Operación *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 0 a 300 PSI, 0 a 400 °C"
                    value={fInstRango}
                    onChange={(e) => setFInstRango(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Error Máx. Permisible (EMP) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. ± 0.5% FS, ± 0.5 °C"
                    value={fInstEMP}
                    onChange={(e) => setFInstEMP(e.target.value)}
                    className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Frecuencia de Calibración *
                  </label>
                  <select
                    value={fInstFrecuencia}
                    onChange={(e) => setFInstFrecuencia(e.target.value)}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {frecuencias.map(f => (
                      <option key={f.nombre_freq} value={f.nombre_freq}>
                        {f.nombre_freq}
                      </option>
                    ))}
                    {!frecuencias.some(f => f.nombre_freq.toLowerCase() === 'bianual') && (
                      <option value="Bianual">Bianual</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha Primera Calibración / Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={fInstFechaInicio}
                    onChange={(e) => setFInstFechaInicio(e.target.value)}
                    className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ashcroft, WIKA, Fluke, Rosemount"
                    value={fInstMarca}
                    onChange={(e) => setFInstMarca(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Modelo / Serie
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. DG25 / S/N 88410"
                    value={fInstModelo}
                    onChange={(e) => setFInstModelo(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Patrón de Calibración Habitual
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Balanza de Pesos Muertos Ametek / Bloque Seco"
                    value={fInstPatron}
                    onChange={(e) => setFInstPatron(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Metrólogo / Laboratorio Habitual
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ing. Carlos Mendoza (Metrología Interna)"
                    value={fInstMetrologo}
                    onChange={(e) => setFInstMetrologo(e.target.value)}
                    className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Notas Técnicas y Trazabilidad
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles de instalación, clase de exactitud, certificados de fábrica..."
                  value={fInstNotas}
                  onChange={(e) => setFInstNotas(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setInstModalMode(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                >
                  {instModalMode === 'create' ? 'Dar de Alta Instrumento' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dar de Baja Instrumento */}
      {bajaModalInst && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Dar de Baja Instrumento Metrológico
                  </h3>
                  <p className="text-[11px] text-rose-600 font-semibold">
                    Desincorporación del Plan Anual de Calibración
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBajaModalInst(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* Instrument summary box */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Instrumento:</span>
                <span className="font-mono font-bold text-indigo-700">{bajaModalInst.codigo_inst}</span>
              </div>
              <div className="font-bold text-slate-900">{bajaModalInst.nombre}</div>
              <div className="text-slate-600 text-[11px]">{bajaModalInst.cliente} · {bajaModalInst.variable_medicion} ({bajaModalInst.rango_operacion})</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fecha de Baja *
                </label>
                <input
                  type="date"
                  required
                  value={bajaFecha}
                  onChange={(e) => setBajaFecha(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motivo Técnico de la Baja *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej. Deriva permanente fuera de tolerancia EMP / Rotura de fuelle mecánico / Reemplazado por nuevo transmisor digital..."
                  value={bajaMotivo}
                  onChange={(e) => setBajaMotivo(e.target.value)}
                  className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              <strong>Nota de Auditoría ISO/IEC 17025:</strong> Al dar de baja este instrumento, dejará de figurar en el Plan Anual de Calibración activo, pero sus calibraciones pasadas y trazabilidad histórica permanecerán registradas en el sistema para consulta y auditorías.
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBajaModalInst(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBaja}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Confirmar Baja Técnica</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {showInstListadoModal && (
        <CatalogoListadoModal
          mode="instrumentos"
          selectedCliente={selectedCliente}
          clientes={clientes}
          instrumentos={instrumentosListado}
          filtroDescripcion={instFilterEstado !== 'Todos' ? `Estado: ${instFilterEstado}` : undefined}
          onClose={() => setShowInstListadoModal(false)}
        />
      )}
    </div>
  );
};
