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
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage();
    }

    const calculatedHeight = (canvas.height * printWidth) / canvas.width;
    const finalHeight = Math.min(calculatedHeight, printHeight);

    pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, finalHeight);
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
