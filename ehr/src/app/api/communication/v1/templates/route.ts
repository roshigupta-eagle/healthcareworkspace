import { communicationSuccess, getCommunicationAccess } from '@/lib/communicationBff';

export const dynamic = 'force-dynamic';

const templates = [
  { id: 'medication-instruction', title: 'Medication instruction', category: 'Medication', preview: 'Please take this medication exactly as directed. Contact the care team if side effects occur.' },
  { id: 'lab-follow-up', title: 'Lab result follow-up', category: 'Lab', preview: 'Your result has been reviewed. Please contact the clinic if your symptoms change or continue.' },
  { id: 'appointment-follow-up', title: 'Appointment follow-up', category: 'Appointment', preview: 'We can help arrange a follow-up appointment. Please share the times that work best for you.' },
  { id: 'request-information', title: 'Request more information', category: 'General', preview: 'Please send the additional details so the care team can review your question safely.' },
  { id: 'emergency-warning', title: 'Emergency guidance', category: 'Safety', preview: 'This service is not for emergencies. For urgent or life-threatening symptoms, contact emergency services.' },
];

export async function GET(request: Request) {
  const { access, response } = await getCommunicationAccess(request);
  if (response) return response;
  return communicationSuccess(templates, access!.correlationId);
}
