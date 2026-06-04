import Link from "next/link";

export default function Home() {
  return (
    <main id="main-content" className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Healthcare EHR
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          FHIR-native Electronic Health Record System
        </p>
        <p className="mt-2 text-sm text-gray-500">
          WCAG 2.2 AA Compliant &bull; Canadian Healthcare Standards
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
