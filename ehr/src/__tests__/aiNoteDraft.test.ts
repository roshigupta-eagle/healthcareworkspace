import { describe, expect, it } from 'vitest';
import { buildDraftSystemInstruction, detectDraftConflicts, draftQualityWarnings, extractDraftFromGatewayResponse } from '../lib/aiNoteDraft';

describe('aiNoteDraft gateway contract', () => {
  it('detects a requested date that conflicts with the authoritative appointment', () => {
    const conflicts = detectDraftConflicts('Write instructions for Tuesday, August 20, 2026.', {
      id: 'appt-1',
      type: 'Follow-up',
      date: '2026-08-25T10:30:00.000Z',
      doctor: 'Dr. Aris Thorne',
    });

    expect(conflicts.some((conflict) => conflict.field === 'date')).toBe(true);
  });

  it('builds server-side writing instructions without exposing clinician text', () => {
    const system = buildDraftSystemInstruction({
      instruction: 'your CBC results are abnormal',
      documentType: 'patient-message',
      format: 'detailed-paragraph',
      tone: 'patient-friendly',
      detail: 'standard',
      audience: 'Patient',
      structure: 'Paragraph',
    });

    expect(system).toContain('Write the actual requested document');
    expect(system).toContain('one cohesive paragraph');
    expect(system).not.toContain('your CBC results are abnormal');
    expect(system).toContain('chain-of-thought');
  });

  it('extracts only supported draft fields from gateway response shapes', () => {
    expect(extractDraftFromGatewayResponse({ draft: 'The selected result was reviewed.' })).toBe('The selected result was reviewed.');
    expect(extractDraftFromGatewayResponse({ choices: [{ message: { content: 'Please review the selected result.' } }] })).toBe('Please review the selected result.');
    expect(extractDraftFromGatewayResponse({ data: { generatedText: 'The result is documented.' } })).toBe('The result is documented.');
    expect(extractDraftFromGatewayResponse({ choices: [] })).toBeNull();
    expect(extractDraftFromGatewayResponse({ draft: '   ' })).toBeNull();
  });

  it('rejects meta-instructions and invalid detailed-paragraph output', () => {
    const metaWarnings = draftQualityWarnings({
      instruction: 'your CBC results are abnormal',
      documentType: 'clinical-paragraph',
      format: 'short-paragraph',
      tone: 'clinical',
      detail: 'concise',
    }, 'The communication should address the selected result.');
    const formatWarnings = draftQualityWarnings({
      instruction: 'explain the selected result',
      documentType: 'clinical-paragraph',
      format: 'detailed-paragraph',
      tone: 'clinical',
      detail: 'concise',
    }, 'The result was reviewed.\nThe next step is documented.');

    expect(metaWarnings.some((warning) => /meta-instructions/i.test(warning))).toBe(true);
    expect(formatWarnings.some((warning) => /detailed-paragraph/i.test(warning))).toBe(true);
  });
});