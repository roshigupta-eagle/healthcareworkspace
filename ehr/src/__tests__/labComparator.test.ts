import { describe, expect, it } from 'vitest';
import {
  DISPLAY_ONLY_COMPARATOR_RULE,
  buildComparisonGroups,
  evaluateComparison,
  normalizeLabResult,
  parseReferenceRange,
} from '../lib/labComparator';
import { mapComparisonGroupToPanel } from '../lib/labComparatorPresentation';

const baseResult = {
  name: 'Creatinine',
  code: '2160-0',
  codeSystem: 'http://loinc.org',
  unit: 'umol/L',
  specimen: 'Serum',
  method: 'Automated',
  status: 'final',
  interpretation: 'High',
  referenceRange: '45-90 umol/L',
};

describe('labComparator', () => {
  it('parses one-sided and bounded source reference ranges', () => {
    expect(parseReferenceRange('< 5.0 mmol/L')).toEqual({ high: 5, text: '< 5.0 mmol/L' });
    expect(parseReferenceRange('45-90 umol/L')).toEqual({ low: 45, high: 90, text: '45-90 umol/L' });
  });

  it('normalizes source interpretation and preserves final eligibility', () => {
    const observation = normalizeLabResult({
      ...baseResult,
      id: 'obs-current',
      result: '145',
      date: '2026-08-19T14:23:00Z',
    });

    expect(observation?.sourceInterpretation).toBe('high');
    expect(observation?.numericValue).toBe(145);
    expect(observation?.eligibleForComparison).toBe(true);
  });
  it('leaves non-standard code systems unmapped even when a code is present', () => {
    const observation = normalizeLabResult({
      ...baseResult,
      id: 'obs-local',
      codeSystem: 'http://example.org/local-lab-codes',
      result: 145,
      date: '2026-08-19T14:23:00Z',
    });

    expect(observation?.mappingStatus).toBe('unmapped');
    expect(observation?.eligibleForComparison).toBe(false);
  });


  it('does not group unmapped observations by display name', () => {
    const groups = buildComparisonGroups([
      { id: 'one', name: 'Creatinine', result: 100, date: '2026-07-01', status: 'final' },
      { id: 'two', name: 'Creatinine', result: 140, date: '2026-08-01', status: 'final' },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.evaluation.status === 'not-comparable')).toBe(true);
  });

  it('calculates a coded numeric comparison without replacing source status', () => {
    const groups = buildComparisonGroups([
      { ...baseResult, id: 'obs-previous', result: 104, date: '2026-07-11' },
      { ...baseResult, id: 'obs-current', result: 145, date: '2026-08-19' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.evaluation.status).toBe('increasing');
    expect(groups[0]?.evaluation.absoluteDelta).toBe(41);
    expect(groups[0]?.evaluation.percentageDelta).toBeCloseTo(39.423, 2);
    expect(groups[0]?.evaluation.current?.sourceInterpretation).toBe('high');
    expect(groups[0]?.evaluation.ruleId).toBe(DISPLAY_ONLY_COMPARATOR_RULE.id);
  });

  it('refuses a unit mismatch without an approved conversion rule', () => {
    const previous = normalizeLabResult({ ...baseResult, id: 'previous', result: 2, unit: 'mg/dL', date: '2026-07-01' });
    const current = normalizeLabResult({ ...baseResult, id: 'current', result: 70, unit: 'umol/L', date: '2026-08-01' });

    expect(previous).toBeDefined();
    expect(current).toBeDefined();
    const evaluation = evaluateComparison([previous!, current!]);

    expect(evaluation.status).toBe('not-comparable');
    expect(evaluation.explanation[0]).toContain('Units differ');
  });

  it('ignores preliminary results for longitudinal calculation', () => {
    const groups = buildComparisonGroups([
      { ...baseResult, id: 'preliminary', result: 100, date: '2026-08-18', status: 'preliminary' },
      { ...baseResult, id: 'final', result: 120, date: '2026-08-19', status: 'final' },
    ]);

    expect(groups[0]?.evaluation.status).toBe('new');
    expect(groups[0]?.evaluation.previous).toBeUndefined();
  });
  it('does not plot preliminary observations in the presentation trend', () => {
    const groups = buildComparisonGroups([
      { ...baseResult, id: 'preliminary', result: 100, date: '2026-08-18', status: 'preliminary' },
      { ...baseResult, id: 'final', result: 120, date: '2026-08-19', status: 'final' },
    ]);
    const panel = mapComparisonGroupToPanel(groups[0]!);

    expect(panel?.points.map((point) => point.id)).toEqual(['final']);
  });
});
