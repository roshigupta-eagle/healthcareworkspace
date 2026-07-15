import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect("/login");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role;
  if (!["PATIENT","ADMIN"].includes(role)) redirect("/unauthorized");
  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="bg-white border-b border-neutral-200 px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-sky-700">My Health Portal</span>
        <div className="flex gap-4 text-sm text-neutral-600">
          <a href="/patient/dashboard" className="hover:text-sky-700">Dashboard</a>
          <a href="/patient/records" className="hover:text-sky-700">My Records</a>
          <a href="/scheduling" className="hover:text-sky-700">Appointments</a>
        </div>
        <span className="text-xs text-neutral-400">{session.user.name ?? session.user.email}</span>
      </nav>
      <main className="max-w-4xl mx-auto p-6">{children}</main>
    </div>
  );
}