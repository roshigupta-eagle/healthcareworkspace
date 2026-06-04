export default function UnauthorizedPage() {
  return (
    <main id="main-content" className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-600">
          You do not have permission to access this page.
        </p>
        <a
          href="/dashboard"
          className="mt-4 inline-block text-blue-600 hover:text-blue-500 font-medium"
        >
          Return to Dashboard
        </a>
      </div>
    </main>
  );
}
