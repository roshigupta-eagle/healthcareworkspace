import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCanonicalPatientDirectory } from '@/lib/patientDirectory';
import { getOrderSnapshot } from '@/lib/orderStore';
import OrdersCommandCenterClient from './OrdersCommandCenterClient';

export default async function OrdersPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const asUser = Array.isArray(resolvedSearchParams.asUser) ? resolvedSearchParams.asUser[0] || '' : resolvedSearchParams.asUser || '';
  const noAuth = Boolean(resolvedSearchParams.noauth);
  const preview = process.env.NODE_ENV !== 'production' && (noAuth || ['dev', 'dev-doctor'].includes(asUser));
  const previewQuery = preview ? `${noAuth ? 'noauth=1' : ''}${noAuth && asUser ? '&' : ''}${asUser ? `asUser=${encodeURIComponent(asUser)}` : noAuth ? 'asUser=dev' : ''}` : '';
  let session = await auth().catch(() => null);
  if (!session && preview) session = { user: { id: 'dev-doctor', name: 'Doctor User', role: 'DOCTOR' } } as typeof session;
  if (!session) redirect('/login');

  const role = session.user.role;
  if (role !== 'DOCTOR' && role !== 'ADMIN') redirect('/unauthorized');
  const patients = (await getCanonicalPatientDirectory({ preview })).patients;
  const initialData = getOrderSnapshot();
  const orderId = Array.isArray(resolvedSearchParams.orderId) ? resolvedSearchParams.orderId[0] : resolvedSearchParams.orderId;
  return <OrdersCommandCenterClient initialData={initialData} patients={patients} preview={previewQuery} initialOrderId={orderId} initialCreateOpen={resolvedSearchParams.new === '1'} />;
}
