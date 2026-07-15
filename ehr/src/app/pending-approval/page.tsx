import { signOut } from "@/lib/auth";
export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-neutral-200 p-8 text-center space-y-4">
        <div className="text-5xl">⏳</div>
        <h1 className="text-xl font-bold text-neutral-800">Account Pending Review</h1>
        <p className="text-neutral-600 text-sm">
          Your account has been created and is awaiting administrator approval.
          You will receive an email notification once your access is granted.
        </p>
        <p className="text-xs text-neutral-400">If you need immediate access, contact your system administrator.</p>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button type="submit"
            className="mt-2 w-full py-2 px-4 rounded-lg border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors">
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}