import React, { Suspense } from "react";
import ProtectedLayout from "@/components/auth/ProtectedLayout";
import NotesWorkbench from "@/components/notes/NotesWorkbench";

export default function DashboardNotesPage() {
  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-900">Notes</h1>
            <p className="text-sm text-gray-500">
              Shared, track-changes-enabled clinical and administrative documentation for all hospital staff.
            </p>
          </div>
          <Suspense fallback={<div className="text-sm text-gray-400">Loading notes…</div>}>
            <NotesWorkbench />
          </Suspense>
        </div>
      </div>
    </ProtectedLayout>
  );
}
