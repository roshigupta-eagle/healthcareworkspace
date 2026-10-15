import { auth } from '@/lib/auth';
import { AdminConsoleShell } from './AdminConsoleShell';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth().catch(() => null);
  const user = session?.user as { name?: string } | undefined;
  return <AdminConsoleShell adminName={user?.name ?? 'Administrator'}>{children}</AdminConsoleShell>;
}
