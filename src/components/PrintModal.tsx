/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Printer, X, FileDown, Loader2 } from 'lucide-react';
import { exportElementToPDF } from '../utils/pdfGenerator';
import { Equipo, OrdenCalibracion } from '../types';
import { useMaintenance } from '../context/MaintenanceContext';

export interface PrintableDocument {
  tipo: 'MP' | 'MC' | 'OT' | 'CAL';
  folio: string;
  equipo: Equipo;
  fechaEmision?: string;
  fechaProgramada?: string;
  fechaTentativa?: string;
  diasTolerancia?: number;
  protocolo?: string[];
  falla?: string;
  trabajo?: string;
  tecnico?: string;
  calibracion?: OrdenCalibracion;
  isCerrada?: boolean;
  fechaReal?: string;
  duracionHoras?: number;
  accionesRealizadas?: string;
  repuestos?: string;
  tareasCompletadas?: string[];
  firmaTecnico?: string;
  firmaSupervisor?: string;
  firmadoPor?: string;
  firmadoSupervisorPor?: string;
  fechaFirmaDigital?: string;
  ejecucionDigital?: boolean;
}

interface PrintModalProps {
  documents: PrintableDocument[];
  onClose: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({ documents, onClose }) => {
  const { clientes, selectedAnio, addToast } = useMaintenance();
  const printDocRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!documents.length) return null;

  const handleDownloadPDF = async () => {
    if (!printDocRef.current) return;
    try {
      setIsGenerating(true);
      addToast('Generando documento PDF...', 'info');
      const name = documents.length === 1
        ? `Orden_${documents[0].tipo}_${documents[0].folio}`
        : `Lote_Ordenes_${documents.length}`;
      await exportElementToPDF(printDocRef.current, name, 'portrait');
      addToast('PDF descargado exitosamente.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Error al generar el PDF. Intente nuevamente.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
      addToast('Si el cuadro de impresión no se abre en la vista previa embebida, use el botón "Descargar PDF".', 'info');
    } catch (err) {
      console.warn('Direct print blocked by sandbox, downloading PDF instead', err);
      handleDownloadPDF();
    }
  };

  return (
    <div className="print-modal-root fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-6">
      {/* Top Bar for Action (Hidden on Print) */}
      <div className="sticky top-0 z-10 w-full max-w-4xl bg-white border border-slate-200 rounded-xl p-3 shadow-lg flex items-center justify-between gap-4 mb-4 no-print">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-bold text-slate-900">
            Vista Previa de Impresión ({documents.length} {documents.length === 1 ? 'orden' : 'órdenes'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-xs"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{isGenerating ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Orden</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Paper Sheets */}
      <div ref={printDocRef} className="w-full max-w-4xl space-y-8 print-container">
        {documents.map((doc, idx) => {
          const isPreventivo = doc.tipo === 'MP';
          const isCorrectivo = doc.tipo === 'MC';
          const isOT = doc.tipo === 'OT';
          const isCalibracion = doc.tipo === 'CAL';
          const isCalPendiente = isCalibracion && (!doc.calibracion?.fecha_real || doc.calibracion?.estado === 'Pendiente');
          const folioYearMatch = doc.folio.match(/-(20\d{2})-/);
          const docYear = folioYearMatch ? folioYearMatch[1] : String(selectedAnio || new Date().getFullYear());
          const effFirmaTecnico = doc.firmaTecnico || doc.calibracion?.firma_tecnico;
          const effFirmaSupervisor = doc.firmaSupervisor || doc.calibracion?.firma_supervisor;
          const effFirmadoPor = doc.firmadoPor || doc.calibracion?.firmado_por || doc.tecnico || doc.calibracion?.metrologo_laboratorio;
          const effFirmadoSupervisorPor = doc.firmadoSupervisorPor || doc.calibracion?.firmado_supervisor_por;
          const effFechaReal = doc.fechaReal || doc.calibracion?.fecha_real;
          const effFechaFirma = doc.fechaFirmaDigital || doc.calibracion?.fecha_firma_digital;

          const clienteObj =
            clientes.find(
              c => c.nombre.trim().toLowerCase() === doc.equipo.cliente.trim().toLowerCase()
            ) || (clientes.length === 1 ? clientes[0] : undefined);

          return (
            <div
              key={`${doc.folio}_${idx}`}
              className="print-sheet print-sheet-portrait bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-md border border-slate-300 page-break-after flex flex-col justify-between gap-6 min-h-[272mm]"
            >
              <div className="space-y-5">
              {/* Header with Prodexus & Client Logos */}
              <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 sm:h-14 max-w-[160px] bg-white rounded-lg border border-slate-300 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                    <img
                      src="/assets/aistudio/prodexus_921c729e.jpeg"
                      alt="Prodexus CMMS"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  {clienteObj?.logo ? (
                    <div className="h-12 sm:h-14 max-w-[140px] bg-white rounded-lg border border-slate-300 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={clienteObj.logo}
                        alt={`Logo ${clienteObj.nombre}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (clienteObj?.nombre || doc.equipo.cliente) ? (
                    <div className="h-12 sm:h-14 max-w-[165px] bg-slate-900 text-white rounded-lg border border-slate-700 px-3 flex flex-col justify-center shrink-0 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-tight leading-tight line-clamp-2">
                        {clienteObj?.nombre || doc.equipo.cliente}
                      </span>
                      {clienteObj?.rut && (
                        <span className="text-[8px] font-mono text-slate-300">{clienteObj.rut}</span>
                      )}
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase leading-tight">
                        {clienteObj?.nombre || doc.equipo.cliente || 'PRODEXUS Enterprise CMMS'}
                      </h1>
                      {clienteObj?.rut && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                          RUT: {clienteObj.rut}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 font-bold mt-0.5">
                      {isPreventivo && 'ORDEN DE MANTENIMIENTO PREVENTIVO (MP)'}
                      {isCorrectivo && 'ORDEN DE MANTENIMIENTO CORRECTIVO (MC)'}
                      {isOT && 'ORDEN DE TRABAJO - MEJORAS & INSTALACIONES (OT)'}
                      {isCalibracion && (isCalPendiente
                        ? 'ORDEN DE CALIBRACIÓN METROLÓGICA (CAL)'
                        : 'CERTIFICADO OFICIAL DE CALIBRACIÓN METROLÓGICA (CAL)')}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Planta / Ubicación: <strong className="text-slate-800">{doc.equipo.cliente}</strong> · Sistema CMMS PRODEXUS {isCalibracion ? 'ISO 9001 / ISO 17025' : 'ISO 9001 / ISO 55001'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-block border-2 border-slate-900 px-3 py-1.5 font-mono font-black text-base text-slate-900 rounded bg-white shadow-2xs">
                    {isCalPendiente ? doc.folio : (doc.calibracion?.numero_certificado || doc.folio)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">
                    {isCalibracion
                      ? (isCalPendiente ? 'Orden Oficial de Servicio Metrológico' : 'Certificado con Trazabilidad')
                      : 'Documento Oficial de Control'}
                  </p>
                </div>
              </div>

              {/* Asset & Schedule Information Box */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500 font-medium">{isCalibracion ? 'Instrumento:' : 'Equipo / Activo:'}</span>{' '}
                    <strong className="text-slate-900">{doc.calibracion?.instrumento_nombre || doc.equipo.nombre}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Código Identificador:</span>{' '}
                    <strong className="font-mono text-slate-900">{doc.equipo.codigo_eq}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">{isCalibracion ? 'Variable Metrológica:' : 'Sistema Funcional:'}</span>{' '}
                    <span className="text-slate-800">{doc.calibracion?.variable_medicion || doc.equipo.sistema}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">{isCalibracion ? 'Rango Operacional:' : 'Marca & Modelo:'}</span>{' '}
                    <span className="text-slate-800">{doc.calibracion?.rango_operacion || `${doc.equipo.marca} / ${doc.equipo.modelo}`}</span>
                  </div>
                </div>

                <div className="space-y-1 border-l border-slate-200 pl-4">
                  {isPreventivo && (
                    <>
                      <div>
                        <span className="text-slate-500 font-medium">Fecha Programada:</span>{' '}
                        <strong className="font-mono text-slate-900">{doc.fechaProgramada}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Frecuencia:</span>{' '}
                        <span className="font-semibold text-slate-800">{doc.equipo.frecuencia}</span>
                      </div>
                    </>
                  )}

                  {isCalibracion && (
                    <>
                      <div>
                        <span className="text-slate-500 font-medium">Error Máximo Permisible (EMP):</span>{' '}
                        <strong className="text-slate-900 font-mono">{doc.calibracion?.tolerancia_emp}</strong>
                      </div>
                      {isCalPendiente ? (
                        <>
                          <div>
                            <span className="text-slate-500 font-medium">Fecha Programada:</span>{' '}
                            <strong className="font-mono text-slate-900">{doc.calibracion?.fecha_programada || doc.fechaProgramada}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Fecha Límite / Compromiso:</span>{' '}
                            <strong className="font-mono text-indigo-700">{doc.calibracion?.fecha_tentativa}</strong>{' '}
                            <span className="text-slate-400">(±{doc.calibracion?.dias_tolerancia || 0}d)</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-slate-500 font-medium">Fecha de Calibración:</span>{' '}
                            <strong className="font-mono text-slate-900">{doc.calibracion?.fecha_real}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Próxima Calibración:</span>{' '}
                            <strong className="font-mono text-indigo-700">{doc.calibracion?.proxima_calibracion || `Programada ${docYear}`}</strong>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {!isPreventivo && !isCalibracion && (
                    <>
                      <div>
                        <span className="text-slate-500 font-medium">Fecha de Emisión:</span>{' '}
                        <span className="font-mono text-slate-800">{doc.fechaEmision}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Fecha Compromiso:</span>{' '}
                        <strong className="font-mono text-slate-900">{doc.fechaTentativa}</strong>{' '}
                        <span className="text-slate-400">(±{doc.diasTolerancia}d)</span>
                      </div>
                    </>
                  )}

                  <div>
                    <span className="text-slate-500 font-medium">{isCalibracion ? 'Metrólogo / Laboratorio:' : 'Técnico Asignado:'}</span>{' '}
                    <span className="font-semibold text-slate-800">{doc.calibracion?.metrologo_laboratorio || doc.tecnico || doc.equipo.tecnico || 'Por Cuadrilla'}</span>
                  </div>
                </div>
              </div>

              {/* Body: Protocol Tasks for MP or Description for MC/OT or Calibration Points for CAL */}
              {isPreventivo && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                    Protocolo de Tareas & Verificaciones Técnicas
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-800">
                    {(doc.protocolo || doc.equipo.tareas.split('\n').filter(t => t.trim().length > 0)).map((task, tIdx) => {
                      const hasRecordedChecklist = Boolean(doc.isCerrada && doc.tareasCompletadas);
                      const isDone = hasRecordedChecklist
                        ? doc.tareasCompletadas!.includes(task)
                        : Boolean(doc.isCerrada);
                      return (
                        <div key={tIdx} className="flex items-start gap-3 py-1 border-b border-slate-100">
                          {doc.isCerrada ? (
                            <div
                              className={`w-5 h-5 border-2 rounded-sm shrink-0 mt-0.5 flex items-center justify-center text-[11px] font-black ${
                                isDone
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-300 text-slate-300'
                              }`}
                            >
                              {isDone ? '✓' : ''}
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-slate-400 rounded-sm shrink-0 mt-0.5" />
                          )}
                          <span className="leading-snug">{task}</span>
                        </div>
                      );
                    })}
                  </div>

                  {doc.isCerrada && (
                    <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-emerald-900">
                        <span>Registro de Ejecución en Terreno</span>
                        {doc.duracionHoras ? (
                          <span className="font-mono text-[11px]">Duración: {doc.duracionHoras} h</span>
                        ) : null}
                      </div>
                      {doc.accionesRealizadas && (
                        <p className="text-slate-800 leading-relaxed">
                          <strong>Hallazgos / Observaciones:</strong> {doc.accionesRealizadas}
                        </p>
                      )}
                      {doc.repuestos && (
                        <p className="text-slate-700 text-[11px]">
                          <strong>Repuestos Utilizados:</strong> {doc.repuestos}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isCalibracion && (
                <div className="space-y-4">
                  {/* Pattern and Traceability */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5">
                    <div className="flex justify-between gap-4">
                      <span className="font-semibold text-slate-700 shrink-0">Patrón de Referencia:</span>
                      <span className="font-mono font-medium text-slate-900">
                        {isCalPendiente
                          ? (doc.calibracion?.patron_utilizado || '_______________________________________________')
                          : (doc.calibracion?.patron_utilizado || 'Balanza de Pesos Muertos Ametek / Calibrador Fluke')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-semibold text-slate-700 shrink-0">Certificado de Trazabilidad:</span>
                      <span className="font-mono font-medium text-slate-900">
                        {isCalPendiente
                          ? (doc.calibracion?.trazabilidad_patron || '_______________________________________________')
                          : (doc.calibracion?.trazabilidad_patron || 'CERT-TRAZ-NIST-2025-081')}
                      </span>
                    </div>
                  </div>

                  {/* Calibration Points Table */}
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                    {isCalPendiente
                      ? 'Registro de Puntos de Contraste y Medición en Campo / Laboratorio'
                      : 'Tabla de Puntos de Calibración & Error Determinado'}
                  </h3>
                  <table className="w-full text-left text-xs border border-slate-300">
                    <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                      <tr>
                        <th className="py-2 px-3 border border-slate-300">Punto Nominal</th>
                        <th className="py-2 px-3 border border-slate-300">Lectura Patrón</th>
                        <th className="py-2 px-3 border border-slate-300">Lectura Instrumento</th>
                        <th className="py-2 px-3 border border-slate-300">Error Calculado</th>
                        <th className="py-2 px-3 border border-slate-300 text-center">Conformidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isCalPendiente ? (
                        ['0% FS', '25% FS', '50% FS', '75% FS', '100% FS'].map((nominal, pIdx) => (
                          <tr key={pIdx} className="border-b border-slate-200">
                            <td className="py-2.5 px-3 font-mono font-semibold border border-slate-300">{nominal}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 border border-slate-300">____________</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 border border-slate-300">____________</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 border border-slate-300">_________</td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-mono text-[10px] text-slate-600">
                              [ ] OK &nbsp; [ ] NO
                            </td>
                          </tr>
                        ))
                      ) : (
                        (doc.calibracion?.puntos_calibracion || [
                          { punto_nominal: '0% FS', lectura_patron: '0.00', lectura_instrumento: '0.0', error_calculado: '0.00%', conforme: true },
                          { punto_nominal: '25% FS', lectura_patron: '75.05', lectura_instrumento: '75.2', error_calculado: '+0.20%', conforme: true },
                          { punto_nominal: '50% FS', lectura_patron: '150.10', lectura_instrumento: '150.4', error_calculado: '+0.20%', conforme: true },
                          { punto_nominal: '75% FS', lectura_patron: '225.08', lectura_instrumento: '225.5', error_calculado: '+0.21%', conforme: true },
                          { punto_nominal: '100% FS', lectura_patron: '300.02', lectura_instrumento: '300.3', error_calculado: '+0.09%', conforme: true }
                        ]).map((p, pIdx) => (
                          <tr key={pIdx} className="border-b border-slate-200">
                            <td className="py-1.5 px-3 font-mono font-medium border border-slate-300">{p.punto_nominal}</td>
                            <td className="py-1.5 px-3 font-mono border border-slate-300">{p.lectura_patron}</td>
                            <td className="py-1.5 px-3 font-mono border border-slate-300">{p.lectura_instrumento}</td>
                            <td className="py-1.5 px-3 font-mono font-bold text-slate-900 border border-slate-300">{p.error_calculado}</td>
                            <td className={`py-1.5 px-3 text-center border border-slate-300 font-bold ${p.conforme ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {p.conforme ? 'CONFORME' : 'NO CONFORME'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Dictamen Box */}
                  {isCalPendiente ? (
                    <div className="p-3.5 bg-slate-50 border border-slate-300 rounded space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 uppercase">Dictamen Metrológico (Marcar al finalizar):</span>
                        <span className="font-mono text-[11px] text-slate-600">
                          [ ] Conforme &nbsp;&nbsp; [ ] Ajustado y Conforme &nbsp;&nbsp; [ ] No Conforme
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-1 text-[11px] text-slate-600">
                        <div>Error Máx. Hallado: ______________________</div>
                        <div>N° Certificado Emitido: ___________________</div>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-3 rounded flex items-center justify-between text-xs border ${
                      doc.calibracion?.dictamen === 'No Conforme'
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <div>
                        <span className={`font-bold uppercase ${doc.calibracion?.dictamen === 'No Conforme' ? 'text-rose-900' : 'text-emerald-900'}`}>
                          Dictamen Metrológico:
                        </span>{' '}
                        <span className={`font-bold ${doc.calibracion?.dictamen === 'No Conforme' ? 'text-rose-800' : 'text-emerald-800'}`}>
                          {doc.calibracion?.dictamen || 'Conforme (Apto para uso)'}
                        </span>
                        <p className={`text-[11px] mt-0.5 ${doc.calibracion?.dictamen === 'No Conforme' ? 'text-rose-700' : 'text-emerald-700'}`}>
                          Error máximo hallado: <strong className="font-mono">{doc.calibracion?.error_max_hallado || '+0.21% FS'}</strong> (Tolerancia EMP: {doc.calibracion?.tolerancia_emp})
                        </p>
                      </div>
                      <div className={`font-bold border-2 px-3 py-1 rounded uppercase tracking-wider text-[11px] ${
                        doc.calibracion?.dictamen === 'No Conforme'
                          ? 'text-rose-900 border-rose-600'
                          : 'text-emerald-900 border-emerald-600'
                      }`}>
                        {doc.calibracion?.dictamen === 'No Conforme' ? 'FUERA DE TOLERANCIA' : 'APTO OPERACIÓN'}
                      </div>
                    </div>
                  )}

                  {doc.calibracion?.repuestos_utilizados && (
                    <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                      <strong>Repuestos / Consumibles Empleados:</strong> {doc.calibracion.repuestos_utilizados}
                    </p>
                  )}

                  {doc.calibracion?.observaciones ? (
                    <p className="text-[11px] text-slate-600 italic">
                      Observaciones / Procedimiento: {doc.calibracion.observaciones}
                    </p>
                  ) : isCalPendiente ? (
                    <div className="h-16 border border-slate-300 rounded p-2 text-slate-400 text-[11px] italic">
                      [Observaciones de campo, condiciones ambientales T°/HR y número de precinto aplicado]
                    </div>
                  ) : null}
                </div>
              )}

              {isCorrectivo && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                      Descripción de la Avería / Falla Reportada
                    </h3>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 leading-relaxed font-medium">
                      {doc.falla}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                      Diagnóstico, Acciones Realizadas & Repuestos
                    </h3>
                    {doc.isCerrada && doc.accionesRealizadas ? (
                      <div className="p-3 bg-emerald-50/40 border border-emerald-200 rounded text-xs text-slate-800 space-y-2">
                        <p className="leading-relaxed whitespace-pre-line">{doc.accionesRealizadas}</p>
                        {doc.repuestos && (
                          <p className="text-[11px] text-slate-700 pt-1.5 border-t border-emerald-200/70">
                            <strong>Repuestos / Insumos Utilizados:</strong> {doc.repuestos}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 border border-slate-300 rounded p-2 text-slate-400 text-xs italic">
                        [Espacio para anotaciones del técnico en terreno]
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isOT && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                      Alcance del Trabajo Solicitado (Proyecto / Mejora)
                    </h3>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 leading-relaxed font-medium">
                      {doc.trabajo}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                      {doc.isCerrada && doc.accionesRealizadas
                        ? 'Trabajos Ejecutados, Materiales Utilizados & Entrega'
                        : 'Registro de Materiales Utilizados & Horas Hombre'}
                    </h3>
                    {doc.isCerrada && doc.accionesRealizadas ? (
                      <div className="p-3 bg-emerald-50/40 border border-emerald-200 rounded text-xs text-slate-800 space-y-2">
                        <p className="leading-relaxed whitespace-pre-line">{doc.accionesRealizadas}</p>
                        {doc.repuestos && (
                          <p className="text-[11px] text-slate-700 pt-1.5 border-t border-emerald-200/70">
                            <strong>Materiales / Insumos Empleados:</strong> {doc.repuestos}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 border border-slate-300 rounded p-2 text-slate-400 text-xs italic">
                        [Espacio para registro de materiales e insumos de montaje]
                      </div>
                    )}
                  </div>
                </div>
              )}

              </div>

              {/* Signatures & Execution Section (Anchored to Page Footer) */}
              <div className="mt-auto pt-6">
                <div className="pt-5 border-t-2 border-slate-300 text-xs">
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="border-b border-slate-400 h-14 flex items-end justify-center pb-1 mb-1 font-mono text-[11px] text-slate-400">
                        {effFirmaTecnico ? (
                          <img
                            src={effFirmaTecnico}
                            alt="Firma Ejecutor"
                            className="max-h-12 w-auto object-contain mx-auto"
                          />
                        ) : (
                          'Firma / Timbre'
                        )}
                      </div>
                      <p className="font-bold text-slate-900">
                        {isCalibracion ? 'Metrólogo Ejecutor' : 'Técnico Ejecutor'}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        {effFirmaTecnico
                          ? `${effFirmadoPor || ''}${effFechaReal ? ` · ${effFechaReal}` : ''}`
                          : isCalibracion
                          ? (isCalPendiente ? `Fecha Real: ____ / ____ / ${docYear}` : doc.calibracion?.metrologo_laboratorio)
                          : (effFechaReal ? `Fecha Real: ${effFechaReal}` : `Fecha Real: ____ / ____ / ${docYear}`)}
                      </p>
                      {effFirmaTecnico && effFechaFirma && (
                        <p className="text-[9px] text-slate-400 font-mono">Firma Digital · {effFechaFirma}</p>
                      )}
                    </div>

                    <div>
                      <div className="border-b border-slate-400 h-14 flex items-end justify-center pb-1 mb-1 font-mono text-[11px] text-slate-400">
                        {effFirmaSupervisor ? (
                          <img
                            src={effFirmaSupervisor}
                            alt="Firma Supervisor"
                            className="max-h-12 w-auto object-contain mx-auto"
                          />
                        ) : (
                          'Firma / Timbre'
                        )}
                      </div>
                      <p className="font-bold text-slate-900">
                        {isCalibracion ? 'Aseguramiento de Calidad' : 'Supervisor de Mantenimiento'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {effFirmaSupervisor && effFirmadoSupervisorPor ? effFirmadoSupervisorPor : 'Conformidad Técnica'}
                      </p>
                    </div>

                    <div>
                      <div className="border-b border-slate-400 h-14 flex items-end justify-center pb-1 mb-1 font-mono text-[11px] text-slate-400">
                        Firma / Timbre
                      </div>
                      <p className="font-bold text-slate-900">
                        {isCalibracion ? 'Dirección Técnica de Planta' : 'Recepción Operaciones'}
                      </p>
                      <p className="text-[10px] text-slate-500">Planta {doc.equipo.cliente.slice(0, 18)}</p>
                    </div>
                  </div>
                </div>

                {/* Quality Audit Stamp */}
                <div className="mt-4 pt-2 text-center text-[10px] text-slate-400 border-t border-slate-200">
                  PRODEXUS Cloud System · Sistema Certificado de Gestión de Mantenimiento & Metrología · Formulario Oficial ISO 9001 / ISO 17025
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
