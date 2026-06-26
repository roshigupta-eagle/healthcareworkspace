'use client';

/**
 * Cardiovascular Visit Detail
 *
 * Comprehensive patient detail view for a single visit.
 * Shows vitals, history, orders, results, notes, and allowed state transitions.
 *
 * Features:
 * - Multi-tab interface (Vitals, History, Orders, Results, Notes)
 * - Vitals entry with clinical validation
 * - State transition UI with role-based access control
 * - FHIR resource links
 * - Real-time procedure status updates
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/design-system/utils/cn';
import {
  Modal,
  Tabs,
  Card,
  Button,
  FormField,
  Input,
  Badge,
  Alert,
  Text,
} from '@/design-system';
import {
  CardiovascularVisit,
  CardiovascularVisitState,
  VitalSigns,
  CardiologyRole,
  AvailableTransition,
  TransitionRequest,
  CardiovascularProcedure,
} from '../types/fhir-domain';

interface VisitDetailProps {
  visit: CardiovascularVisit;
  currentUserRole: CardiologyRole;
  currentUserId: string;
  currentUserName: string;

  /**
   * Available state transitions for this visit + user
   */
  availableTransitions: AvailableTransition[];

  /**
   * Called when user performs a state transition
   */
  onTransition?: (request: TransitionRequest) => void;

  /**
   * Called when vitals are recorded
   */
  onVitalsRecorded?: (vitals: VitalSigns) => void;

  /**
   * Called when user dismisses the modal
   */
  onClose?: () => void;

  isOpen?: boolean;
}

/**
 * Vital sign validation rules
 */
const validateVitals = (vitals: Partial<VitalSigns>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (vitals.bpSystolic !== undefined) {
    if (vitals.bpSystolic < 0 || vitals.bpSystolic > 300) {
      errors.push('Systolic BP must be 0–300 mmHg');
    } else if (vitals.bpSystolic > 180) {
      errors.push('⚠️ Systolic BP is elevated (>180 mmHg)');
    } else if (vitals.bpSystolic < 90) {
      errors.push('⚠️ Systolic BP is low (<90 mmHg)');
    }
  }

  if (vitals.bpDiastolic !== undefined) {
    if (vitals.bpDiastolic < 0 || vitals.bpDiastolic > 200) {
      errors.push('Diastolic BP must be 0–200 mmHg');
    }
  }

  if (vitals.heartRateBpm !== undefined) {
    if (vitals.heartRateBpm < 0 || vitals.heartRateBpm > 200) {
      errors.push('Heart rate must be 0–200 bpm');
    } else if (vitals.heartRateBpm > 120) {
      errors.push('⚠️ Heart rate is elevated (>120 bpm)');
    } else if (vitals.heartRateBpm < 40) {
      errors.push('⚠️ Heart rate is low (<40 bpm)');
    }
  }

  if (vitals.oxygenSaturationPercent !== undefined) {
    if (vitals.oxygenSaturationPercent < 70 || vitals.oxygenSaturationPercent > 100) {
      errors.push('SpO₂ must be 70–100%');
    } else if (vitals.oxygenSaturationPercent < 90) {
      errors.push('❌ SpO₂ <90% — notify physician immediately');
    }
  }

  if (vitals.temperatureC !== undefined) {
    if (vitals.temperatureC < 35 || vitals.temperatureC > 42) {
      errors.push('Temperature must be 35–42°C');
    } else if (vitals.temperatureC > 39) {
      errors.push('⚠️ Fever detected (>39°C)');
    } else if (vitals.temperatureC < 36) {
      errors.push('⚠️ Hypothermia (<36°C)');
    }
  }

  return { valid: errors.filter((e) => e.startsWith('❌')).length === 0, errors };
};

export const VisitDetail: React.FC<VisitDetailProps> = ({
  visit,
  currentUserRole,
  currentUserId,
  currentUserName,
  availableTransitions,
  onTransition,
  onVitalsRecorded,
  onClose,
  isOpen = true,
}) => {
  const [activeTabId, setActiveTabId] = useState<string>('vitals');
  const [vitalsFormData, setVitalsFormData] = useState<Partial<VitalSigns>>({});
  const [vitalsValidation, setVitalsValidation] = useState<{ valid: boolean; errors: string[] }>({
    valid: true,
    errors: [],
  });
  const [pendingTransition, setPendingTransition] = useState<AvailableTransition | null>(null);
  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);

  const handleVitalsChange = useCallback((field: keyof VitalSigns, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    const updated = { ...vitalsFormData, [field]: numValue };
    setVitalsFormData(updated);
    setVitalsValidation(validateVitals(updated));
  }, [vitalsFormData]);

  const handleSubmitVitals = useCallback(() => {
    const validation = validateVitals(vitalsFormData);
    if (!validation.valid) {
      setVitalsValidation(validation);
      return;
    }
    const vitals: VitalSigns = {
      ...vitalsFormData,
      recordedAt: new Date().toISOString(),
      recordedBy: currentUserName,
    } as VitalSigns;
    onVitalsRecorded?.(vitals);
    setVitalsFormData({});
  }, [vitalsFormData, onVitalsRecorded, currentUserName]);

  const handleTransition = useCallback(
    (transition: AvailableTransition) => {
      if (!transition.allowedForCurrentUser) return;
      setIsSubmittingTransition(true);
      const request: TransitionRequest = {
        event: transition.event,
        actorId: currentUserId,
        actorRole: currentUserRole,
        notes: undefined,
      };
      onTransition?.(request);
      setTimeout(() => setIsSubmittingTransition(false), 500);
    },
    [currentUserId, currentUserRole, onTransition],
  );

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose || (() => {})}
      title={`Patient: ${visit.patientName}`}
      description={`MRN: ${visit.mrn} • DOB: ${visit.patientDOB}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Patient Header */}
        <Card variant="outlined" className="p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <Text variant="caption" className="text-neutral-600 uppercase">
                Current State
              </Text>
              <Badge variant="info" size="sm" className="mt-1">
                {visit.currentState}
              </Badge>
            </div>
            <div>
              <Text variant="caption" className="text-neutral-600 uppercase">
                Priority
              </Text>
              <Badge
                variant={visit.priority === 0 ? 'critical' : visit.priority < 50 ? 'warning' : 'info'}
                size="sm"
                className="mt-1"
              >
                {visit.priority === 0 ? 'URGENT' : visit.priority < 50 ? 'HIGH' : 'NORMAL'}
              </Badge>
            </div>
            <div>
              <Text variant="caption" className="text-neutral-600 uppercase">
                Arrived
              </Text>
              <Text variant="body-sm" className="mt-1">
                {visit.arrivedAt
                  ? new Date(visit.arrivedAt).toLocaleTimeString()
                  : 'Not yet arrived'}
              </Text>
            </div>
            <div>
              <Text variant="caption" className="text-neutral-600 uppercase">
                Room
              </Text>
              <Text variant="body-sm" className="mt-1">
                {visit.currentRoomId || 'Not assigned'}
              </Text>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'vitals', label: 'Vitals', content: null },
            { id: 'history', label: 'History', content: null },
            { id: 'orders', label: 'Orders', content: null },
            { id: 'results', label: 'Results', content: null },
            { id: 'notes', label: 'Notes', content: null },
          ]}
          activeTab={activeTabId}
          onChange={setActiveTabId}
          variant="underline"
        />
        <div className="mt-4">
          {activeTabId === 'vitals' && (
            <div className="space-y-4">
              <Card variant="outlined" className="p-4">
                <h4 className="font-semibold text-neutral-900 mb-4">Record Vitals</h4>

                {/* Validation Errors */}
                {vitalsValidation.errors.length > 0 && (
                  <Alert severity={vitalsValidation.valid ? 'warning' : 'critical'} className="mb-4">
                    <ul className="space-y-1">
                      {vitalsValidation.errors.map((error) => (
                        <li key={error} className="text-sm">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <FormField
                    label="BP Systolic"
                    hint="mmHg"
                    error={vitalsValidation.errors.find((e) => e.includes('Systolic'))}
                  >
                    <Input
                      type="number"
                      min="0"
                      max="300"
                      placeholder="e.g. 130"
                      value={vitalsFormData.bpSystolic ?? ''}
                      onChange={(e) => handleVitalsChange('bpSystolic', e.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="BP Diastolic"
                    hint="mmHg"
                    error={vitalsValidation.errors.find((e) => e.includes('Diastolic'))}
                  >
                    <Input
                      type="number"
                      min="0"
                      max="200"
                      placeholder="e.g. 80"
                      value={vitalsFormData.bpDiastolic ?? ''}
                      onChange={(e) => handleVitalsChange('bpDiastolic', e.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Heart Rate"
                    hint="bpm"
                    error={vitalsValidation.errors.find((e) => e.includes('Heart rate'))}
                  >
                    <Input
                      type="number"
                      min="0"
                      max="200"
                      placeholder="e.g. 72"
                      value={vitalsFormData.heartRateBpm ?? ''}
                      onChange={(e) => handleVitalsChange('heartRateBpm', e.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="SpO₂"
                    hint="%"
                    error={vitalsValidation.errors.find((e) => e.includes('SpO₂'))}
                  >
                    <Input
                      type="number"
                      min="70"
                      max="100"
                      placeholder="e.g. 98"
                      value={vitalsFormData.oxygenSaturationPercent ?? ''}
                      onChange={(e) => handleVitalsChange('oxygenSaturationPercent', e.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Temperature"
                    hint="°C"
                    error={vitalsValidation.errors.find((e) => e.includes('Temperature'))}
                  >
                    <Input
                      type="number"
                      min="35"
                      max="42"
                      step="0.1"
                      placeholder="e.g. 37.2"
                      value={vitalsFormData.temperatureC ?? ''}
                      onChange={(e) => handleVitalsChange('temperatureC', e.target.value)}
                    />
                  </FormField>

                  <FormField label="RR" hint="/min">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g. 16"
                      value={vitalsFormData.respirationRate ?? ''}
                      onChange={(e) => handleVitalsChange('respirationRate', e.target.value)}
                    />
                  </FormField>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  disabled={vitalsValidation.errors.filter((e) => e.startsWith('❌')).length > 0}
                  onClick={handleSubmitVitals}
                >
                  Save Vitals
                </Button>

                {/* Previous Vitals */}
                {visit.vitals && (
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                    <Text variant="caption" className="text-neutral-600 uppercase block mb-2">
                      Last Reading
                    </Text>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 text-sm">
                      <div>
                        <span className="font-medium text-neutral-900">
                          {visit.vitals.bpSystolic}/{visit.vitals.bpDiastolic}
                        </span>
                        <span className="text-neutral-600"> mmHg</span>
                      </div>
                      <div>
                        <span className="font-medium text-neutral-900">{visit.vitals.heartRateBpm}</span>
                        <span className="text-neutral-600"> bpm</span>
                      </div>
                      <div>
                        <span className="font-medium text-neutral-900">
                          {visit.vitals.oxygenSaturationPercent}
                        </span>
                        <span className="text-neutral-600">%</span>
                      </div>
                      <Text variant="caption" className="text-neutral-600">
                        by {visit.vitals.recordedBy}
                      </Text>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
          {activeTabId === 'history' && (
            <div className="space-y-4">
              <Card variant="outlined" className="p-4">
                <h4 className="font-semibold text-neutral-900 mb-3">Medical History</h4>
                <div className="space-y-3">
                  <div>
                    <Text variant="label" className="text-neutral-700">
                      Chief Complaint
                    </Text>
                    <Text variant="body-sm" className="text-neutral-600 mt-1">
                      {visit.chiefComplaint}
                    </Text>
                  </div>
                  <div>
                    <Text variant="label" className="text-neutral-700">
                      New Patient
                    </Text>
                    <Badge variant={visit.isNewPatient ? 'warning' : 'info'} size="sm" className="mt-1">
                      {visit.isNewPatient ? 'New' : 'Established'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}
          {activeTabId === 'orders' && (
            <div className="space-y-4">
              {visit.proceduresOrdered && visit.proceduresOrdered.length > 0 ? (
                visit.proceduresOrdered.map((proc) => (
                  <Card key={proc.id} variant="outlined" className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Text variant="label" className="text-neutral-900">
                          {proc.procedureType}
                        </Text>
                        <Text variant="body-sm" className="text-neutral-600 mt-1">
                          Ordered by {proc.orderedBy}
                        </Text>
                      </div>
                      <Badge
                        variant={
                          proc.status === 'COMPLETE' || proc.status === 'RESULT_AVAILABLE'
                            ? 'info'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {proc.status}
                      </Badge>
                    </div>
                  </Card>
                ))
              ) : (
                <Alert severity="info">No procedures ordered yet.</Alert>
              )}
            </div>
          )}
          {activeTabId === 'results' && (
            <div className="space-y-4">
              {visit.proceduresOrdered?.filter((p) => p.status === 'RESULT_AVAILABLE').length ? (
                visit.proceduresOrdered
                  .filter((p) => p.status === 'RESULT_AVAILABLE')
                  .map((proc) => (
                    <Card key={proc.id} variant="outlined" className="p-4">
                      <Text variant="label" className="text-neutral-900 block">
                        {proc.procedureType} Results
                      </Text>
                      <Text variant="body-sm" className="text-neutral-600 mt-2">
                        {proc.findings || 'No findings documented'}
                      </Text>
                      {proc.criticalFindings && (
                        <Alert severity="critical" className="mt-3">
                          ⚠️ Critical findings — notify physician immediately
                        </Alert>
                      )}
                    </Card>
                  ))
              ) : (
                <Alert severity="info">No results available yet.</Alert>
              )}
            </div>
          )}
          {activeTabId === 'notes' && (
            <Card variant="outlined" className="p-4">
              <Text variant="label" className="text-neutral-900 block mb-2">
                Notes
              </Text>
              <Text variant="body-sm" className="text-neutral-600">
                {visit.notes || 'No notes recorded'}
              </Text>
            </Card>
          )}
        </div>

        {/* State Transitions */}
        <Card variant="outlined" className="p-4 border-l-4 border-l-primary-600">
          <h4 className="font-semibold text-neutral-900 mb-3">Next Actions</h4>
          {availableTransitions.length === 0 ? (
            <Text variant="body-sm" className="text-neutral-600">
              No allowed transitions from current state.
            </Text>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map((transition) => (
                <Button
                  key={transition.event}
                  variant={transition.allowedForCurrentUser ? 'primary' : 'ghost'}
                  size="sm"
                  disabled={!transition.allowedForCurrentUser || isSubmittingTransition}
                  loading={isSubmittingTransition}
                  onClick={() => handleTransition(transition)}
                  title={transition.reason}
                >
                  {transition.event}
                </Button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Modal>
  );
};
