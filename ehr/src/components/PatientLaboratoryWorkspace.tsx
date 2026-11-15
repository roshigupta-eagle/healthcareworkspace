'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import LabResultsIntelligenceClient from '@/components/LabResultsIntelligenceClient';
import type { Patient } from '@/app/dashboard/records/mockPatients';
import { publishPatientRecordChange } from '@/lib/patientRecordSync';

export default function PatientLaboratoryWorkspace({
  patient,
  initialSelectedLabId,
}: {
  patient: Patient;
  initialSelectedLabId?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleReviewResult = useCallback(async ({ patientId, labId }: { patientId: string; labId: string; }) => {
    // Ensure canonical persistence via server API
    setBusy(true);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/labs/${encodeURIComponent(labId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Review API failed: ${res.status} ${txt}`);
      }

      publishPatientRecordChange(patientId);

      // Refresh server-side data and summaries (doctor-work-summary)
      try {
        router.refresh();
      } catch {}
    } catch (err) {
      // Surface minimal error for debugging
      console.error('Failed to persist lab review', err);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [router]);

  return (
    <div className="patient-lab-workspace">
      <LabResultsIntelligenceClient
        patient={patient}
        initialSelectedLabId={initialSelectedLabId}
        onReviewResult={async ({ patientId, labId }) => {
          // forward to server-backed handler
          await handleReviewResult({ patientId, labId });
        }}
      />
      {busy && <div className="mt-2 text-sm text-slate-500">Saving review…</div>}
    </div>
  );
}
