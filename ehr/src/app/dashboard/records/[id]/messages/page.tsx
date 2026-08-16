import MessagesClient from '@/components/MessagesClient';
import { getPatientById } from '../../mockPatients';

export default async function MessagesPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);
  const patient = getPatientById(String(id)) || { id, name: 'Unknown Patient', mrn: '—' };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <MessagesClient patient={patient} />
    </div>
  );
}
