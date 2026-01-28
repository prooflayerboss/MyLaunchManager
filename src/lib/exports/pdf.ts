import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export async function exportToPDF(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });

    const img = new Image();
    img.src = dataUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const imgWidth = img.width;
    const imgHeight = img.height;

    // Create PDF with proper dimensions
    const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [imgWidth / 2, imgHeight / 2],
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
    pdf.save(filename);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw error;
  }
}
