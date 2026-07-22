import MessagesClient from '@/components/MessagesClient';
import { getPatientById } from '../../mockPatients';

export default async function MessagesPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const patient = getPatientById(id) || { id, name: 'Unknown Patient', mrn: '—' };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <MessagesClient patient={patient} />
    </div>
  );
}
