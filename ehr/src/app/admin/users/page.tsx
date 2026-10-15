import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/design-system";
import UserApprovalClient from "./UserApprovalClient";
import { getAllMockUsers } from "@/cardiology/services/api.mock";

async function getUsers(usePreviewUsers: boolean) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    });
    if (users.length || !usePreviewUsers) return users;
  } catch {
    if (!usePreviewUsers) return [];
  }
  return Object.values(getAllMockUsers()).map((user) => ({ id: user.id, email: user.email, name: user.name, role: String(user.role), createdAt: new Date() }));
}

export default async function UsersPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth().catch(() => null);
  const params = searchParams ? await searchParams : {};
  const asUser = Array.isArray(params.asUser) ? params.asUser[0] : params.asUser;
  const preview = process.env.NODE_ENV !== 'production' && asUser === 'user-admin-khan';
  const effectiveSession = session?.user ? session : preview ? { user: { role: 'ADMIN' } } : null;
  if (!effectiveSession?.user) redirect("/login");
  if ((effectiveSession.user as any).role !== "ADMIN") redirect("/unauthorized");
  const users = await getUsers(preview);
  const pending = users.filter((u) => u.role === "PENDING");
  const active  = users.filter((u) => u.role !== "PENDING");
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <PageHeader title="User Management" subtitle={`${pending.length} pending approval • ${active.length} active accounts`} />
      {pending.length > 0 && (
        <Card className="border-l-4 border-amber-400">
          <div className="px-5 py-3 border-b border-amber-100 flex items-center gap-2">
            <span className="text-amber-600 font-bold text-sm">⚠ Pending Approval ({pending.length})</span>
          </div>
          <UserApprovalClient users={pending} mode="pending" />
        </Card>
      )}
      <Card>
        <div className="px-5 py-3 border-b border-neutral-100 font-semibold text-neutral-800">Active Users</div>
        <UserApprovalClient users={active} mode="active" />
      </Card>
    </div>
  );
}