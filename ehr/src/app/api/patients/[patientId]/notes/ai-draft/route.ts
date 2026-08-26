import { NextResponse } from 'next/server';
import { getPatientById, type Patient } from '@/app/dashboard/records/mockPatients';
import { listDocuments } from '@/lib/documentStore';
import { auth } from '@/lib/auth';
import { buildDraftSystemInstruction, detectDraftConflicts, draftQualityWarnings, extractDraftFromGatewayResponse, type DraftContextSelection, type DraftOptions, type DraftSource } from '@/lib/aiNoteDraft';

const CONTEXT_TYPES = new Set(['patient-demographics', 'appointment', 'conditions', 'medications', 'care-plan', 'health-concerns', 'document', 'result']);
const DOCUMENT_TYPES: readonly DraftOptions['documentType'][] = ['patient-instructions', 'clinical-paragraph', 'visit-summary', 'follow-up', 'patient-message', 'referral', 'care-plan-instructions', 'letter', 'structured-note', 'freeform'];
const FORMATS: readonly DraftOptions['format'][] = ['short-paragraph', 'detailed-paragraph', 'long-form', 'bullets', 'numbered-steps', 'structured-sections', 'letter', 'template'];
const TONES: readonly DraftOptions['tone'][] = ['professional', 'clinical', 'patient-friendly', 'warm', 'concise', 'formal', 'plain-language'];
const DETAILS: readonly DraftOptions['detail'][] = ['concise', 'standard', 'detailed', 'very-detailed'];
const AUDIENCES = new Set(['Clinician', 'Patient', 'Caregiver', 'Specialist', 'General Healthcare Team']);
const STRUCTURES = new Set(['Automatic', 'Paragraph', 'Bullets', 'Numbered Steps', 'Headings + Sections', 'Letter', 'Clinical Template']);

function enumOption<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function fixedOption(value: unknown, allowed: Set<string>, fallback: string) {
  return typeof value === 'string' && allowed.has(value) ? value : fallback;
}

type GatewayDraft = { draft: string; model: string };

async function callConfiguredGateway(options: DraftOptions, context: Record<string, unknown>, contextSelections: DraftContextSelection[], candidateDraft?: string, correction = false): Promise<GatewayDraft> {
  const configuredEndpoint = process.env.ROSHI_AI_DRAFT_URL?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const huggingFaceToken = process.env.HF_TOKEN?.trim() || process.env.HUGGINGFACE_API_KEY?.trim();
  const huggingFaceEndpoint = process.env.HUGGINGFACE_INFERENCE_URL?.trim();
  const isHuggingFaceFallback = !configuredEndpoint && Boolean(huggingFaceEndpoint || huggingFaceToken);
  const isOpenAiFallback = !configuredEndpoint && !isHuggingFaceFallback && Boolean(openAiKey);
  const endpoint = configuredEndpoint || (isHuggingFaceFallback ? (huggingFaceEndpoint || 'https://router.huggingface.co/v1/chat/completions') : isOpenAiFallback ? (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1/chat/completions') : '');
  if (!endpoint) throw new Error('AI assistance is not configured. Set ROSHI_AI_DRAFT_URL, HUGGINGFACE_INFERENCE_URL with HF_TOKEN, or OPENAI_API_KEY on the server.');
  if (isHuggingFaceFallback && endpoint.includes('router.huggingface.co') && !huggingFaceToken) throw new Error('Hugging Face is configured but HF_TOKEN or HUGGINGFACE_API_KEY is missing on the server.');
  const controller = new AbortController();
  const timeoutMs = Number(process.env.ROSHI_AI_DRAFT_TIMEOUT_MS || 60000);
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 60000);
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
  const apiKey = isHuggingFaceFallback ? huggingFaceToken : isOpenAiFallback ? openAiKey : process.env.ROSHI_AI_DRAFT_API_KEY?.trim();
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const systemInstruction = buildDraftSystemInstruction(options, correction);
  const requestPayload = {
    instruction: options.instruction,
    selectedText: options.selectedText,
    documentType: options.documentType,
    format: options.format,
    tone: options.tone,
    detail: options.detail,
    audience: options.audience,
    structure: options.structure,
    mode: options.mode || 'generate',
    previousDraft: options.previousDraft,
    contextSelections,
  };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(isHuggingFaceFallback || isOpenAiFallback ? {
        model: isHuggingFaceFallback ? process.env.HUGGINGFACE_MODEL?.trim() || 'google/gemma-2-2b-it' : process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: JSON.stringify({ request: requestPayload, candidateDraft, context }) },
        ],
        temperature: correction ? 0.2 : 0.6,
        max_tokens: options.detail === 'very-detailed' ? 1200 : options.detail === 'detailed' ? 900 : 600,
      } : { system: systemInstruction, request: requestPayload, candidateDraft, context }),
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const detail = errorBody ? errorBody.slice(0, 500) : '';
      throw new Error(`AI gateway returned HTTP ${response.status}.${detail ? ` ${detail}` : ''}`);
    }
    const payload = await response.json() as unknown;
    const draft = extractDraftFromGatewayResponse(payload);
    if (!draft) throw new Error('AI gateway returned no draft text.');
    const model = payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>).model === 'string'
      ? String((payload as Record<string, unknown>).model).slice(0, 120)
      : 'configured-roshi-ai-gateway';
    return { draft, model: model || (isHuggingFaceFallback ? process.env.HUGGINGFACE_MODEL?.trim() || 'google/gemma-2-2b-it' : isOpenAiFallback ? process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini' : 'configured-roshi-ai-gateway') };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('AI generation timed out.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  let session: Awaited<ReturnType<typeof auth>> = null;
  try { session = await auth(); } catch {}
  if (!session && process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  const role = typeof (session?.user as { role?: unknown } | undefined)?.role === 'string' ? String((session?.user as { role: string }).role).toUpperCase() : undefined;
  if (role && !new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']).has(role)) return NextResponse.json({ error: 'clinical AI drafting is restricted to authorized clinicians' }, { status: 403 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction) return NextResponse.json({ error: 'a drafting instruction is required' }, { status: 400 });
  const contextSelections: DraftContextSelection[] = Array.isArray(body.contextSelections)
    ? body.contextSelections.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const type = (item as { type?: unknown }).type;
      if (typeof type !== 'string' || !CONTEXT_TYPES.has(type)) return [];
      const id = (item as { id?: unknown }).id;
      return [{ type: type as DraftContextSelection['type'], ...(typeof id === 'string' && id.trim() ? { id: id.trim() } : {}) }];
    })
    : [];
  const requiresId = contextSelections.filter((selection) => ['appointment', 'document', 'result'].includes(selection.type));
  if (requiresId.some((selection) => !selection.id)) return NextResponse.json({ error: 'a selected appointment, document, or result must include an id' }, { status: 400 });
  const appointmentSelection = contextSelections.find((selection) => selection.type === 'appointment');
  const appointment = appointmentSelection?.id ? patient.upcoming?.find((item) => item.id === appointmentSelection.id) : undefined;
  if (appointmentSelection && !appointment) return NextResponse.json({ error: 'selected appointment is unavailable' }, { status: 403 });

  const resultSelections = contextSelections.filter((selection) => selection.type === 'result');
  const resultRecords = resultSelections.map((selection) => patient.labResults?.find((item) => item.id === selection.id)).filter((item): item is NonNullable<Patient['labResults']>[number] => Boolean(item));
  if (resultRecords.length !== resultSelections.length) return NextResponse.json({ error: 'selected result is unavailable' }, { status: 403 });

  const documentSelections = contextSelections.filter((selection) => selection.type === 'document' && selection.id);
  const allDocuments = documentSelections.length ? await listDocuments(patientId, patient) : [];
  const documents = [];
  for (const selection of documentSelections) {
    const document = allDocuments.find((item) => item.id === selection.id);
    if (!document) return NextResponse.json({ error: 'selected document is unavailable' }, { status: 403 });
    documents.push({ id: document.id, title: document.title, type: document.type, date: document.clinicalDate, source: document.source, status: document.status, content: document.content });
  }

  const results = resultRecords.length ? resultRecords.map((resultRecord) => ({
    id: resultRecord.id,
    display: resultRecord.name,
    date: resultRecord.date,
    status: resultRecord.status,
    interpretation: resultRecord.interpretation,
    value: resultRecord.result,
    unit: resultRecord.unit,
    referenceRange: resultRecord.normalRange || resultRecord.referenceRange,
    source: resultRecord.laboratory,
    provider: resultRecord.provider,
    specimen: resultRecord.specimen,
    method: resultRecord.method,
    code: resultRecord.code,
    codeSystem: resultRecord.codeSystem,
  })) : undefined;

  const context = {
    patient: contextSelections.some((selection) => selection.type === 'patient-demographics') ? { display: patient.name, preferredName: patient.preferredName, dob: patient.dob } : undefined,
    appointment: appointment ? { id: appointment.id, type: appointment.type, date: appointment.date, doctor: appointment.doctor, location: appointment.location, prep: appointment.prep } : undefined,
    conditions: contextSelections.some((selection) => selection.type === 'conditions') ? patient.conditions : undefined,
    medications: contextSelections.some((selection) => selection.type === 'medications') ? patient.medications : undefined,
    documents,
    results,
  };
  const options: DraftOptions = {
    instruction,
    documentType: enumOption(body.documentType, DOCUMENT_TYPES, 'freeform'),
    format: enumOption(body.format, FORMATS, 'short-paragraph'),
    tone: enumOption(body.tone, TONES, 'professional'),
    detail: enumOption(body.detail, DETAILS, 'standard'),
    audience: fixedOption(body.audience, AUDIENCES, 'Clinician'),
    structure: fixedOption(body.structure, STRUCTURES, 'Automatic'),
    selectedText: typeof body.selectedText === 'string' ? body.selectedText : undefined,
    mode: body.mode === 'regenerate' ? 'regenerate' : 'generate',
    previousDraft: typeof body.previousDraft === 'string' ? body.previousDraft : undefined,
  };
  const conflicts = detectDraftConflicts(instruction, context.appointment);
  if (conflicts.length && body.allowConflicts !== true) return NextResponse.json({ error: 'date or provider conflict detected', conflicts }, { status: 409 });

  let gatewayResult: GatewayDraft;
  try {
    gatewayResult = await callConfiguredGateway(options, context, contextSelections);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'AI assistance is temporarily unavailable.' }, { status: 503 });
  }

  let draft = gatewayResult.draft;
  let warnings = draftQualityWarnings(options, draft);
  if (warnings.length > 0) {
    try {
      const corrected = await callConfiguredGateway({ ...options, mode: 'regenerate', previousDraft: draft }, context, contextSelections, draft, true);
      const correctedWarnings = draftQualityWarnings(options, corrected.draft);
      if (correctedWarnings.length > 0) return NextResponse.json({ error: 'AI returned a draft that did not meet the requested format or detail level.' }, { status: 502 });
      draft = corrected.draft;
      warnings = [];
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'AI could not correct the draft format.' }, { status: 502 });
    }
  }
  const sources: DraftSource[] = [
    context.patient ? { type: 'Patient', id: patient.id, display: patient.name, date: patient.dob, href: `/dashboard/records/${encodeURIComponent(patient.id)}` } : null,
    context.appointment ? { type: 'Appointment', id: context.appointment.id, display: `${context.appointment.type} with ${context.appointment.doctor}`, date: context.appointment.date, href: `/dashboard/records/${encodeURIComponent(patient.id)}/appointments/${encodeURIComponent(context.appointment.id)}` } : null,
    context.conditions ? { type: 'Conditions', id: `${patient.id}-conditions`, display: context.conditions.join(', '), href: `/dashboard/records/${encodeURIComponent(patient.id)}/conditions` } : null,
    context.medications ? { type: 'Medications', id: `${patient.id}-medications`, display: context.medications.map((medication) => [medication.name, medication.dose, medication.freq].filter(Boolean).join(' ')).join('; '), href: `/dashboard/records/${encodeURIComponent(patient.id)}/medications` } : null,
    ...(context.results || []).map((result) => ({ type: 'Result', id: result.id, display: [result.display, result.value, result.unit, result.interpretation].filter(Boolean).join(' - '), date: result.date, href: `/dashboard/records/${encodeURIComponent(patient.id)}/labs/${encodeURIComponent(result.id)}` })),
    ...documents.map((document) => ({ type: 'Document', id: document.id, display: document.title, date: document.date, href: `/dashboard/records/${encodeURIComponent(patient.id)}/documents?documentId=${encodeURIComponent(document.id)}` })),
  ].filter((source): source is DraftSource => Boolean(source));
  return NextResponse.json({ draft, sources, conflicts, warnings, wordCount: draft.split(/\s+/).filter(Boolean).length, model: gatewayResult.model, clinicalReviewRequired: true });
}