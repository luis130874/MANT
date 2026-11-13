/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Cliente,
  Sistema,
  FrecuenciaConfig,
  Tecnico,
  Equipo,
  RegistroHistorialMP,
  OrdenCorrectivo,
  OrdenTrabajoOT,
  OrdenCalibracion,
  EstadoOrden,
  EstadoCalibracion,
  PuntoCalibracion,
  Instrumento,
  Repuesto,
  MovimientoRepuesto
} from '../types';
import {
  INITIAL_CLIENTES,
  INITIAL_SISTEMAS,
  INITIAL_FRECUENCIAS,
  INITIAL_TECNICOS,
  INITIAL_EQUIPOS,
  INITIAL_HISTORIAL,
  INITIAL_CORRECTIVOS,
  INITIAL_ORDENES_TRABAJO,
  INITIAL_CALIBRACIONES,
  INITIAL_INSTRUMENTOS,
  INITIAL_REPUESTOS,
  INITIAL_MOVIMIENTOS_REPUESTOS
} from '../utils/initialData';
import {
  addFrequencyStep,
  formatFechaDDMMYYYY,
  formatFechaYYYYMMDD,
  parseFecha
} from '../utils/maintenanceEngine';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  stripUndefinedDeep
} from '../firebase';
import {
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { makeSafeDocId } from '../utils/rbac';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  text: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'warning' | 'info';
}

type ModuloDatosName =
  | 'equipos'
  | 'instrumentos'
  | 'historial'
  | 'correctivos'
  | 'ordenesTrabajo'
  | 'calibraciones'
  | 'repuestos'
  | 'movimientosRepuestos';

const MODULOS_DATOS: ModuloDatosName[] = [
  'equipos',
  'instrumentos',
  'historial',
  'correctivos',
  'ordenesTrabajo',
  'calibraciones',
  'repuestos',
  'movimientosRepuestos'
];

interface MaintenanceContextType {
  clientes: Cliente[];
  sistemas: Sistema[];
  frecuencias: FrecuenciaConfig[];
  tecnicos: Tecnico[];
  equipos: Equipo[];
  historial: RegistroHistorialMP[];
  correctivos: OrdenCorrectivo[];
  ordenesTrabajo: OrdenTrabajoOT[];
  calibraciones: OrdenCalibracion[];
  instrumentos: Instrumento[];
  selectedCliente: string;
  setSelectedCliente: (cliente: string) => void;
  selectedAnio: number;
  setSelectedAnio: (anio: number) => void;
  availableYears: number[];
  cloudLoading: boolean;
  toasts: ToastMessage[];
  addToast: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;

  // Clientes
  addCliente: (cliente: Cliente) => void;
  updateCliente: (codigo: string, updated: Cliente) => void;
  deleteCliente: (codigo: string, nombre: string) => void;

  // Sistemas
  addSistema: (sistema: Sistema) => void;
  updateSistema: (codigo_sis: string, updated: Sistema) => void;
  deleteSistema: (codigo_sis: string) => void;

  // Frecuencias
  addFrecuencia: (freq: FrecuenciaConfig) => void;
  updateFrecuencia: (nombre: string, updated: FrecuenciaConfig) => void;
  deleteFrecuencia: (nombre: string) => void;

  // Tecnicos
  addTecnico: (tec: Tecnico) => void;
  updateTecnico: (codigo_tec: string, updated: Tecnico) => void;
  deleteTecnico: (codigo_tec: string) => void;

  // Equipos
  addEquipo: (eq: Equipo) => void;
  updateEquipo: (keyOrCodigo: string, updated: Equipo) => void;
  deleteEquipo: (codigo_eq: string, frecuencia?: string) => void;

  // Instrumentos Metrológicos
  addInstrumento: (inst: Instrumento) => void;
  updateInstrumento: (codigo_inst: string, updated: Instrumento) => void;
  darDeBajaInstrumento: (codigo_inst: string, fecha_baja: string, motivo_baja: string) => void;
  reactivarInstrumento: (codigo_inst: string) => void;
  deleteInstrumento: (codigo_inst: string) => void;

  // Preventivos
  registrarCierrePreventivo: (data: {
    codigo_eq: string;
    mes_n: number;
    fecha_real: string;
    id_ot: string;
    comentarios: string;
    tecnico: string;
    duracion_horas?: number;
    repuestos_utilizados?: string;
    frecuencia?: string;
  }) => void;

  // Correctivos
  crearCorrectivo: (data: Omit<OrdenCorrectivo, 'id_ot' | 'estado' | 'fecha_real' | 'acciones_realizadas'> & {
    id_ot?: string;
  }) => string;
  cerrarCorrectivo: (id_ot: string, data: {
    fecha_real: string;
    tecnico: string;
    acciones_realizadas: string;
    repuestos_utilizados?: string;
  }) => void;
  deleteCorrectivo: (id_ot: string) => void;

  // Ordenes de Trabajo
  crearOrdenTrabajo: (data: Omit<OrdenTrabajoOT, 'id_ot' | 'estado' | 'fecha_real' | 'acciones_realizadas'> & {
    id_ot?: string;
  }) => string;
  cerrarOrdenTrabajo: (id_ot: string, data: {
    fecha_real: string;
    tecnico: string;
    acciones_realizadas: string;
    materiales_utilizados?: string;
  }) => void;
  deleteOrdenTrabajo: (id_ot: string) => void;

  // Calibraciones
  crearOrdenCalibracion: (data: Omit<OrdenCalibracion, 'id_ot' | 'estado' | 'fecha_real'> & {
    id_ot?: string;
  }) => string;
  crearOrdenesCalibracionLote: (
    orders: Array<Omit<OrdenCalibracion, 'id_ot' | 'estado' | 'fecha_real'> & {
      id_ot?: string;
      mes_objetivo?: number;
      anio_objetivo?: number;
    }>
  ) => OrdenCalibracion[];
  cerrarOrdenCalibracion: (id_ot: string, data: {
    fecha_real: string;
    dictamen: 'Conforme' | 'Ajustado y Conforme' | 'No Conforme';
    error_max_hallado: string;
    patron_utilizado?: string;
    trazabilidad_patron?: string;
    metrologo_laboratorio: string;
    puntos_calibracion?: PuntoCalibracion[];
    observaciones?: string;
    repuestos_utilizados?: string;
    numero_certificado?: string;
    proxima_calibracion?: string;
  }) => void;
  certificarCalibracionProyectada: (
    orderData: Omit<OrdenCalibracion, 'id_ot' | 'estado' | 'fecha_real'> & {
      id_ot?: string;
      mes_objetivo?: number;
      anio_objetivo?: number;
    },
    cierreData: {
      fecha_real: string;
      dictamen: 'Conforme' | 'Ajustado y Conforme' | 'No Conforme';
      error_max_hallado: string;
      patron_utilizado?: string;
      trazabilidad_patron?: string;
      metrologo_laboratorio: string;
      puntos_calibracion?: PuntoCalibracion[];
      observaciones?: string;
      repuestos_utilizados?: string;
      numero_certificado?: string;
      proxima_calibracion?: string;
    }
  ) => string;
  deleteOrdenCalibracion: (id_ot: string) => void;

  // Gestión de Repuestos & Stock
  repuestos: Repuesto[];
  movimientosRepuestos: MovimientoRepuesto[];
  addRepuesto: (rep: Repuesto) => void;
  updateRepuesto: (id: string, updated: Repuesto) => void;
  deleteRepuesto: (id: string) => void;
  registrarMovimientoStock: (mov: {
    repuesto_id: string;
    tipo: 'Entrada' | 'Salida' | 'Ajuste';
    cantidad: number;
    motivo: string;
    ot_asociada?: string;
    equipo_asociado?: string;
    solicitante: string;
  }) => void;
  registrarSalidasStockBatch: (
    items: Array<{ repuesto_id: string; cantidad: number }>,
    meta: {
      motivo: string;
      ot_asociada?: string;
      equipo_asociado?: string;
      solicitante: string;
    }
  ) => string[];

  // System
  resetAllData: () => void;
  importBackup: (backup: Record<string, unknown>) => void;
}

const MaintenanceContext = createContext<MaintenanceContextType | null>(null);

const LEGACY_STORAGE_KEYS = {
  CLIENTES: 'prodexus_clientes',
  SISTEMAS: 'prodexus_sistemas',
  FRECUENCIAS: 'prodexus_frecuencias',
  TECNICOS: 'prodexus_tecnicos',
  EQUIPOS: 'prodexus_equipos',
  HISTORIAL: 'prodexus_historial',
  CORRECTIVOS: 'prodexus_correctivos',
  ORDENES_TRABAJO: 'prodexus_ordenes_trabajo',
  CALIBRACIONES: 'prodexus_calibraciones',
  INSTRUMENTOS: 'prodexus_instrumentos',
  REPUESTOS: 'prodexus_repuestos',
  MOVIMIENTOS_REPUESTOS: 'prodexus_movimientos_repuestos',
  SELECTED_CLIENTE: 'prodexus_selected_cliente',
  SELECTED_ANIO: 'prodexus_selected_anio'
};

function loadLegacyStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isSuperAdmin, isCompanyAdmin, syncEmpresaNombreEnRoster } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sistemas, setSistemas] = useState<Sistema[]>(INITIAL_SISTEMAS);
  const [frecuencias, setFrecuencias] = useState<FrecuenciaConfig[]>(INITIAL_FRECUENCIAS);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>(INITIAL_TECNICOS);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [historial, setHistorial] = useState<RegistroHistorialMP[]>([]);
  const [correctivos, setCorrectivos] = useState<OrdenCorrectivo[]>([]);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajoOT[]>([]);
  const [calibraciones, setCalibraciones] = useState<OrdenCalibracion[]>([]);
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [movimientosRepuestos, setMovimientosRepuestos] = useState<MovimientoRepuesto[]>([]);
  const [cloudLoading, setCloudLoading] = useState<boolean>(true);

  const [selectedCliente, setSelectedClienteState] = useState<string>(() => {
    return localStorage.getItem(LEGACY_STORAGE_KEYS.SELECTED_CLIENTE) || 'Todos';
  });

  const [selectedAnio, setSelectedAnioState] = useState<number>(() => {
    const saved = localStorage.getItem(LEGACY_STORAGE_KEYS.SELECTED_ANIO);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    if (!isNaN(parsed) && parsed >= 2020 && parsed <= 2100) return parsed;
    return new Date().getFullYear();
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmRequest, setConfirmRequest] = useState<{
    options: ConfirmOptions;
    resolve: (result: boolean) => void;
  } | null>(null);

  // Refs for atomic multi-step batch writes
  const stateRef = useRef({
    clientes,
    sistemas,
    frecuencias,
    tecnicos,
    equipos,
    historial,
    correctivos,
    ordenesTrabajo,
    calibraciones,
    instrumentos,
    repuestos,
    movimientosRepuestos
  });
  stateRef.current = {
    clientes,
    sistemas,
    frecuencias,
    tecnicos,
    equipos,
    historial,
    correctivos,
    ordenesTrabajo,
    calibraciones,
    instrumentos,
    repuestos,
    movimientosRepuestos
  };

  // Per-company store maps for real-time aggregation
  const empresasMapRef = useRef<Record<string, Cliente>>({});
  const modulesMapRef = useRef<Record<string, Partial<Record<ModuloDatosName, unknown[]>>>>({});

  const recomputeAggregatedState = useCallback(() => {
    const empList = Object.values(empresasMapRef.current).sort((a, b) =>
      a.codigo.localeCompare(b.codigo)
    );
    setClientes(empList);

    const mergeMod = <T,>(mod: ModuloDatosName): T[] => {
      const out: T[] = [];
      for (const emp of empList) {
        const empId = makeSafeDocId(emp.codigo);
        const arr = modulesMapRef.current[empId]?.[mod];
        if (Array.isArray(arr)) {
          out.push(...(arr as T[]));
        }
      }
      return out;
    };

    setEquipos(mergeMod<Equipo>('equipos'));
    setInstrumentos(mergeMod<Instrumento>('instrumentos'));
    setHistorial(mergeMod<RegistroHistorialMP>('historial'));
    setCorrectivos(mergeMod<OrdenCorrectivo>('correctivos'));
    setOrdenesTrabajo(mergeMod<OrdenTrabajoOT>('ordenesTrabajo'));
    setCalibraciones(mergeMod<OrdenCalibracion>('calibraciones'));
    setRepuestos(mergeMod<Repuesto>('repuestos'));
    setMovimientosRepuestos(mergeMod<MovimientoRepuesto>('movimientosRepuestos'));
  }, []);

  const addToast = useCallback(
    (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const confirmAction = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmRequest({ options, resolve });
    });
  };

  const handleConfirmResolve = (result: boolean) => {
    if (confirmRequest) {
      confirmRequest.resolve(result);
      setConfirmRequest(null);
    }
  };

  const setSelectedCliente = useCallback(
    (c: string) => {
      if (!isSuperAdmin && userProfile?.empresaNombre) {
        setSelectedClienteState(userProfile.empresaNombre);
        return;
      }
      setSelectedClienteState(c);
      localStorage.setItem(LEGACY_STORAGE_KEYS.SELECTED_CLIENTE, c);
    },
    [isSuperAdmin, userProfile]
  );

  // Enforce locked company selection for non-super-admin users
  useEffect(() => {
    if (!userProfile) return;
    if (!isSuperAdmin) {
      const matched = clientes.find(
        (c) => makeSafeDocId(c.codigo) === makeSafeDocId(userProfile.empresaCodigo)
      );
      const lockedName = matched?.nombre || userProfile.empresaNombre;
      if (lockedName && selectedCliente !== lockedName) {
        setSelectedClienteState(lockedName);
      }
    } else if (selectedCliente !== 'Todos' && clientes.length > 0 && !clientes.some((c) => c.nombre === selectedCliente)) {
      setSelectedClienteState(clientes[0].nombre);
    }
  }, [userProfile, isSuperAdmin, clientes, selectedCliente]);

  const setSelectedAnio = (anio: number) => {
    setSelectedAnioState(anio);
    localStorage.setItem(LEGACY_STORAGE_KEYS.SELECTED_ANIO, String(anio));
  };

  // Seed initial or localStorage-migrated dataset into Firestore if empresas_index doesn't exist yet
  const seedFirestoreIfEmpty = useCallback(async () => {
    if (!isSuperAdmin || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const idxRef = doc(db, 'catalogos', 'empresas_index');
    const idxSnap = await getDoc(idxRef);
    if (idxSnap.exists()) return;

    const rawClientes = loadLegacyStorage<Cliente[]>(LEGACY_STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES).map((c) => {
      if (!c.logo) {
        const initMatch = INITIAL_CLIENTES.find((ic) => ic.codigo === c.codigo || ic.nombre.trim() === c.nombre.trim());
        if (initMatch?.logo) return { ...c, logo: initMatch.logo };
      }
      return c;
    });
    const rawSistemas = loadLegacyStorage<Sistema[]>(LEGACY_STORAGE_KEYS.SISTEMAS, INITIAL_SISTEMAS);
    const rawFrecuencias = loadLegacyStorage<FrecuenciaConfig[]>(LEGACY_STORAGE_KEYS.FRECUENCIAS, INITIAL_FRECUENCIAS);
    const rawTecnicos = loadLegacyStorage<Tecnico[]>(LEGACY_STORAGE_KEYS.TECNICOS, INITIAL_TECNICOS);
    const rawEquipos = loadLegacyStorage<Equipo[]>(LEGACY_STORAGE_KEYS.EQUIPOS, INITIAL_EQUIPOS).map((eq, idx) => ({
      ...eq,
      id: eq.id || `${eq.codigo_eq}___${eq.frecuencia.trim()}` || `eq_${idx}`
    }));
    const rawHistorial = loadLegacyStorage<RegistroHistorialMP[]>(LEGACY_STORAGE_KEYS.HISTORIAL, INITIAL_HISTORIAL);
    const rawCorrectivos = loadLegacyStorage<OrdenCorrectivo[]>(LEGACY_STORAGE_KEYS.CORRECTIVOS, INITIAL_CORRECTIVOS);
    const rawOT = loadLegacyStorage<OrdenTrabajoOT[]>(LEGACY_STORAGE_KEYS.ORDENES_TRABAJO, INITIAL_ORDENES_TRABAJO);
    const rawCal = loadLegacyStorage<OrdenCalibracion[]>(LEGACY_STORAGE_KEYS.CALIBRACIONES, INITIAL_CALIBRACIONES);
    const rawInst = loadLegacyStorage<Instrumento[]>(LEGACY_STORAGE_KEYS.INSTRUMENTOS, INITIAL_INSTRUMENTOS).map((inst) => {
      if (inst.fecha_proxima) return inst;
      const initMatch = INITIAL_INSTRUMENTOS.find((i) => i.codigo_inst === inst.codigo_inst);
      if (initMatch?.fecha_proxima) return { ...inst, fecha_proxima: initMatch.fecha_proxima };
      return { ...inst, fecha_proxima: formatFechaYYYYMMDD(parseFecha(inst.fecha_alta) || new Date()) };
    });
    const rawRepuestos = loadLegacyStorage<Repuesto[]>(LEGACY_STORAGE_KEYS.REPUESTOS, INITIAL_REPUESTOS);
    const rawMovs = loadLegacyStorage<MovimientoRepuesto[]>(LEGACY_STORAGE_KEYS.MOVIMIENTOS_REPUESTOS, INITIAL_MOVIMIENTOS_REPUESTOS);

    // Seed catalogs
    await setDoc(doc(db, 'catalogos', 'sistemas'), stripUndefinedDeep({
      catalogo: 'sistemas',
      items: rawSistemas,
      updatedAt: serverTimestamp(),
      updatedBy: uid
    }));
    await setDoc(doc(db, 'catalogos', 'frecuencias'), stripUndefinedDeep({
      catalogo: 'frecuencias',
      items: rawFrecuencias,
      updatedAt: serverTimestamp(),
      updatedBy: uid
    }));
    await setDoc(doc(db, 'catalogos', 'tecnicos'), stripUndefinedDeep({
      catalogo: 'tecnicos',
      items: rawTecnicos,
      updatedAt: serverTimestamp(),
      updatedBy: uid
    }));

    const empresaIds: string[] = [];
    for (let i = 0; i < rawClientes.length; i++) {
      const cli = rawClientes[i];
      const empId = makeSafeDocId(cli.codigo);
      empresaIds.push(empId);

      await setDoc(
        doc(db, 'empresas', empId),
        stripUndefinedDeep({
          codigo: empId,
          nombre: cli.nombre,
          rut: cli.rut || '',
          direccion: cli.direccion || '',
          telefono: cli.telefono || '',
          correo: cli.correo || '',
          ...(cli.logo ? { logo: cli.logo } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );

      const eqEmp = rawEquipos.filter((e) => e.cliente.trim() === cli.nombre.trim());
      const eqCodes = new Set(eqEmp.map((e) => e.codigo_eq.trim().toUpperCase()));
      const instEmp = rawInst.filter((ins) => ins.cliente.trim() === cli.nombre.trim());
      const histEmp = rawHistorial.filter((h) => eqCodes.has(h.codigo_eq.trim().toUpperCase()));
      const mcEmp = rawCorrectivos.filter((c) => c.cliente.trim() === cli.nombre.trim());
      const otEmp = rawOT.filter((o) => o.cliente.trim() === cli.nombre.trim());
      const calEmp = rawCal.filter((c) => c.cliente.trim() === cli.nombre.trim());
      const repEmp = rawRepuestos.filter(
        (r) => r.cliente.trim() === cli.nombre.trim() || (i === 0 && r.cliente === 'Todas las Plantas')
      );
      const repIds = new Set(repEmp.map((r) => r.id));
      const movEmp = rawMovs.filter((m) => repIds.has(m.repuesto_id));

      const buckets: Record<ModuloDatosName, unknown[]> = {
        equipos: eqEmp,
        instrumentos: instEmp,
        historial: histEmp,
        correctivos: mcEmp,
        ordenesTrabajo: otEmp,
        calibraciones: calEmp,
        repuestos: repEmp,
        movimientosRepuestos: movEmp
      };

      for (const mod of MODULOS_DATOS) {
        await setDoc(
          doc(db, 'empresas', empId, 'datos', mod),
          stripUndefinedDeep({
            empresaCodigo: empId,
            modulo: mod,
            items: buckets[mod],
            updatedAt: serverTimestamp(),
            updatedBy: uid
          })
        );
      }
    }

    await setDoc(idxRef, {
      catalogo: 'empresas_index',
      items: empresaIds,
      updatedAt: serverTimestamp(),
      updatedBy: uid
    });
  }, [isSuperAdmin]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    if (!userProfile || !userProfile.activo) return;

    let cancelled = false;
    const unsubs: Array<() => void> = [];
    const companyUnsubs = new Map<string, Array<() => void>>();

    empresasMapRef.current = {};
    modulesMapRef.current = {};
    setCloudLoading(true);

    const attachCompanyListeners = (empId: string) => {
      if (companyUnsubs.has(empId)) return;
      const subs: Array<() => void> = [];

      subs.push(
        onSnapshot(
          doc(db, 'empresas', empId),
          (snap) => {
            if (snap.exists()) {
              empresasMapRef.current[empId] = snap.data() as Cliente;
            } else {
              delete empresasMapRef.current[empId];
            }
            recomputeAggregatedState();
            setCloudLoading(false);
          },
            (err) => {
              setCloudLoading(false);
              handleFirestoreError(err, OperationType.GET, `empresas/${empId}`);
            }
          )
        );

      if (!modulesMapRef.current[empId]) modulesMapRef.current[empId] = {};

      for (const mod of MODULOS_DATOS) {
        subs.push(
          onSnapshot(
            doc(db, 'empresas', empId, 'datos', mod),
            (snap) => {
              if (!modulesMapRef.current[empId]) modulesMapRef.current[empId] = {};
              modulesMapRef.current[empId][mod] = snap.exists()
                ? ((snap.data().items as unknown[]) || [])
                : [];
              recomputeAggregatedState();
            },
            (err) => {
              handleFirestoreError(err, OperationType.GET, `empresas/${empId}/datos/${mod}`);
            }
          )
        );
      }

      companyUnsubs.set(empId, subs);
    };

    const detachCompanyListeners = (empId: string) => {
      const subs = companyUnsubs.get(empId);
      if (subs) {
        subs.forEach((u) => u());
        companyUnsubs.delete(empId);
      }
      delete empresasMapRef.current[empId];
      delete modulesMapRef.current[empId];
    };

    const startSync = async () => {
      try {
        if (isSuperAdmin) {
          await seedFirestoreIfEmpty();
        }
        if (cancelled) return;

        // Global Catalogs
        unsubs.push(
          onSnapshot(
            doc(db, 'catalogos', 'sistemas'),
            (snap) => {
              if (snap.exists()) setSistemas((snap.data().items as Sistema[]) || INITIAL_SISTEMAS);
            },
            (err) => {
              handleFirestoreError(err, OperationType.GET, 'catalogos/sistemas');
            }
          )
        );
        unsubs.push(
          onSnapshot(
            doc(db, 'catalogos', 'frecuencias'),
            (snap) => {
              if (snap.exists()) setFrecuencias((snap.data().items as FrecuenciaConfig[]) || INITIAL_FRECUENCIAS);
            },
            (err) => {
              handleFirestoreError(err, OperationType.GET, 'catalogos/frecuencias');
            }
          )
        );
        unsubs.push(
          onSnapshot(
            doc(db, 'catalogos', 'tecnicos'),
            (snap) => {
              if (snap.exists()) setTecnicos((snap.data().items as Tecnico[]) || INITIAL_TECNICOS);
            },
            (err) => {
              handleFirestoreError(err, OperationType.GET, 'catalogos/tecnicos');
            }
          )
        );

        if (isSuperAdmin) {
          unsubs.push(
            onSnapshot(
              doc(db, 'catalogos', 'empresas_index'),
              (snap) => {
                const ids = snap.exists() ? ((snap.data().items as string[]) || []) : [];
                const idSet = new Set(ids);
                // Remove old company listeners
                for (const existingId of Array.from(companyUnsubs.keys())) {
                  if (!idSet.has(existingId)) {
                    detachCompanyListeners(existingId);
                  }
                }
                // Attach new company listeners
                for (const id of ids) {
                  attachCompanyListeners(id);
                }
                if (ids.length === 0) {
                  recomputeAggregatedState();
                  setCloudLoading(false);
                }
              },
              (err) => {
                handleFirestoreError(err, OperationType.GET, 'catalogos/empresas_index');
              }
            )
          );
        } else if (userProfile.empresaCodigo) {
          attachCompanyListeners(makeSafeDocId(userProfile.empresaCodigo));
        } else {
          setCloudLoading(false);
        }
      } catch (err) {
        console.error('Error initializing cloud sync:', err);
        setCloudLoading(false);
      }
    };

    void startSync();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
      for (const subs of companyUnsubs.values()) {
        subs.forEach((u) => u());
      }
      companyUnsubs.clear();
    };
  }, [userProfile, isSuperAdmin, seedFirestoreIfEmpty, recomputeAggregatedState]);

  // Helper to resolve which company ID owns a record
  const resolveEmpresaId = useCallback(
    (clienteName?: string): string => {
      if (!isSuperAdmin && userProfile?.empresaCodigo) {
        return makeSafeDocId(userProfile.empresaCodigo);
      }
      if (clienteName) {
        const match = stateRef.current.clientes.find(
          (c) =>
            c.nombre.trim().toLowerCase() === clienteName.trim().toLowerCase() ||
            makeSafeDocId(c.codigo) === makeSafeDocId(clienteName)
        );
        if (match) return makeSafeDocId(match.codigo);
      }
      const first = stateRef.current.clientes[0];
      return first ? makeSafeDocId(first.codigo) : '';
    },
    [isSuperAdmin, userProfile]
  );

  const persistEmpresaModulo = useCallback(
    async (empId: string, modulo: ModuloDatosName, items: unknown[]) => {
      if (!empId || !auth.currentUser) return;
      if (!modulesMapRef.current[empId]) modulesMapRef.current[empId] = {};
      modulesMapRef.current[empId][modulo] = items;
      recomputeAggregatedState();

      const docPath = `empresas/${empId}/datos/${modulo}`;
      const docRef = doc(db, 'empresas', empId, 'datos', modulo);
      try {
        const snap = await getDoc(docRef);
        const payload = stripUndefinedDeep({
          empresaCodigo: empId,
          modulo,
          items,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser.uid
        });
        if (snap.exists()) {
          await updateDoc(docRef, {
            items: payload.items,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid
          });
        } else {
          await setDoc(docRef, payload);
        }
      } catch (err) {
        addToast('Error de permisos o red al guardar en la nube.', 'error');
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
    },
    [recomputeAggregatedState, addToast]
  );

  const persistCatalogo = useCallback(
    async (catalogo: 'sistemas' | 'frecuencias' | 'tecnicos' | 'empresas_index', items: unknown[]) => {
      if (!auth.currentUser) return;
      const docPath = `catalogos/${catalogo}`;
      const docRef = doc(db, 'catalogos', catalogo);
      try {
        const snap = await getDoc(docRef);
        const cleanItems = stripUndefinedDeep(items);
        if (snap.exists()) {
          await updateDoc(docRef, {
            items: cleanItems,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid
          });
        } else {
          await setDoc(docRef, {
            catalogo,
            items: cleanItems,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid
          });
        }
      } catch (err) {
        addToast('Error de permisos al guardar catálogo global.', 'error');
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
    },
    [addToast]
  );

  // Available years
  const currentYearNow = new Date().getFullYear();
  const availableYears = React.useMemo(() => {
    const yearSet = new Set<number>();
    for (let y = currentYearNow - 1; y <= currentYearNow + 5; y++) {
      yearSet.add(y);
    }
    yearSet.add(selectedAnio);
    for (const eq of equipos) {
      const d = parseFecha(eq.fecha_proxima);
      if (d && d.getFullYear() >= 2020 && d.getFullYear() <= 2100) yearSet.add(d.getFullYear());
    }
    for (const inst of instrumentos) {
      const d = parseFecha(inst.fecha_proxima);
      if (d && d.getFullYear() >= 2020 && d.getFullYear() <= 2100) yearSet.add(d.getFullYear());
    }
    for (const cal of calibraciones) {
      const d = parseFecha(cal.fecha_programada || cal.fecha_real);
      if (d && d.getFullYear() >= 2020 && d.getFullYear() <= 2100) yearSet.add(d.getFullYear());
    }
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [currentYearNow, selectedAnio, equipos, instrumentos, calibraciones]);

  // Client actions
  const addCliente = (c: Cliente) => {
    if (!isSuperAdmin || !auth.currentUser) {
      addToast('Solo el Administrador General puede crear nuevas empresas.', 'error');
      return;
    }
    const empId = makeSafeDocId(c.codigo);
    const clienteClean: Cliente = { ...c, codigo: empId };
    const uid = auth.currentUser.uid;

    void (async () => {
      try {
        await setDoc(
          doc(db, 'empresas', empId),
          stripUndefinedDeep({
            codigo: empId,
            nombre: clienteClean.nombre,
            rut: clienteClean.rut || '',
            direccion: clienteClean.direccion || '',
            telefono: clienteClean.telefono || '',
            correo: clienteClean.correo || '',
            ...(clienteClean.logo ? { logo: clienteClean.logo } : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
        );
        for (const mod of MODULOS_DATOS) {
          await setDoc(doc(db, 'empresas', empId, 'datos', mod), {
            empresaCodigo: empId,
            modulo: mod,
            items: [],
            updatedAt: serverTimestamp(),
            updatedBy: uid
          });
        }
        const nextIds = Array.from(
          new Set([...stateRef.current.clientes.map((cl) => makeSafeDocId(cl.codigo)), empId])
        );
        await persistCatalogo('empresas_index', nextIds);
        addToast(`Empresa "${c.nombre}" creada exitosamente.`);
      } catch (err) {
        addToast('No se pudo crear la empresa en Firestore.', 'error');
        handleFirestoreError(err, OperationType.CREATE, `empresas/${empId}`);
      }
    })();
  };

  const updateCliente = (codigo: string, updated: Cliente) => {
    if (!isCompanyAdmin) {
      addToast('Sin permisos para modificar datos de empresa.', 'error');
      return;
    }
    const empId = makeSafeDocId(codigo);
    const oldCliente = stateRef.current.clientes.find((c) => makeSafeDocId(c.codigo) === empId);

    void (async () => {
      try {
        await updateDoc(
          doc(db, 'empresas', empId),
          stripUndefinedDeep({
            nombre: updated.nombre,
            rut: updated.rut || '',
            direccion: updated.direccion || '',
            telefono: updated.telefono || '',
            correo: updated.correo || '',
            ...(updated.logo !== undefined ? { logo: updated.logo } : {}),
            updatedAt: serverTimestamp()
          })
        );

        // Propagate company rename across its own module items & user roster
        if (oldCliente && oldCliente.nombre !== updated.nombre) {
          const modsToRename: ModuloDatosName[] = [
            'equipos',
            'instrumentos',
            'correctivos',
            'ordenesTrabajo',
            'calibraciones',
            'repuestos'
          ];
          for (const mod of modsToRename) {
            const currentArr = (modulesMapRef.current[empId]?.[mod] as Array<Record<string, unknown>>) || [];
            if (currentArr.length > 0) {
              const updatedArr = currentArr.map((item) =>
                item.cliente === oldCliente.nombre ? { ...item, cliente: updated.nombre } : item
              );
              await persistEmpresaModulo(empId, mod, updatedArr);
            }
          }
          await syncEmpresaNombreEnRoster(empId, updated.nombre);
          if (selectedCliente === oldCliente.nombre) {
            setSelectedClienteState(updated.nombre);
          }
        }
        addToast(`Empresa "${updated.nombre}" actualizada.`);
      } catch (err) {
        addToast('No se pudo actualizar la empresa.', 'error');
        handleFirestoreError(err, OperationType.UPDATE, `empresas/${empId}`);
      }
    })();
  };

  const deleteCliente = (codigo: string, nombre: string) => {
    if (!isSuperAdmin) {
      addToast('Solo el Administrador General puede eliminar empresas.', 'error');
      return;
    }
    const empId = makeSafeDocId(codigo);
    void (async () => {
      try {
        for (const mod of MODULOS_DATOS) {
          try {
            await deleteDoc(doc(db, 'empresas', empId, 'datos', mod));
          } catch {
            // Ignore if module doc doesn't exist
          }
        }
        try {
          await deleteDoc(doc(db, 'empresas', empId, 'config', 'usuarios'));
        } catch {
          // Ignore if no roster
        }
        await deleteDoc(doc(db, 'empresas', empId));
        const nextIds = stateRef.current.clientes
          .map((cl) => makeSafeDocId(cl.codigo))
          .filter((id) => id !== empId);
        await persistCatalogo('empresas_index', nextIds);

        if (selectedCliente === nombre) {
          const rest = stateRef.current.clientes.filter((c) => makeSafeDocId(c.codigo) !== empId);
          setSelectedCliente(rest.length > 0 ? rest[0].nombre : 'Todos');
        }
        addToast(`Empresa "${nombre}" y sus datos asociados fueron eliminados.`, 'warning');
      } catch (err) {
        addToast('Error al eliminar la empresa.', 'error');
        handleFirestoreError(err, OperationType.DELETE, `empresas/${empId}`);
      }
    })();
  };

  // Systems
  const addSistema = (s: Sistema) => {
    const next = [...stateRef.current.sistemas, s];
    setSistemas(next);
    void persistCatalogo('sistemas', next);
    addToast(`Sistema "${s.nombre}" agregado.`);
  };

  const updateSistema = (codigo: string, updated: Sistema) => {
    const next = stateRef.current.sistemas.map((s) => (s.codigo_sis === codigo ? updated : s));
    setSistemas(next);
    void persistCatalogo('sistemas', next);
    addToast(`Sistema "${updated.nombre}" actualizado.`);
  };

  const deleteSistema = (codigo: string) => {
    const next = stateRef.current.sistemas.filter((s) => s.codigo_sis !== codigo);
    setSistemas(next);
    void persistCatalogo('sistemas', next);
    addToast(`Sistema eliminado.`, 'info');
  };

  // Frequencies
  const addFrecuencia = (f: FrecuenciaConfig) => {
    const next = [...stateRef.current.frecuencias, f];
    setFrecuencias(next);
    void persistCatalogo('frecuencias', next);
    addToast(`Frecuencia "${f.nombre_freq}" configurada.`);
  };

  const updateFrecuencia = (nombre: string, updated: FrecuenciaConfig) => {
    const next = stateRef.current.frecuencias.map((f) => (f.nombre_freq === nombre ? updated : f));
    setFrecuencias(next);
    void persistCatalogo('frecuencias', next);
    addToast(`Frecuencia "${updated.nombre_freq}" actualizada.`);
  };

  const deleteFrecuencia = (nombre: string) => {
    const next = stateRef.current.frecuencias.filter((f) => f.nombre_freq !== nombre);
    setFrecuencias(next);
    void persistCatalogo('frecuencias', next);
    addToast(`Frecuencia eliminada.`, 'info');
  };

  // Technicians
  const addTecnico = (t: Tecnico) => {
    const next = [...stateRef.current.tecnicos, t];
    setTecnicos(next);
    void persistCatalogo('tecnicos', next);
    addToast(`Técnico "${t.nombre}" dado de alta.`);
  };

  const updateTecnico = (codigo: string, updated: Tecnico) => {
    const next = stateRef.current.tecnicos.map((t) => (t.codigo_tec === codigo ? updated : t));
    setTecnicos(next);
    void persistCatalogo('tecnicos', next);
    addToast(`Técnico "${updated.nombre}" actualizado.`);
  };

  const deleteTecnico = (codigo: string) => {
    const next = stateRef.current.tecnicos.filter((t) => t.codigo_tec !== codigo);
    setTecnicos(next);
    void persistCatalogo('tecnicos', next);
    addToast(`Técnico eliminado de la lista de activos.`, 'info');
  };

  // Equipment
  const addEquipo = (e: Equipo) => {
    const empId = resolveEmpresaId(e.cliente);
    const clienteObj = stateRef.current.clientes.find((c) => makeSafeDocId(c.codigo) === empId);
    const equipoConId: Equipo = {
      ...e,
      cliente: clienteObj?.nombre || e.cliente,
      id: e.id || `${e.codigo_eq}___${e.frecuencia.trim()}`
    };
    const currentEmpItems = (modulesMapRef.current[empId]?.equipos as Equipo[]) || [];
    void persistEmpresaModulo(empId, 'equipos', [...currentEmpItems, equipoConId]);
    addToast(`Equipo "${e.nombre}" (${e.codigo_eq} - ${e.frecuencia}) registrado con éxito.`);
  };

  const updateEquipo = (keyOrCodigo: string, updated: Equipo) => {
    const target = stateRef.current.equipos.find(
      (e) =>
        (e.id && e.id === keyOrCodigo) ||
        `${e.codigo_eq}___${e.frecuencia}` === keyOrCodigo ||
        (e.codigo_eq === keyOrCodigo && (!e.id || e.frecuencia === updated.frecuencia))
    );
    const empId = resolveEmpresaId(updated.cliente || target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.equipos as Equipo[]) || [];
    const nextEmpItems = currentEmpItems.map((e) => {
      const match =
        (e.id && e.id === keyOrCodigo) ||
        `${e.codigo_eq}___${e.frecuencia}` === keyOrCodigo ||
        (e.codigo_eq === keyOrCodigo && (!e.id || e.frecuencia === updated.frecuencia));
      return match ? { ...updated, id: updated.id || e.id || keyOrCodigo } : e;
    });
    void persistEmpresaModulo(empId, 'equipos', nextEmpItems);
    addToast(`Equipo "${updated.nombre}" (${updated.frecuencia}) actualizado.`);
  };

  const deleteEquipo = (codigo_eq: string, frecuencia?: string) => {
    const target = stateRef.current.equipos.find(
      (e) =>
        (e.id && e.id === codigo_eq) ||
        `${e.codigo_eq}___${e.frecuencia.trim()}` === codigo_eq ||
        (frecuencia
          ? e.codigo_eq.toUpperCase() === codigo_eq.toUpperCase() &&
            e.frecuencia.trim().toLowerCase() === frecuencia.trim().toLowerCase()
          : e.codigo_eq === codigo_eq)
    );
    const empId = resolveEmpresaId(target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.equipos as Equipo[]) || [];
    const nextEmpItems = currentEmpItems.filter((e) => {
      if (e.id && e.id === codigo_eq) return false;
      if (`${e.codigo_eq}___${e.frecuencia.trim()}` === codigo_eq) return false;
      if (frecuencia) {
        return !(
          e.codigo_eq.toUpperCase() === codigo_eq.toUpperCase() &&
          e.frecuencia.trim().toLowerCase() === frecuencia.trim().toLowerCase()
        );
      }
      return e.codigo_eq !== codigo_eq;
    });
    void persistEmpresaModulo(empId, 'equipos', nextEmpItems);
    addToast(`Registro de mantenimiento para el equipo eliminado.`, 'info');
  };

  // Instrumentos Metrológicos
  const addInstrumento = (inst: Instrumento) => {
    const empId = resolveEmpresaId(inst.cliente);
    const clienteObj = stateRef.current.clientes.find((c) => makeSafeDocId(c.codigo) === empId);
    const instClean = { ...inst, cliente: clienteObj?.nombre || inst.cliente };
    const currentEmpItems = (modulesMapRef.current[empId]?.instrumentos as Instrumento[]) || [];
    void persistEmpresaModulo(empId, 'instrumentos', [...currentEmpItems, instClean]);
    addToast(`Instrumento "${inst.nombre}" (${inst.codigo_inst}) registrado exitosamente.`);
  };

  const updateInstrumento = (codigo_inst: string, updated: Instrumento) => {
    const target = stateRef.current.instrumentos.find((i) => i.codigo_inst === codigo_inst);
    const empId = resolveEmpresaId(updated.cliente || target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.instrumentos as Instrumento[]) || [];
    const nextEmpItems = currentEmpItems.map((i) => (i.codigo_inst === codigo_inst ? updated : i));
    void persistEmpresaModulo(empId, 'instrumentos', nextEmpItems);
    addToast(`Instrumento "${updated.nombre}" actualizado.`);
  };

  const darDeBajaInstrumento = (codigo_inst: string, fecha_baja: string, motivo_baja: string) => {
    const target = stateRef.current.instrumentos.find((i) => i.codigo_inst === codigo_inst);
    const empId = resolveEmpresaId(target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.instrumentos as Instrumento[]) || [];
    const nextEmpItems = currentEmpItems.map((i) =>
      i.codigo_inst === codigo_inst
        ? { ...i, estado: 'Baja' as const, fecha_baja, motivo_baja }
        : i
    );
    void persistEmpresaModulo(empId, 'instrumentos', nextEmpItems);
    addToast(`Instrumento "${codigo_inst}" dado de baja del servicio activo.`, 'warning');
  };

  const reactivarInstrumento = (codigo_inst: string) => {
    const target = stateRef.current.instrumentos.find((i) => i.codigo_inst === codigo_inst);
    const empId = resolveEmpresaId(target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.instrumentos as Instrumento[]) || [];
    const nextEmpItems = currentEmpItems.map((i) => {
      if (i.codigo_inst === codigo_inst) {
        const { fecha_baja: _fb, motivo_baja: _mb, ...rest } = i;
        return { ...rest, estado: 'Activo' as const };
      }
      return i;
    });
    void persistEmpresaModulo(empId, 'instrumentos', nextEmpItems);
    addToast(`Instrumento "${codigo_inst}" reactivado a estado Activo.`, 'success');
  };

  const deleteInstrumento = (codigo_inst: string) => {
    const target = stateRef.current.instrumentos.find((i) => i.codigo_inst === codigo_inst);
    const empId = resolveEmpresaId(target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.instrumentos as Instrumento[]) || [];
    const nextEmpItems = currentEmpItems.filter((i) => i.codigo_inst !== codigo_inst);
    void persistEmpresaModulo(empId, 'instrumentos', nextEmpItems);
    addToast(`Instrumento "${codigo_inst}" eliminado permanentemente.`, 'info');
  };

  // Preventivos close
  const registrarCierrePreventivo = (data: {
    codigo_eq: string;
    mes_n: number;
    fecha_real: string;
    id_ot: string;
    comentarios: string;
    tecnico: string;
    duracion_horas?: number;
    repuestos_utilizados?: string;
    frecuencia?: string;
  }) => {
    const eqMatch = stateRef.current.equipos.find(
      (e) =>
        e.codigo_eq.trim().toUpperCase() === data.codigo_eq.trim().toUpperCase() &&
        (!data.frecuencia || e.frecuencia.trim().toLowerCase() === data.frecuencia.trim().toLowerCase())
    ) || stateRef.current.equipos.find(
      (e) => e.codigo_eq.trim().toUpperCase() === data.codigo_eq.trim().toUpperCase()
    );
    const empId = resolveEmpresaId(eqMatch?.cliente || (selectedCliente !== 'Todos' ? selectedCliente : undefined));
    const currentEmpItems = (modulesMapRef.current[empId]?.historial as RegistroHistorialMP[]) || [];
    const nuevoRegistro: RegistroHistorialMP = {
      id: `h_${Date.now()}`,
      ...data
    };
    void persistEmpresaModulo(empId, 'historial', [...currentEmpItems, nuevoRegistro]);
    addToast(
      `Cierre preventivo de ${data.id_ot} registrado. El plan del año actual permanece inalterado; la fecha real ajustará el plan del año siguiente.`
    );
  };

  // Correctivos
  const crearCorrectivo = (
    data: Omit<OrdenCorrectivo, 'id_ot' | 'estado' | 'fecha_real' | 'acciones_realizadas'> & {
      id_ot?: string;
    }
  ): string => {
    const dateObj = parseFecha(data.fecha_emision) || new Date();
    const mes = dateObj.getMonth() + 1;
    const anio = dateObj.getFullYear();
    const prefix = `MC-${anio}-${String(mes).padStart(2, '0')}-`;
    const countThisMonth = stateRef.current.correctivos.filter((c) => c.id_ot.startsWith(prefix)).length + 1;
    const folio = data.id_ot || `MC-${anio}-${String(mes).padStart(2, '0')}-${String(countThisMonth).padStart(4, '0')}`;

    const empId = resolveEmpresaId(data.cliente);
    const clienteObj = stateRef.current.clientes.find((c) => makeSafeDocId(c.codigo) === empId);
    const nuevaOrden: OrdenCorrectivo = {
      ...data,
      cliente: clienteObj?.nombre || data.cliente,
      id_ot: folio,
      estado: 'Pendiente',
      fecha_real: '',
      acciones_realizadas: ''
    };
    const currentEmpItems = (modulesMapRef.current[empId]?.correctivos as OrdenCorrectivo[]) || [];
    void persistEmpresaModulo(empId, 'correctivos', [nuevaOrden, ...currentEmpItems]);
    addToast(`Orden Correctiva ${folio} emitida.`);
    return folio;
  };

  const cerrarCorrectivo = (
    id_ot: string,
    data: {
      fecha_real: string;
      tecnico: string;
      acciones_realizadas: string;
      repuestos_utilizados?: string;
    }
  ) => {
    const target = stateRef.current.correctivos.find((c) => c.id_ot === id_ot);
    const empId = resolveEmpresaId(target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.correctivos as OrdenCorrectivo[]) || [];
    const nextEmpItems = currentEmpItems.map((c) => {
      if (c.id_ot === id_ot) {
        const fTent = parseFecha(c.fecha_tentativa);
        const fReal = parseFecha(data.fecha_real) || new Date();
        let nuevoEstado: EstadoOrden = 'Cerrada (A tiempo)';
        if (fTent) {
          fTent.setHours(0, 0, 0, 0);
          fReal.setHours(0, 0, 0, 0);
          const diffDays = Math.round((fReal.getTime() - fTent.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > c.dias_tolerancia) {
            nuevoEstado = 'Cerrada (Fuera de término)';
          }
        }
        return {
          ...c,
          estado: nuevoEstado,
          fecha_real: data.fecha_real,
          tecnico: data.tecnico,
          acciones_realizadas: data.acciones_realizadas,
          repuestos_utilizados: data.repuestos_utilizados || c.repuestos_utilizados
        };
      }
      return c;
    });
    void persistEmpresaModulo(empId, 'correctivos', nextEmpItems);
    addToast(`Orden ${id_ot} cerrada.`);
  };

  const deleteCorrectivo = (id_ot: string) => {
    const target = stateRef.current.correctivos.find((c) => c.id_ot === id_ot);
    const empId = resolveEmpresaId(target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.correctivos as OrdenCorrectivo[]) || [];
    void persistEmpresaModulo(
      empId,
      'correctivos',
      currentEmpItems.filter((c) => c.id_ot !== id_ot)
    );
    addToast(`Orden Correctiva ${id_ot} eliminada.`, 'info');
  };

  // Ordenes de Trabajo
  const crearOrdenTrabajo = (
    data: Omit<OrdenTrabajoOT, 'id_ot' | 'estado' | 'fecha_real' | 'acciones_realizadas'> & {
      id_ot?: string;
    }
  ): string => {
    const dateObj = parseFecha(data.fecha_emision) || new Date();
    const mes = dateObj.getMonth() + 1;
    const anio = dateObj.getFullYear();
    const prefix = `OT-${anio}-${String(mes).padStart(2, '0')}-`;
    const countThisMonth = stateRef.current.ordenesTrabajo.filter((o) => o.id_ot.startsWith(prefix)).length + 1;
    const folio = data.id_ot || `OT-${anio}-${String(mes).padStart(2, '0')}-${String(countThisMonth).padStart(4, '0')}`;

    const empId = resolveEmpresaId(data.cliente);
    const clienteObj = stateRef.current.clientes.find((c) => makeSafeDocId(c.codigo) === empId);
    const nuevaOrden: OrdenTrabajoOT = {
      ...data,
      cliente: clienteObj?.nombre || data.cliente,
      id_ot: folio,
      estado: 'Pendiente',
      fecha_real: '',
      acciones_realizadas: ''
    };
    const currentEmpItems = (modulesMapRef.current[empId]?.ordenesTrabajo as OrdenTrabajoOT[]) || [];
    void persistEmpresaModulo(empId, 'ordenesTrabajo', [nuevaOrden, ...currentEmpItems]);
    addToast(`Orden de Trabajo ${folio} emitida.`);
    return folio;
  };

  const cerrarOrdenTrabajo = (
    id_ot: string,
    data: {
      fecha_real: string;
      tecnico: string;
      acciones_realizadas: string;
      materiales_utilizados?: string;
    }
  ) => {
    const target = stateRef.current.ordenesTrabajo.find((o) => o.id_ot === id_ot);
    const empId = resolveEmpresaId(target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.ordenesTrabajo as OrdenTrabajoOT[]) || [];
    const nextEmpItems = currentEmpItems.map((o) => {
      if (o.id_ot === id_ot) {
        const fTent = parseFecha(o.fecha_tentativa);
        const fReal = parseFecha(data.fecha_real) || new Date();
        let nuevoEstado: EstadoOrden = 'Cerrada (A tiempo)';
        if (fTent) {
          fTent.setHours(0, 0, 0, 0);
          fReal.setHours(0, 0, 0, 0);
          const diffDays = Math.round((fReal.getTime() - fTent.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > o.dias_tolerancia) {
            nuevoEstado = 'Cerrada (Fuera de término)';
          }
        }
        return {
          ...o,
          estado: nuevoEstado,
          fecha_real: data.fecha_real,
          tecnico: data.tecnico,
          acciones_realizadas: data.acciones_realizadas,
          materiales_utilizados: data.materiales_utilizados || o.materiales_utilizados
        };
      }
      return o;
    });
    void persistEmpresaModulo(empId, 'ordenesTrabajo', nextEmpItems);
    addToast(`Orden de Trabajo ${id_ot} finalizada.`);
  };

  const deleteOrdenTrabajo = (id_ot: string) => {
    const target = stateRef.current.ordenesTrabajo.find((o) => o.id_ot === id_ot);
    const empId = resolveEmpresaId(target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.ordenesTrabajo as OrdenTrabajoOT[]) || [];
    void persistEmpresaModulo(
      empId,
      'ordenesTrabajo',
      currentEmpItems.filter((o) => o.id_ot !== id_ot)
    );
    addToast(`Orden de Trabajo ${id_ot} eliminada.`, 'info');
  };

  // Calibraciones
  const crearOrdenCalibracion = (
    data: Omit<OrdenCalibracion, 'id_ot' | 'estado' | 'fecha_real'> & {
      id_ot?: string;
    }
  ): string => {
    const dateObj = parseFecha(data.fecha_programada) || parseFecha(data.fecha_emision) || new Date();
    const mes = dateObj.getMonth() + 1;
    const anio = dateObj.getFullYear();
    const prefix = `CAL-${anio}-${String(mes).padStart(2, '0')}-`;
    const existingSet = new Set(stateRef.current.calibraciones.map((c) => c.id_ot));
    let seq = stateRef.current.calibraciones.filter((c) => c.id_ot.startsWith(prefix)).length + 1;
    while (existingSet.has(`${prefix}${String(seq).padStart(4, '0')}`)) {
      seq++;
    }
    const folio = data.id_ot || `${prefix}${String(seq).padStart(4, '0')}`;

    const empId = resolveEmpresaId(data.cliente);
    const clienteObj = stateRef.current.clientes.find((c) => makeSafeDocId(c.codigo) === empId);
    const nuevaCal: OrdenCalibracion = {
      ...data,
      cliente: clienteObj?.nombre || data.cliente,
      id_ot: folio,
      estado: 'Pendiente',
      fecha_real: ''
    };
    const currentEmpItems = (modulesMapRef.current[empId]?.calibraciones as OrdenCalibracion[]) || [];
    void persistEmpresaModulo(empId, 'calibraciones', [nuevaCal, ...currentEmpItems]);
    addToast(`Orden de Calibración ${folio} emitida.`);
    return folio;
  };

  const crearOrdenesCalibracionLote = (
    orders: Array<
      Omit<OrdenCalibracion, 'id_ot' | 'estado' | 'fecha_real'> & {
        id_ot?: string;
        mes_objetivo?: number;
        anio_objetivo?: number;
      }
    >
  ): OrdenCalibracion[] => {
    if (!orders.length) return [];

    const existingSet = new Set(stateRef.current.calibraciones.map((c) => c.id_ot));
    const nuevasOrdenes: OrdenCalibracion[] = [];

    for (const item of orders) {
      const dateObj = parseFecha(item.fecha_programada) || parseFecha(item.fecha_emision) || new Date();
      const mes = item.mes_objetivo || dateObj.getMonth() + 1;
      const anio = item.anio_objetivo || dateObj.getFullYear() || selectedAnio;
      const prefix = `CAL-${anio}-${String(mes).padStart(2, '0')}-`;

      let seq = 1;
      while (existingSet.has(`${prefix}${String(seq).padStart(4, '0')}`)) {
        seq++;
      }
      const folio = item.id_ot || `${prefix}${String(seq).padStart(4, '0')}`;
      existingSet.add(folio);

      const { mes_objetivo: _m, anio_objetivo: _a, ...rest } = item;
      nuevasOrdenes.push({
        ...rest,
        id_ot: folio,
        estado: 'Pendiente',
        fecha_real: ''
      });
    }

    // Group by company and persist per company
    const byEmp = new Map<string, OrdenCalibracion[]>();
    for (const ord of nuevasOrdenes) {
      const empId = resolveEmpresaId(ord.cliente);
      if (!byEmp.has(empId)) byEmp.set(empId, []);
      byEmp.get(empId)!.push(ord);
    }

    for (const [empId, list] of byEmp.entries()) {
      const currentEmpItems = (modulesMapRef.current[empId]?.calibraciones as OrdenCalibracion[]) || [];
      void persistEmpresaModulo(empId, 'calibraciones', [...list, ...currentEmpItems]);
    }

    addToast(
      `Se emitieron ${nuevasOrdenes.length} orden${nuevasOrdenes.length === 1 ? '' : 'es'} de calibración para el mes seleccionado.`,
      'success'
    );
    return nuevasOrdenes;
  };

  const cerrarOrdenCalibracion = (
    id_ot: string,
    data: {
      fecha_real: string;
      dictamen: 'Conforme' | 'Ajustado y Conforme' | 'No Conforme';
      error_max_hallado: string;
      patron_utilizado?: string;
      trazabilidad_patron?: string;
      metrologo_laboratorio: string;
      puntos_calibracion?: PuntoCalibracion[];
      observaciones?: string;
      repuestos_utilizados?: string;
      numero_certificado?: string;
      proxima_calibracion?: string;
    }
  ) => {
    const target = stateRef.current.calibraciones.find((c) => c.id_ot === id_ot);
    const empId = resolveEmpresaId(target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.calibraciones as OrdenCalibracion[]) || [];
    const nextEmpItems = currentEmpItems.map((c) => {
      if (c.id_ot === id_ot) {
        const fTent = parseFecha(c.fecha_tentativa);
        const fReal = parseFecha(data.fecha_real) || new Date();
        let nuevoEstado: EstadoCalibracion = 'Conforme (A tiempo)';
        if (data.dictamen === 'No Conforme') {
          nuevoEstado = 'No Conforme / Fuera de Tolerancia';
        } else if (fTent) {
          fTent.setHours(0, 0, 0, 0);
          fReal.setHours(0, 0, 0, 0);
          const diffDays = Math.round((fReal.getTime() - fTent.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > c.dias_tolerancia) {
            nuevoEstado = 'Conforme (Fuera de término)';
          }
        }
        const calcNextDate = addFrequencyStep(fReal, c.frecuencia_calibracion, stateRef.current.frecuencias, fReal.getDate());
        const nextCalStr = data.proxima_calibracion || formatFechaDDMMYYYY(calcNextDate);

        return {
          ...c,
          estado: nuevoEstado,
          fecha_real: data.fecha_real,
          dictamen: data.dictamen,
          error_max_hallado: data.error_max_hallado,
          patron_utilizado: data.patron_utilizado || c.patron_utilizado,
          trazabilidad_patron: data.trazabilidad_patron || c.trazabilidad_patron,
          metrologo_laboratorio: data.metrologo_laboratorio,
          puntos_calibracion: data.puntos_calibracion || c.puntos_calibracion,
          observaciones: data.observaciones || c.observaciones,
          repuestos_utilizados: data.repuestos_utilizados || c.repuestos_utilizados,
          numero_certificado: data.numero_certificado || `CERT-${id_ot.replace('CAL-', '')}`,
          proxima_calibracion: nextCalStr
        };
      }
      return c;
    });
    void persistEmpresaModulo(empId, 'calibraciones', nextEmpItems);
    addToast(
      `Calibración ${id_ot} certificada (${data.dictamen}). El plan del año en curso se mantiene inalterado; la fecha real ajustará el plan del próximo año.`
    );
  };

  const certificarCalibracionProyectada = (
    orderData: Omit<OrdenCalibracion, 'id_ot' | 'estado' | 'fecha_real'> & {
      id_ot?: string;
      mes_objetivo?: number;
      anio_objetivo?: number;
    },
    cierreData: {
      fecha_real: string;
      dictamen: 'Conforme' | 'Ajustado y Conforme' | 'No Conforme';
      error_max_hallado: string;
      patron_utilizado?: string;
      trazabilidad_patron?: string;
      metrologo_laboratorio: string;
      puntos_calibracion?: PuntoCalibracion[];
      observaciones?: string;
      repuestos_utilizados?: string;
      numero_certificado?: string;
      proxima_calibracion?: string;
    }
  ): string => {
    const dateObj = parseFecha(orderData.fecha_programada) || parseFecha(orderData.fecha_emision) || new Date();
    const mes = orderData.mes_objetivo || dateObj.getMonth() + 1;
    const anio = orderData.anio_objetivo || dateObj.getFullYear() || selectedAnio;
    const prefix = `CAL-${anio}-${String(mes).padStart(2, '0')}-`;
    const existingSet = new Set(stateRef.current.calibraciones.map((c) => c.id_ot));
    let seq = stateRef.current.calibraciones.filter((c) => c.id_ot.startsWith(prefix)).length + 1;
    while (existingSet.has(`${prefix}${String(seq).padStart(4, '0')}`)) {
      seq++;
    }
    const folio = orderData.id_ot || `${prefix}${String(seq).padStart(4, '0')}`;

    const fTent = parseFecha(orderData.fecha_tentativa);
    const fReal = parseFecha(cierreData.fecha_real) || new Date();
    let nuevoEstado: EstadoCalibracion = 'Conforme (A tiempo)';
    if (cierreData.dictamen === 'No Conforme') {
      nuevoEstado = 'No Conforme / Fuera de Tolerancia';
    } else if (fTent) {
      fTent.setHours(0, 0, 0, 0);
      fReal.setHours(0, 0, 0, 0);
      const diffDays = Math.round((fReal.getTime() - fTent.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > orderData.dias_tolerancia) {
        nuevoEstado = 'Conforme (Fuera de término)';
      }
    }

    const calcNextDate = addFrequencyStep(
      fReal,
      orderData.frecuencia_calibracion,
      stateRef.current.frecuencias,
      fReal.getDate()
    );
    const nextCalStr = cierreData.proxima_calibracion || formatFechaDDMMYYYY(calcNextDate);
    const { mes_objetivo: _m, anio_objetivo: _a, ...restOrder } = orderData;

    const empId = resolveEmpresaId(restOrder.cliente);
    const clienteObj = stateRef.current.clientes.find((c) => makeSafeDocId(c.codigo) === empId);

    const nuevaCertificada: OrdenCalibracion = {
      ...restOrder,
      cliente: clienteObj?.nombre || restOrder.cliente,
      id_ot: folio,
      estado: nuevoEstado,
      fecha_real: cierreData.fecha_real,
      dictamen: cierreData.dictamen,
      error_max_hallado: cierreData.error_max_hallado,
      patron_utilizado: cierreData.patron_utilizado || restOrder.patron_utilizado,
      trazabilidad_patron: cierreData.trazabilidad_patron || restOrder.trazabilidad_patron,
      metrologo_laboratorio: cierreData.metrologo_laboratorio,
      puntos_calibracion: cierreData.puntos_calibracion,
      observaciones: cierreData.observaciones || restOrder.observaciones,
      repuestos_utilizados: cierreData.repuestos_utilizados,
      numero_certificado: cierreData.numero_certificado || `CAL-CERT-${folio.replace('CAL-', '')}`,
      proxima_calibracion: nextCalStr
    };

    const currentEmpItems = (modulesMapRef.current[empId]?.calibraciones as OrdenCalibracion[]) || [];
    void persistEmpresaModulo(empId, 'calibraciones', [nuevaCertificada, ...currentEmpItems]);
    addToast(
      `Calibración ${folio} certificada (${cierreData.dictamen}). El plan actual permanece intacto; la fecha real ajustará el plan del año siguiente.`
    );
    return folio;
  };

  const deleteOrdenCalibracion = (id_ot: string) => {
    const target = stateRef.current.calibraciones.find((c) => c.id_ot === id_ot);
    const empId = resolveEmpresaId(target?.cliente);
    const currentEmpItems = (modulesMapRef.current[empId]?.calibraciones as OrdenCalibracion[]) || [];
    void persistEmpresaModulo(
      empId,
      'calibraciones',
      currentEmpItems.filter((c) => c.id_ot !== id_ot)
    );
    addToast(`Orden de Calibración ${id_ot} eliminada.`, 'info');
  };

  // Gestión de Repuestos & Stock Crítico
  const addRepuesto = (rep: Repuesto) => {
    const empId = resolveEmpresaId(rep.cliente);
    const clienteObj = stateRef.current.clientes.find((c) => makeSafeDocId(c.codigo) === empId);
    const nuevoRepuesto: Repuesto = {
      ...rep,
      cliente: rep.cliente === 'Todas las Plantas' && isSuperAdmin ? rep.cliente : (clienteObj?.nombre || rep.cliente),
      id: rep.id || `REP-${Date.now()}`
    };

    const currentRepItems = (modulesMapRef.current[empId]?.repuestos as Repuesto[]) || [];
    void persistEmpresaModulo(empId, 'repuestos', [nuevoRepuesto, ...currentRepItems]);

    if (nuevoRepuesto.stock_actual > 0) {
      const hoy = new Date();
      const movInicial: MovimientoRepuesto = {
        id: `MOV-${Date.now()}`,
        repuesto_id: nuevoRepuesto.id,
        codigo_repuesto: nuevoRepuesto.codigo_repuesto,
        nombre_repuesto: nuevoRepuesto.nombre,
        tipo: 'Entrada',
        cantidad: nuevoRepuesto.stock_actual,
        stock_anterior: 0,
        stock_nuevo: nuevoRepuesto.stock_actual,
        fecha: `${formatFechaDDMMYYYY(hoy)} ${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`,
        motivo: 'Inventario inicial al dar de alta el repuesto',
        solicitante: userProfile?.nombre || 'Administrador de Almacén'
      };
      const currentMovs = (modulesMapRef.current[empId]?.movimientosRepuestos as MovimientoRepuesto[]) || [];
      void persistEmpresaModulo(empId, 'movimientosRepuestos', [movInicial, ...currentMovs]);
    }

    addToast(`Repuesto "${nuevoRepuesto.nombre}" (${nuevoRepuesto.codigo_repuesto}) ingresado al inventario.`);
  };

  const updateRepuesto = (id: string, updated: Repuesto) => {
    const target = stateRef.current.repuestos.find((r) => r.id === id || r.codigo_repuesto === id);
    const empId = resolveEmpresaId(target?.cliente || updated.cliente);
    const currentRepItems = (modulesMapRef.current[empId]?.repuestos as Repuesto[]) || [];
    let ajusteMov: MovimientoRepuesto | null = null;

    const nextRepItems = currentRepItems.map((r) => {
      if (r.id === id || r.codigo_repuesto === id) {
        if (updated.stock_actual !== r.stock_actual) {
          const hoy = new Date();
          const dif = updated.stock_actual - r.stock_actual;
          ajusteMov = {
            id: `MOV-${Date.now()}`,
            repuesto_id: r.id,
            codigo_repuesto: updated.codigo_repuesto,
            nombre_repuesto: updated.nombre,
            tipo: 'Ajuste',
            cantidad: Math.abs(dif),
            stock_anterior: r.stock_actual,
            stock_nuevo: updated.stock_actual,
            fecha: `${formatFechaDDMMYYYY(hoy)} ${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`,
            motivo: 'Ajuste manual de inventario en modificación de ficha',
            solicitante: userProfile?.nombre || 'Control de Almacén'
          };
        }
        return { ...updated, id: r.id };
      }
      return r;
    });

    void persistEmpresaModulo(empId, 'repuestos', nextRepItems);
    if (ajusteMov) {
      const currentMovs = (modulesMapRef.current[empId]?.movimientosRepuestos as MovimientoRepuesto[]) || [];
      void persistEmpresaModulo(empId, 'movimientosRepuestos', [ajusteMov, ...currentMovs]);
    }
    addToast(`Ficha del repuesto "${updated.nombre}" actualizada.`);
  };

  const deleteRepuesto = (id: string) => {
    const target = stateRef.current.repuestos.find((r) => r.id === id || r.codigo_repuesto === id);
    const empId = resolveEmpresaId(target?.cliente);
    const currentRepItems = (modulesMapRef.current[empId]?.repuestos as Repuesto[]) || [];
    void persistEmpresaModulo(
      empId,
      'repuestos',
      currentRepItems.filter((r) => r.id !== id && r.codigo_repuesto !== id)
    );
    addToast(`Repuesto eliminado del catálogo de almacén.`, 'info');
  };

  const registrarMovimientoStock = (data: {
    repuesto_id: string;
    tipo: 'Entrada' | 'Salida' | 'Ajuste';
    cantidad: number;
    motivo: string;
    ot_asociada?: string;
    equipo_asociado?: string;
    solicitante: string;
  }) => {
    const target = stateRef.current.repuestos.find(
      (r) => r.id === data.repuesto_id || r.codigo_repuesto === data.repuesto_id
    );
    if (!target) {
      addToast('No se encontró el repuesto para registrar el movimiento.', 'error');
      return;
    }

    const empId = resolveEmpresaId(target.cliente);
    const stockAnterior = target.stock_actual;
    let stockNuevo = stockAnterior;
    if (data.tipo === 'Entrada') stockNuevo = stockAnterior + Math.max(0, data.cantidad);
    else if (data.tipo === 'Salida') stockNuevo = Math.max(0, stockAnterior - Math.max(0, data.cantidad));
    else if (data.tipo === 'Ajuste') stockNuevo = Math.max(0, data.cantidad);

    const currentRepItems = (modulesMapRef.current[empId]?.repuestos as Repuesto[]) || [];
    const nextRepItems = currentRepItems.map((r) => {
      if (r.id === target.id) {
        return {
          ...r,
          stock_actual: stockNuevo,
          fecha_ultima_compra:
            data.tipo === 'Entrada' ? formatFechaDDMMYYYY(new Date()) : r.fecha_ultima_compra
        };
      }
      return r;
    });

    const hoy = new Date();
    const nuevoMov: MovimientoRepuesto = {
      id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      repuesto_id: target.id,
      codigo_repuesto: target.codigo_repuesto,
      nombre_repuesto: target.nombre,
      tipo: data.tipo,
      cantidad: data.cantidad,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      fecha: `${formatFechaDDMMYYYY(hoy)} ${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`,
      motivo: data.motivo,
      ot_asociada: data.ot_asociada,
      equipo_asociado: data.equipo_asociado,
      solicitante: data.solicitante
    };

    const currentMovs = (modulesMapRef.current[empId]?.movimientosRepuestos as MovimientoRepuesto[]) || [];
    void persistEmpresaModulo(empId, 'repuestos', nextRepItems);
    void persistEmpresaModulo(empId, 'movimientosRepuestos', [nuevoMov, ...currentMovs]);

    if (stockNuevo <= target.stock_minimo) {
      addToast(
        `Movimiento registrado. ¡ALERTA! El stock de ${target.nombre} está en ${stockNuevo} (Mínimo: ${target.stock_minimo}).`,
        'warning'
      );
    } else {
      addToast(
        `Movimiento de ${data.tipo} (${data.cantidad}) registrado. Nuevo stock: ${stockNuevo} ${target.unidad_medida}.`,
        'success'
      );
    }
  };

  const registrarSalidasStockBatch = (
    items: Array<{ repuesto_id: string; cantidad: number }>,
    meta: {
      motivo: string;
      ot_asociada?: string;
      equipo_asociado?: string;
      solicitante: string;
    }
  ): string[] => {
    const validItems = items.filter((i) => i.cantidad > 0);
    if (validItems.length === 0) return [];

    const qtyById = new Map<string, number>();
    for (const item of validItems) {
      qtyById.set(item.repuesto_id, (qtyById.get(item.repuesto_id) || 0) + item.cantidad);
    }

    const hoy = new Date();
    const fechaStr = `${formatFechaDDMMYYYY(hoy)} ${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`;
    const summaryLabels: string[] = [];
    const lowStockAlerts: string[] = [];
    const movsByEmp = new Map<string, MovimientoRepuesto[]>();
    const qtyByEmpAndRep = new Map<string, Map<string, number>>();

    for (const [repId, qty] of qtyById.entries()) {
      const target = stateRef.current.repuestos.find((r) => r.id === repId || r.codigo_repuesto === repId);
      if (!target) continue;
      const empId = resolveEmpresaId(target.cliente);
      const stockAnterior = target.stock_actual;
      const stockNuevo = Math.max(0, stockAnterior - qty);

      summaryLabels.push(`[${target.codigo_repuesto}] ${target.nombre} (x${qty} ${target.unidad_medida})`);
      if (stockNuevo <= target.stock_minimo) {
        lowStockAlerts.push(`${target.nombre} (${stockNuevo} ${target.unidad_medida})`);
      }

      if (!movsByEmp.has(empId)) movsByEmp.set(empId, []);
      movsByEmp.get(empId)!.push({
        id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        repuesto_id: target.id,
        codigo_repuesto: target.codigo_repuesto,
        nombre_repuesto: target.nombre,
        tipo: 'Salida',
        cantidad: qty,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        fecha: fechaStr,
        motivo: meta.motivo,
        ot_asociada: meta.ot_asociada,
        equipo_asociado: meta.equipo_asociado,
        solicitante: meta.solicitante
      });

      if (!qtyByEmpAndRep.has(empId)) qtyByEmpAndRep.set(empId, new Map());
      qtyByEmpAndRep.get(empId)!.set(target.id, qty);
    }

    for (const [empId, repQtyMap] of qtyByEmpAndRep.entries()) {
      const currentRepItems = (modulesMapRef.current[empId]?.repuestos as Repuesto[]) || [];
      const nextRepItems = currentRepItems.map((r) => {
        const qty = repQtyMap.get(r.id);
        return qty ? { ...r, stock_actual: Math.max(0, r.stock_actual - qty) } : r;
      });
      const currentMovs = (modulesMapRef.current[empId]?.movimientosRepuestos as MovimientoRepuesto[]) || [];
      const newMovs = movsByEmp.get(empId) || [];
      void persistEmpresaModulo(empId, 'repuestos', nextRepItems);
      void persistEmpresaModulo(empId, 'movimientosRepuestos', [...newMovs, ...currentMovs]);
    }

    if (summaryLabels.length > 0) {
      if (lowStockAlerts.length > 0) {
        addToast(
          `Stock descontado (${summaryLabels.length} ítem${summaryLabels.length > 1 ? 's' : ''}). ¡ALERTA STOCK BAJO!: ${lowStockAlerts.join(', ')}.`,
          'warning'
        );
      } else {
        addToast(
          `Se descontaron ${summaryLabels.length} repuesto${summaryLabels.length > 1 ? 's' : ''} del inventario de almacén.`,
          'info'
        );
      }
    }

    return summaryLabels;
  };

  const resetAllData = () => {
    if (!isSuperAdmin || !auth.currentUser) {
      addToast('Solo el Administrador General puede restablecer los datos globales.', 'error');
      return;
    }
    const uid = auth.currentUser.uid;
    void (async () => {
      try {
        await persistCatalogo('sistemas', INITIAL_SISTEMAS);
        await persistCatalogo('frecuencias', INITIAL_FRECUENCIAS);
        await persistCatalogo('tecnicos', INITIAL_TECNICOS);

        const initIds = INITIAL_CLIENTES.map((c) => makeSafeDocId(c.codigo));
        for (const existingCli of stateRef.current.clientes) {
          const id = makeSafeDocId(existingCli.codigo);
          if (!initIds.includes(id)) {
            for (const mod of MODULOS_DATOS) {
              try {
                await deleteDoc(doc(db, 'empresas', id, 'datos', mod));
              } catch {
                // ignore
              }
            }
            await deleteDoc(doc(db, 'empresas', id));
          }
        }

        for (let i = 0; i < INITIAL_CLIENTES.length; i++) {
          const cli = INITIAL_CLIENTES[i];
          const empId = makeSafeDocId(cli.codigo);
          await setDoc(
            doc(db, 'empresas', empId),
            stripUndefinedDeep({
              codigo: empId,
              nombre: cli.nombre,
              rut: cli.rut || '',
              direccion: cli.direccion || '',
              telefono: cli.telefono || '',
              correo: cli.correo || '',
              ...(cli.logo ? { logo: cli.logo } : {}),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
          );
          const eqEmp = INITIAL_EQUIPOS.filter((e) => e.cliente.trim() === cli.nombre.trim());
          const eqCodes = new Set(eqEmp.map((e) => e.codigo_eq.trim().toUpperCase()));
          const instEmp = INITIAL_INSTRUMENTOS.filter((ins) => ins.cliente.trim() === cli.nombre.trim());
          const histEmp = INITIAL_HISTORIAL.filter((h) => eqCodes.has(h.codigo_eq.trim().toUpperCase()));
          const mcEmp = INITIAL_CORRECTIVOS.filter((c) => c.cliente.trim() === cli.nombre.trim());
          const otEmp = INITIAL_ORDENES_TRABAJO.filter((o) => o.cliente.trim() === cli.nombre.trim());
          const calEmp = INITIAL_CALIBRACIONES.filter((c) => c.cliente.trim() === cli.nombre.trim());
          const repEmp = INITIAL_REPUESTOS.filter(
            (r) => r.cliente.trim() === cli.nombre.trim() || (i === 0 && r.cliente === 'Todas las Plantas')
          );
          const repIds = new Set(repEmp.map((r) => r.id));
          const movEmp = INITIAL_MOVIMIENTOS_REPUESTOS.filter((m) => repIds.has(m.repuesto_id));

          const buckets: Record<ModuloDatosName, unknown[]> = {
            equipos: eqEmp,
            instrumentos: instEmp,
            historial: histEmp,
            correctivos: mcEmp,
            ordenesTrabajo: otEmp,
            calibraciones: calEmp,
            repuestos: repEmp,
            movimientosRepuestos: movEmp
          };
          for (const mod of MODULOS_DATOS) {
            await setDoc(
              doc(db, 'empresas', empId, 'datos', mod),
              stripUndefinedDeep({
                empresaCodigo: empId,
                modulo: mod,
                items: buckets[mod],
                updatedAt: serverTimestamp(),
                updatedBy: uid
              })
            );
          }
        }
        await persistCatalogo('empresas_index', initIds);
        setSelectedCliente(INITIAL_CLIENTES[0]?.nombre || 'Todos');
        addToast('Sistema restaurado a datos iniciales de fábrica en la nube.', 'info');
      } catch (err) {
        addToast('Error al restablecer datos en la nube.', 'error');
        handleFirestoreError(err, OperationType.WRITE, 'empresas');
      }
    })();
  };

  const importBackup = (backup: Record<string, unknown>) => {
    if (!isSuperAdmin || !auth.currentUser) {
      addToast('Solo el Administrador General puede restaurar respaldos globales.', 'error');
      return;
    }
    const uid = auth.currentUser.uid;
    void (async () => {
      try {
        if (Array.isArray(backup.sistemas)) await persistCatalogo('sistemas', backup.sistemas);
        if (Array.isArray(backup.frecuencias)) await persistCatalogo('frecuencias', backup.frecuencias);
        if (Array.isArray(backup.tecnicos)) await persistCatalogo('tecnicos', backup.tecnicos);

        const bClientes = Array.isArray(backup.clientes) ? (backup.clientes as Cliente[]) : stateRef.current.clientes;
        const bEquipos = Array.isArray(backup.equipos) ? (backup.equipos as Equipo[]) : [];
        const bInst = Array.isArray(backup.instrumentos) ? (backup.instrumentos as Instrumento[]) : [];
        const bHist = Array.isArray(backup.historial) ? (backup.historial as RegistroHistorialMP[]) : [];
        const bMc = Array.isArray(backup.correctivos) ? (backup.correctivos as OrdenCorrectivo[]) : [];
        const bOt = Array.isArray(backup.ordenesTrabajo) ? (backup.ordenesTrabajo as OrdenTrabajoOT[]) : [];
        const bCal = Array.isArray(backup.calibraciones) ? (backup.calibraciones as OrdenCalibracion[]) : [];
        const bRep = Array.isArray(backup.repuestos) ? (backup.repuestos as Repuesto[]) : [];
        const bMov = Array.isArray(backup.movimientosRepuestos) ? (backup.movimientosRepuestos as MovimientoRepuesto[]) : [];

        const ids: string[] = [];
        for (let i = 0; i < bClientes.length; i++) {
          const cli = bClientes[i];
          const empId = makeSafeDocId(cli.codigo);
          ids.push(empId);
          await setDoc(
            doc(db, 'empresas', empId),
            stripUndefinedDeep({
              codigo: empId,
              nombre: cli.nombre,
              rut: cli.rut || '',
              direccion: cli.direccion || '',
              telefono: cli.telefono || '',
              correo: cli.correo || '',
              ...(cli.logo ? { logo: cli.logo } : {}),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
          );
          const eqEmp = bEquipos.filter((e) => e.cliente.trim() === cli.nombre.trim());
          const eqCodes = new Set(eqEmp.map((e) => e.codigo_eq.trim().toUpperCase()));
          const instEmp = bInst.filter((ins) => ins.cliente.trim() === cli.nombre.trim());
          const histEmp = bHist.filter((h) => eqCodes.has(h.codigo_eq.trim().toUpperCase()));
          const mcEmp = bMc.filter((c) => c.cliente.trim() === cli.nombre.trim());
          const otEmp = bOt.filter((o) => o.cliente.trim() === cli.nombre.trim());
          const calEmp = bCal.filter((c) => c.cliente.trim() === cli.nombre.trim());
          const repEmp = bRep.filter(
            (r) => r.cliente.trim() === cli.nombre.trim() || (i === 0 && r.cliente === 'Todas las Plantas')
          );
          const repIds = new Set(repEmp.map((r) => r.id));
          const movEmp = bMov.filter((m) => repIds.has(m.repuesto_id));

          const buckets: Record<ModuloDatosName, unknown[]> = {
            equipos: eqEmp,
            instrumentos: instEmp,
            historial: histEmp,
            correctivos: mcEmp,
            ordenesTrabajo: otEmp,
            calibraciones: calEmp,
            repuestos: repEmp,
            movimientosRepuestos: movEmp
          };
          for (const mod of MODULOS_DATOS) {
            await setDoc(
              doc(db, 'empresas', empId, 'datos', mod),
              stripUndefinedDeep({
                empresaCodigo: empId,
                modulo: mod,
                items: buckets[mod],
                updatedAt: serverTimestamp(),
                updatedBy: uid
              })
            );
          }
        }
        await persistCatalogo('empresas_index', ids);
        addToast('Copia de seguridad importada con éxito a la nube.', 'success');
      } catch (e) {
        addToast('Error al importar copia de seguridad.', 'error');
        handleFirestoreError(e, OperationType.WRITE, 'empresas');
      }
    })();
  };

  if (cloudLoading && clientes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <img
            src="/assets/aistudio/prodexus_921c729e.jpeg"
            alt="Prodexus Logo"
            className="h-12 mx-auto object-contain"
          />
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>
              Cargando entorno {isSuperAdmin ? 'multiempresa' : userProfile?.empresaNombre}...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MaintenanceContext.Provider
      value={{
        clientes,
        sistemas,
        frecuencias,
        tecnicos,
        equipos,
        historial,
        correctivos,
        ordenesTrabajo,
        calibraciones,
        instrumentos,
        repuestos,
        movimientosRepuestos,
        selectedCliente,
        setSelectedCliente,
        selectedAnio,
        setSelectedAnio,
        availableYears,
        cloudLoading,
        toasts,
        addToast,
        removeToast,
        confirmAction,
        addCliente,
        updateCliente,
        deleteCliente,
        addSistema,
        updateSistema,
        deleteSistema,
        addFrecuencia,
        updateFrecuencia,
        deleteFrecuencia,
        addTecnico,
        updateTecnico,
        deleteTecnico,
        addEquipo,
        updateEquipo,
        deleteEquipo,
        addInstrumento,
        updateInstrumento,
        darDeBajaInstrumento,
        reactivarInstrumento,
        deleteInstrumento,
        addRepuesto,
        updateRepuesto,
        deleteRepuesto,
        registrarMovimientoStock,
        registrarSalidasStockBatch,
        registrarCierrePreventivo,
        crearCorrectivo,
        cerrarCorrectivo,
        deleteCorrectivo,
        crearOrdenTrabajo,
        cerrarOrdenTrabajo,
        deleteOrdenTrabajo,
        crearOrdenCalibracion,
        crearOrdenesCalibracionLote,
        cerrarOrdenCalibracion,
        certificarCalibracionProyectada,
        deleteOrdenCalibracion,
        resetAllData,
        importBackup
      }}
    >
      {children}
      {confirmRequest && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  confirmRequest.options.tone === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : confirmRequest.options.tone === 'info'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmRequest.options.title || 'Confirmar Acción'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {confirmRequest.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConfirmResolve(false)}
                className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {confirmRequest.options.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmResolve(true)}
                className={`px-4 py-2 font-bold text-white rounded-lg transition-colors shadow-xs ${
                  confirmRequest.options.tone === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : confirmRequest.options.tone === 'info'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmRequest.options.confirmText || 'Confirmar y Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
};
