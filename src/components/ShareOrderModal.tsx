/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Smartphone,
  X,
  ShieldCheck
} from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import {
  DigitalOrderTarget,
  buildDigitalOrderUrl,
  buildWhatsAppShareHref
} from '../utils/digitalOrderLink';

interface ShareOrderModalProps {
  target: DigitalOrderTarget;
  onClose: () => void;
  onOpenDigitalExecution?: (target: DigitalOrderTarget) => void;
}

export const ShareOrderModal: React.FC<ShareOrderModalProps> = ({
  target,
  onClose,
  onOpenDigitalExecution
}) => {
  const { clientes, tecnicos, addToast } = useMaintenance();
  const [copied, setCopied] = useState(false);

  const initialTech = useMemo(() => {
    if (!target.tecnicoSugerido) return undefined;
    return tecnicos.find(
      t => t.nombre.trim().toLowerCase() === target.tecnicoSugerido!.trim().toLowerCase()
    );
  }, [tecnicos, target.tecnicoSugerido]);

  const [selectedTechCode, setSelectedTechCode] = useState<string>(initialTech?.codigo_tec || '');
  const [phoneInput, setPhoneInput] = useState<string>(initialTech?.telefono || '');

  const shareUrl = useMemo(() => buildDigitalOrderUrl(target, clientes), [target, clientes]);

  const whatsappHref = useMemo(
    () =>
      buildWhatsAppShareHref({
        phone: phoneInput,
        target,
        url: shareUrl
      }),
    [phoneInput, target, shareUrl]
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      addToast('Enlace directo copiado al portapapeles.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addToast('No se pudo copiar automáticamente; seleccione y copie el enlace manualmente.', 'warning');
    }
  };

  const tipoBadgeText =
    target.tipo === 'MP'
      ? 'Mantenimiento Preventivo'
      : target.tipo === 'MC'
      ? 'Mantenimiento Correctivo'
      : target.tipo === 'OT'
      ? 'Orden de Trabajo'
      : 'Calibración Metrológica';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Compartir Orden Digital con Técnico
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {tipoBadgeText} · <span className="font-mono font-bold text-slate-800">{target.folio}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Order summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Planta / Empresa:</span>
              <span className="font-bold text-slate-900 text-right">{target.cliente}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Equipo / Activo:</span>
              <span className="font-semibold text-slate-800 text-right">
                {target.nombreActivo} <span className="font-mono text-slate-500">({target.codigoEq})</span>
              </span>
            </div>
            {target.fechaProgramada && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Fecha programada:</span>
                <span className="font-mono font-semibold text-slate-800">{target.fechaProgramada}</span>
              </div>
            )}
          </div>

          {/* Copy Direct Link */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              Enlace Directo a la Orden Digital
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 font-mono text-[11px] text-slate-700 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`min-h-[40px] px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Dispatch */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Enviar por WhatsApp al Técnico</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Técnico del Catálogo
                </label>
                <select
                  value={selectedTechCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedTechCode(code);
                    const found = tecnicos.find(t => t.codigo_tec === code);
                    if (found?.telefono) setPhoneInput(found.telefono);
                  }}
                  className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Elegir contacto en WhatsApp --</option>
                  {tecnicos.filter(t => t.estado === 'Activo').map(t => (
                    <option key={t.codigo_tec} value={t.codigo_tec}>
                      {t.nombre}{t.telefono ? ` (${t.telefono})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Teléfono WhatsApp (opcional)
                </label>
                <input
                  type="tel"
                  placeholder="Ej. +56 9 1234 5678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full font-mono text-xs text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir WhatsApp con Mensaje y Enlace</span>
            </a>
          </div>

          {/* On-device execution option */}
          {onOpenDigitalExecution && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDigitalExecution(target);
              }}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              <span>Completar y Firmar Digitalmente en Este Dispositivo</span>
            </button>
          )}

          {/* Security & Hybrid note */}
          <div className="flex items-start gap-2 text-[11px] text-slate-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              El técnico abrirá el enlace con su cuenta autorizada de empresa, completará el protocolo y firmará en pantalla. Las empresas que prefieren papel pueden seguir imprimiendo desde <strong>Imprimir / PDF</strong> sin cambios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
