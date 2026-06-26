import OrderDetailClient from '@/app/doctor/orders/OrderDetailClient';
import { fetchProcedureDetail } from '@/cardiology/services/api.mock';

export default async function OrderPage({ params }: { params: { orderId: string } }) {
  const { orderId } = params;
  const detail = await fetchProcedureDetail(orderId);
  if (!detail) return <div className="p-6">Order not found.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <OrderDetailClient initialProcedure={detail.procedure} initialVisit={detail.visit} />
    </div>
  );
}
