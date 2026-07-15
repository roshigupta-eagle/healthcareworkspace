import Link from "next/link";
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-neutral-200 p-8 text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold text-neutral-800">Access Denied</h1>
        <p className="text-neutral-600 text-sm">You do not have permission to access this page.</p>
        <Link href="/" className="inline-block mt-2 py-2 px-6 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors">
          Return Home
        </Link>
      </div>
    </div>
  );
}