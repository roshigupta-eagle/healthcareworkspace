import { createCommunicationAttachment, getCommunicationProviderLimits } from '@/lib/clinicalCommunicationStore';
import { communicationProblem, communicationSuccess, getCommunicationAccess, problemFromError, readRecord, stringValue } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

function patientSource(value: unknown, patientId?: string) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value) || !patientId) return null;
  const record = value as Record<string, unknown>;
  const resourceType = stringValue(record.resourceType, 80);
  const resourceId = stringValue(record.resourceId, 160);
  const display = stringValue(record.display, 240);
  const resourceVersion = stringValue(record.resourceVersion, 120) || undefined;
  if (resourceType !== 'Patient' || resourceId !== patientId || !display) return null;
  return { resourceType, resourceId, resourceVersion, display };
}

export async function POST(request: Request) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  const body = await readRecord(request);
  const filename = stringValue(body?.filename, 200);
  const contentType = stringValue(body?.contentType, 120);
  const sizeBytes = typeof body?.sizeBytes === 'number' ? body.sizeBytes : Number(body?.sizeBytes);
  const patientId = stringValue(body?.patientId, 120) || undefined;
  const scopedPatientId = new URL(request.url).searchParams.get('patientId') || undefined;
  const source = patientSource(body?.source, patientId);
  if (!filename || !contentType || !Number.isFinite(sizeBytes)) return communicationProblem(400, 'VALIDATION_FAILED', 'Filename, content type, and size are required.', access!.correlationId);
  if (scopedPatientId && patientId !== scopedPatientId) return communicationProblem(422, 'PATIENT_CONTEXT_MISMATCH', 'The attachment patient context must match the selected patient.', access!.correlationId);
  if (source === null) return communicationProblem(422, 'PATIENT_CONTEXT_MISMATCH', 'Chart context must reference the selected patient.', access!.correlationId);
  try {
    const attachment = await createCommunicationAttachment({ actor: access!.actor, patientId, filename, contentType, sizeBytes, source });
    if (attachment.scanState === 'blocked') return communicationProblem(422, 'ATTACHMENT_BLOCKED', `This attachment type or size is not allowed. Maximum size is ${getCommunicationProviderLimits().maxAttachmentBytes} bytes.`, access!.correlationId);
    return communicationSuccess({ attachment, uploadUrl: attachment.storageReference, scanner: attachment.scanner }, access!.correlationId, 201);
  } catch (error) {
    return problemFromError(error, access!.correlationId);
  }
}
