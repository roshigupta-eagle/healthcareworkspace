import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function OrdersPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  if (role !== 'DOCTOR' && role !== 'ADMIN') redirect('/unauthorized');

  const orders = [
    { id: 'o1', patient: 'John Doe', date: '2026-06-10', type: 'ECG', status: 'Pending' },
    { id: 'o2', patient: 'Maria Lopez', date: '2026-06-02', type: 'Blood Work', status: 'Completed' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-600">Orders</h1>
          <p className="mt-1 text-sm text-gray-600">Lab and imaging orders for patients.</p>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <ul role="list" className="divide-y divide-gray-100">
          {orders.map((o) => (
            <li key={o.id} className="px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{o.type}</p>
                <p className="mt-1 text-sm text-gray-500">{o.patient}</p>
              </div>
              <div className="text-sm text-gray-500 text-right">
                <p>{o.date}</p>
                <p className="mt-2"><span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${o.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{o.status}</span></p>
                <a className="mt-2 inline-block text-sky-600 hover:underline" href="#">View</a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
