/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Export multiple discrete page elements into a single multi-page PDF document.
 * Each element corresponds to exactly one physical A4 page.
 */
export async function exportPagesToPDF(
  pageElements: HTMLElement[],
  filename: string,
  orientation: 'portrait' | 'landscape' = 'landscape'
): Promise<void> {
  if (!pageElements.length) return;

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 6;
  const printWidth = pageWidth - margin * 2;
  const printHeight = pageHeight - margin * 2;

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    const rect = el.getBoundingClientRect();
    const elWidth = rect.width || el.offsetWidth || (orientation === 'landscape' ? 1120 : 794);
    const targetMinHeightPx = Math.round(elWidth * (printHeight / printWidth));

    el.setAttribute('data-pdf-active-sheet', '1');
    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const target = clonedDoc.querySelector<HTMLElement>('[data-pdf-active-sheet="1"]');
          if (target) {
            target.style.display = 'flex';
            target.style.flexDirection = 'column';
            target.style.justifyContent = 'space-between';
            target.style.minHeight = `${targetMinHeightPx}px`;
            target.style.boxSizing = 'border-box';
          }
        }
      });
    } finally {
      el.removeAttribute('data-pdf-active-sheet');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage();
    }

    let drawWidth = printWidth;
    let drawHeight = (canvas.height * printWidth) / canvas.width;
    if (drawHeight > printHeight) {
      const ratio = printHeight / drawHeight;
      drawHeight = printHeight;
      drawWidth = printWidth * ratio;
    }
    const offsetX = margin + (printWidth - drawWidth) / 2;

    pdf.addImage(imgData, 'JPEG', offsetX, margin, drawWidth, drawHeight);
  }

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(safeFilename);
}

/**
 * High-fidelity PDF export. If the element contains '.print-sheet' children,
 * each sheet is captured as a distinct, un-cut page with its own header,
 * complete 12 months, and footer approval signatures.
 */
export async function exportElementToPDF(
  container: HTMLElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'landscape'
): Promise<void> {
  try {
    const sheets = Array.from(container.querySelectorAll<HTMLElement>('.print-sheet'));
    if (sheets.length > 0) {
      return await exportPagesToPDF(sheets, filename, orientation);
    }

    // Single element capture fallback
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const printWidth = pageWidth - margin * 2;
    const printHeight = (canvas.height * printWidth) / canvas.width;

    let heightLeft = printHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight);
      heightLeft -= pageHeight;
    }

    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
