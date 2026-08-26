"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; email: string; name: string; role: string; createdAt: Date };

const ROLES = ["DOCTOR","NURSE","PHARMACIST","LAB_TECH","RECEPTIONIST","BILLING","PCA","PATIENT","ADMIN"];
const ROLE_COLORS: Record<string,string> = {
  ADMIN:"bg-red-100 text-red-800", DOCTOR:"bg-sky-100 text-sky-800",
  NURSE:"bg-green-100 text-green-800", PHARMACIST:"bg-purple-100 text-purple-800",
  LAB_TECH:"bg-yellow-100 text-yellow-800", PATIENT:"bg-neutral-100 text-neutral-700",
  PENDING:"bg-amber-100 text-amber-800",
};

export default function UserApprovalClient({ users, mode }: { users: User[]; mode: "pending"|"active" }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function approve(userId: string, role: string) {
    setLoading(userId); setError("");
    const res = await fetch(`/api/admin/users/${userId}/approve`, {
      method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ role }),
    });
    setLoading(null);
    if (!res.ok) { const d = await res.json().catch(()=>({})); setError(d.error ?? "Failed"); }
    else router.refresh();
  }

  async function reject(userId: string) {
    setLoading(userId); setError("");
    const res = await fetch(`/api/admin/users/${userId}/approve`, { method: "DELETE" });
    setLoading(null);
    if (!res.ok) setError("Failed to reject");
    else router.refresh();
  }

  if (users.length === 0) return <p className="px-5 py-4 text-sm text-neutral-400">None.</p>;

  return (
    <div className="divide-y divide-neutral-100">
      {error && <div className="px-5 py-2 text-sm text-red-700 bg-red-50">{error}</div>}
      {users.map(u => (
        <div key={u.id} className="px-5 py-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-neutral-900 truncate">{u.name}</p>
            <p className="text-xs text-neutral-500 truncate">{u.email}</p>
            <p className="text-xs text-neutral-400">{new Date(u.createdAt).toLocaleDateString()}</p>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-neutral-100 text-neutral-700"}`}>{u.role}</span>
          {mode === "pending" && (
            <div className="flex gap-2 items-center">
              <select defaultValue="" onChange={e => e.target.value && approve(u.id, e.target.value)}
                disabled={loading === u.id}
                className="text-sm border border-neutral-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="" disabled>Assign Role…</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => reject(u.id)} disabled={loading === u.id}
                className="px-2 py-1 border border-red-200 rounded text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}