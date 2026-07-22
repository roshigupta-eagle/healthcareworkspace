import { getPatientById } from '@/app/dashboard/records/mockPatients';

export async function GET(_req: Request, { params }: { params: { id: string; labId: string } }) {
  const { id, labId } = params;
  const patient = getPatientById(String(id));
  if (!patient) return new Response('Patient not found', { status: 404 });
  const lab = (patient.labResults || []).find((l: any) => l.id === labId);
  if (!lab) return new Response('Lab not found', { status: 404 });

  const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold || StandardFonts.Helvetica);

  // Header band
  page.drawRectangle({ x: 0, y: height - 88, width, height: 88, color: rgb(0.96, 0.98, 0.99) });
  page.drawText('Maple Health Labs', { x: 48, y: height - 52, size: 14, font: fontBold, color: rgb(0.03, 0.53, 0.45) });
  page.drawText('Lab Result Details', { x: 48, y: height - 68, size: 10, font, color: rgb(0.06, 0.09, 0.17) });

  // Patient summary block
  page.drawText(`${patient.name} — MRN: ${patient.mrn}`, { x: 48, y: height - 108, size: 10, font, color: rgb(0.06, 0.09, 0.17) });
  page.drawText(`DOB: ${patient.dob || '—'} • Age: ${patient.age || '—'}`, { x: 48, y: height - 124, size: 9, font, color: rgb(0.27, 0.33, 0.36) });

  // Big result on the right
  page.drawText(lab.name, { x: 320, y: height - 92, size: 12, font: fontBold, color: rgb(0.06, 0.09, 0.17) });
  page.drawText(`${lab.result} ${lab.unit || ''}`, { x: 320, y: height - 132, size: 40, font: fontBold, color: rgb(0.02, 0.47, 0.32) });

  // mini gauge
  const value = parseFloat(String(lab.result));
  let max = 5;
  const m = lab.normalRange && lab.normalRange.match(/<\s*([\d.]+)/);
  if (m) max = Math.max(parseFloat(m[1]) * 1.6, 5);
  if (lab.unit && typeof lab.unit === 'string' && lab.unit.toLowerCase().includes('ng')) max = Math.max(value * 4 || 5, 5);
  const pos = !Number.isNaN(value) ? Math.min(1, Math.max(0, (value / max))) : 0;

  const barX = 48;
  const barY = height - 160;
  const barW = 360;
  const barH = 10;
  page.drawRectangle({ x: barX, y: barY, width: barW, height: barH, color: rgb(0.94, 0.94, 0.94) });
  page.drawRectangle({ x: barX, y: barY, width: Math.max(6, barW * pos), height: barH, color: rgb(0.02, 0.62, 0.48) });

  // mark reference threshold if present
  const lt = lab.normalRange && lab.normalRange.match(/<\s*([\d.]+)/);
  if (lt) {
    const thr = parseFloat(lt[1]);
    const markX = barX + Math.max(0, Math.min(barW, (thr / max) * barW));
    page.drawRectangle({ x: markX - 1, y: barY - 6, width: 2, height: barH + 12, color: rgb(0.85, 0.36, 0.36) });
  }

  page.drawText('0', { x: barX, y: barY - 14, size: 8, font, color: rgb(0.4, 0.44, 0.45) });
  page.drawText(String(Math.round(max)), { x: barX + barW - 12, y: barY - 14, size: 8, font, color: rgb(0.4, 0.44, 0.45) });

  // Components table
  const components = Array.isArray(lab.components) && lab.components.length ? lab.components : [
    { test: lab.name, result: String(lab.result), unit: lab.unit || '', reference: lab.normalRange || '' }
  ];

  let y = barY - 36;
  // header
  page.drawRectangle({ x: 48, y: y + 6, width: 500, height: 22, color: rgb(0.97, 0.97, 0.98) });
  page.drawText('Test', { x: 52, y, size: 10, font: fontBold });
  page.drawText('Result', { x: 260, y, size: 10, font: fontBold });
  page.drawText('Unit', { x: 360, y, size: 10, font: fontBold });
  page.drawText('Reference', { x: 460, y, size: 10, font: fontBold });
  y -= 18;

  for (const c of components) {
    page.drawText(c.test, { x: 48, y, size: 10, font });
    page.drawText(String(c.result), { x: 260, y, size: 10, font });
    page.drawText(c.unit || '', { x: 360, y, size: 10, font });
    page.drawText(c.reference || '', { x: 460, y, size: 10, font });
    y -= 16;
  }

  // Interpretation box
  page.drawText('Interpretation', { x: 48, y: y - 8, size: 11, font: fontBold });
  page.drawText(lab.notes || `${lab.name} result ${lab.result}${lab.unit ? ' ' + lab.unit : ''}.`, { x: 48, y: y - 26, size: 10, font });

  // Metadata right column
  const metaX = 420;
  let metaY = height - 200;
  page.drawText('Ordered by:', { x: metaX, y: metaY, size: 9, font: fontBold });
  page.drawText(lab.orderedBy || patient.lastAttendingDoctor || '—', { x: metaX, y: metaY - 14, size: 9, font });
  metaY -= 34;
  page.drawText('Sample collected:', { x: metaX, y: metaY, size: 9, font: fontBold });
  page.drawText(lab.sampleCollected || lab.date || '—', { x: metaX, y: metaY - 14, size: 9, font });
  metaY -= 34;
  page.drawText('Accession #', { x: metaX, y: metaY, size: 9, font: fontBold });
  page.drawText(lab.accession || ('LAB' + (lab.id || '').toUpperCase()), { x: metaX, y: metaY - 14, size: 9, font });

  const pdfBytes = await pdfDoc.save();
  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${(lab.name || 'lab').replace(/\s+/g, '_')}.pdf"`,
    },
  });
}
