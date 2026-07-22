import { getPatientById } from '@/app/dashboard/records/mockPatients';

export async function GET(_req: Request, { params }: { params: { id: string; labId: string } }) {
  const { id, labId } = params;
  const patient = getPatientById(String(id));
  if (!patient) return new Response('Patient not found', { status: 404 });
  const lab = (patient.labResults || []).find((l: any) => l.id === labId);
  if (!lab) return new Response('Lab not found', { status: 404 });

  let puppeteer: any;
  try {
    puppeteer = await import('puppeteer');
  } catch (err) {
    return new Response('puppeteer not available', { status: 500 });
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();

    const escapeHtml = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const components = Array.isArray(lab.components) && lab.components.length ? lab.components : [
      { test: lab.name, result: lab.result, unit: lab.unit || '', reference: lab.normalRange || '' }
    ];

    const rows = components.map((c: any) => `
        <tr>
          <td>${escapeHtml(c.test)}</td>
          <td>${escapeHtml(String(c.result))}</td>
          <td>${escapeHtml(c.unit || '')}</td>
          <td>${escapeHtml(c.reference || '')}</td>
        </tr>
      `).join('\n');

    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(lab.name)} - ${escapeHtml(patient.name)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial; color:#0f172a; margin:0; padding:24px;}
          .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
          .brand{color:#0b7a69;font-weight:700;font-size:18px}
          .meta{font-size:12px;color:#64748b}
          .layout{display:flex;gap:24px}
          .left{flex:1}
          .right{width:220px;font-size:12px;color:#475569}
          .big{font-size:44px;color:#047857;font-weight:700}
          table{width:100%;border-collapse:collapse;margin-top:12px}
          th{background:#f8fafb;text-align:left;padding:10px;font-size:12px;color:#374151}
          td{padding:10px;border-bottom:1px solid #e6eef0;font-size:12px}
          .interpret{margin-top:12px;font-size:12px;color:#374151}
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Maple Health Labs</div>
            <div class="meta">Lab Result Details</div>
          </div>
          <div class="meta">${escapeHtml(patient.name)} • MRN: ${escapeHtml(patient.mrn)}</div>
        </div>

        <div class="layout">
          <div class="left">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div class="meta">${escapeHtml(lab.name)}</div>
                <div class="big">${escapeHtml(String(lab.result))} <span style="font-size:16px;font-weight:600;color:#6b7280">${escapeHtml(lab.unit || '')}</span></div>
              </div>
              <div class="meta">${escapeHtml(lab.date || '')}</div>
            </div>

            <table>
              <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th></tr></thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            <div class="interpret"><strong>Interpretation</strong><div>${escapeHtml(lab.notes || 'No additional notes.')}</div></div>
          </div>

          <div class="right">
            <div><strong>Ordered by</strong><div>${escapeHtml(lab.orderedBy || patient.lastAttendingDoctor || '—')}</div></div>
            <div style="margin-top:12px"><strong>Sample collected</strong><div>${escapeHtml(lab.sampleCollected || lab.date || '—')}</div></div>
            <div style="margin-top:12px"><strong>Accession</strong><div>${escapeHtml(lab.accession || ('LAB' + (lab.id || '').toUpperCase()))}</div></div>
          </div>
        </div>
      </body>
    </html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
    await browser.close();
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(lab.name || 'lab').replace(/\s+/g, '_')}.pdf"`,
      },
    });
  } catch (err) {
    try { await browser.close(); } catch (e) {}
    return new Response('Failed to render PDF', { status: 500 });
  }
}
