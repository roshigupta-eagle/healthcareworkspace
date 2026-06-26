'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button } from '@/design-system';
import { FormField } from '@/design-system';
import { Input } from '@/design-system/primitives/Input';
import type { User, CardiovascularVisit } from '@/cardiology/types/fhir-domain';
import { CardiologyRole } from '@/cardiology/types/fhir-domain';

interface AdminAssignPanelProps {
  onAssigned?: () => void;
}

const AdminAssignPanel: React.FC<AdminAssignPanelProps> = ({ onAssigned }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [visits, setVisits] = useState<CardiovascularVisit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('new');
  const [doctorId, setDoctorId] = useState<string>('');
  const [patientId, setPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [symptoms, setSymptoms] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [nextSteps, setNextSteps] = useState<string>('');
  const [recommendedProcedure, setRecommendedProcedure] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [uRes, vRes] = await Promise.all([
          fetch('/api/cardiology/users'),
          fetch('/api/cardiology/visits'),
        ]);
        if (uRes.ok) setUsers(await uRes.json());
        if (vRes.ok) setVisits(await vRes.json());
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('admin panel fetch error', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedVisitId && selectedVisitId !== 'new') {
      const v = visits.find((x) => x.id === selectedVisitId);
      if (v) {
        setPatientId(v.patientId);
        setPatientName(v.patientName);
      }
    } else {
      setPatientId('');
      setPatientName('');
    }
  }, [selectedVisitId, visits]);

  const doctors = users.filter((u) => u.role === CardiologyRole.CARDIOLOGIST || u.role === CardiologyRole.SYSTEM || u.role === CardiologyRole.ADMIN);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload: any = {
        doctorId,
        doctorName: users.find((u) => u.id === doctorId)?.name || '',
        assignedBy: 'admin-ui',
      };

      if (selectedVisitId && selectedVisitId !== 'new') {
        const v = visits.find((x) => x.id === selectedVisitId);
        payload.patientId = v?.patientId;
        payload.patientName = v?.patientName;
      } else {
        payload.patientId = patientId || `patient-${Date.now()}`;
        payload.patientName = patientName || 'Unnamed Patient';
      }

      if (symptoms) payload.symptoms = symptoms.split(',').map((s) => s.trim()).filter(Boolean);
      if (diagnosis) payload.diagnosis = diagnosis;
      if (nextSteps) payload.nextSteps = nextSteps;
      if (recommendedProcedure) payload.recommendedProcedure = recommendedProcedure;

      const res = await fetch('/api/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: json?.error || 'Failed to assign' });
      } else {
        setMessage({ type: 'success', text: 'Assignment created' });
        setSymptoms('');
        setDiagnosis('');
        setNextSteps('');
        setRecommendedProcedure('');
        if (onAssigned) onAssigned();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('assign error', err);
      setMessage({ type: 'error', text: 'Network error' });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && (
        <div className={message.type === 'success' ? 'text-success-700' : 'text-critical-700'}>
          {message.text}
        </div>
      )}

      <FormField label="Choose existing visit" id="visit-select">
        <select
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          value={selectedVisitId}
          onChange={(e) => setSelectedVisitId(e.target.value)}
        >
          <option value="new">Create new patient...</option>
          {visits.map((v) => (
            <option key={v.id} value={v.id}>
              {v.patientName} — {v.chiefComplaint}
            </option>
          ))}
        </select>
      </FormField>

      {selectedVisitId === 'new' && (
        <>
          <FormField label="Patient name" id="patient-name">
            <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} fullWidth />
          </FormField>
          <FormField label="Patient ID (optional)" id="patient-id">
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} fullWidth />
          </FormField>
        </>
      )}

      <FormField label="Assign to doctor" id="doctor-select">
        <select
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          required
        >
          <option value="">Select doctor...</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Symptoms (comma separated)" id="symptoms">
        <Input value={symptoms} onChange={(e) => setSymptoms(e.target.value)} fullWidth />
      </FormField>

      <FormField label="Diagnosis" id="diagnosis">
        <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} fullWidth />
      </FormField>

      <FormField label="Next steps" id="next-steps">
        <textarea
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 min-h-[60px]"
        />
      </FormField>

      <FormField label="Recommended procedure" id="recommended-proc">
        <Input value={recommendedProcedure} onChange={(e) => setRecommendedProcedure(e.target.value)} fullWidth />
      </FormField>

      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" type="submit" disabled={loading || !doctorId}>
          {loading ? 'Assigning…' : 'Assign'}
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => {
          setSelectedVisitId('new');
          setDoctorId('');
          setPatientId('');
          setPatientName('');
          setSymptoms('');
          setDiagnosis('');
          setNextSteps('');
          setRecommendedProcedure('');
          setMessage(null);
        }}>
          Reset
        </Button>
      </div>
    </form>
  );
};

export default AdminAssignPanel;
