/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, PenTool, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (dataUrl: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const EXPORT_WIDTH = 420;
const EXPORT_HEIGHT = 140;

export const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  sublabel,
  value,
  onChange,
  required = false,
  disabled = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasStrokeRef = useRef(Boolean(value));
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(Boolean(value));

  const setupCanvasContext = (canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(rect.width || 360, 260);
    const cssHeight = Math.max(rect.height || 140, 120);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#0f172a';
    }
    return { cssWidth, cssHeight, ctx };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { cssWidth, cssHeight, ctx } = setupCanvasContext(canvas);

    if (value && ctx) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
      };
      img.src = value;
      hasStrokeRef.current = true;
      setHasSignature(true);
    } else if (!value) {
      hasStrokeRef.current = false;
      setHasSignature(false);
    }
  }, []);

  useEffect(() => {
    if (!value && hasStrokeRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width || canvas.width, rect.height || canvas.height);
      }
      hasStrokeRef.current = false;
      setHasSignature(false);
    }
  }, [value]);

  const getRelativePoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const exportCompactPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokeRef.current) {
      onChange('');
      return;
    }

    const out = document.createElement('canvas');
    out.width = EXPORT_WIDTH;
    out.height = EXPORT_HEIGHT;
    const outCtx = out.getContext('2d');
    if (!outCtx) return;

    outCtx.clearRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    outCtx.drawImage(canvas, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    onChange(out.toDataURL('image/png'));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getRelativePoint(e);
    isDrawingRef.current = true;
    lastPointRef.current = pt;

    // Ensure tiny dot tap registers as stroke
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true;
      setHasSignature(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPointRef.current) return;

    const pt = getRelativePoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
  };

  const finishStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    exportCompactPng();
  };

  const handleClear = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    if (ctx) {
      ctx.clearRect(0, 0, rect.width || canvas.width, rect.height || canvas.height);
    }
    hasStrokeRef.current = false;
    setHasSignature(false);
    onChange('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-800">
            {label} {required && <span className="text-rose-600">*</span>}
          </label>
          {sublabel && (
            <p className="text-[11px] text-slate-500">{sublabel}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasSignature ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Capturada</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <PenTool className="w-3 h-3" />
              <span>Pendiente</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || !hasSignature}
            className="min-h-[36px] px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      <div className="relative rounded-xl border border-slate-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          className={`w-full h-36 block touch-none select-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-crosshair'}`}
        />
        <div className="pointer-events-none absolute inset-x-6 bottom-5 border-b border-dashed border-slate-300" />
        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-slate-400 select-none">
              Firme con su dedo o puntero sobre esta área
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
