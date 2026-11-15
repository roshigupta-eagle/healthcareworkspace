import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCanonicalPatientDirectory } from '@/lib/patientDirectory';
import { getOrderSnapshot } from '@/lib/orderStore';
import OrdersCommandCenterClient from './OrdersCommandCenterClient';

export default async function OrdersPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Forders');

  const role = session.user.role;
  if (role !== 'DOCTOR') redirect('/unauthorized');
  const patients = (await getCanonicalPatientDirectory()).patients;
  const initialData = getOrderSnapshot();
  const orderId = Array.isArray(resolvedSearchParams.orderId) ? resolvedSearchParams.orderId[0] : resolvedSearchParams.orderId;
  return <OrdersCommandCenterClient initialData={initialData} patients={patients} initialOrderId={orderId} initialCreateOpen={resolvedSearchParams.new === '1'} />;
}
