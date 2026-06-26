import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAllMockUsers } from '@/cardiology/services/api.mock';
import Link from 'next/link';

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/unauthorized');

  const { id } = await params;

  let user: any = null;
  try {
    user = await prisma.user.findUnique({ where: { id } });
  } catch (err) {
    // fallback to mock users
    const all = getAllMockUsers();
    user = all[id] || Object.values(all).find((u: any) => u.email === id) || null;
  }

  if (!user) return notFound();

  return (
    <main className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-600">{user.name ?? user.email ?? user.id}</h1>
          <p className="text-sm text-gray-600">{user.email ?? '—'} • {user.role ?? '—'}</p>
        </div>
        <div className="space-x-2">
          <Link href="/admin/users" className="text-sm text-sky-600 hover:underline">Back to list</Link>
        </div>
      </div>

      <section className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold">User details</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">ID</p>
            <p className="font-medium">{user.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-medium">{user.role ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{user.email ?? '—'}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
