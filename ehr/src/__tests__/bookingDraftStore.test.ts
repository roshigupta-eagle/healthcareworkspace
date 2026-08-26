import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import { discardBookingDraft, getBookingDraft, saveBookingDraft } from '@/lib/bookingDraftStore';
import { resolveDataPath } from '@/lib/dataPath';

const storeFile = resolveDataPath('scheduling_booking_drafts.json');
const actorId = 'booking-draft-test-doctor';

beforeEach(async () => { await discardBookingDraft(actorId); });
afterAll(async () => { await fs.rm(storeFile, { force: true }); });

describe('booking draft store', () => {
  it('persists, replaces, and discards a clinician booking draft', async () => {
    const first = await saveBookingDraft(actorId, { patientId: 'patient-001', appointmentType: 'Consultation', date: '2026-08-25', reason: 'Follow-up' });
    expect((await getBookingDraft(actorId))?.reason).toBe('Follow-up');
    expect(first.updatedAt).toBeTruthy();

    await saveBookingDraft(actorId, { patientId: 'patient-002', appointmentType: 'Result Review', date: '2026-08-26', notes: 'Call before visit.' });
    expect((await getBookingDraft(actorId))?.patientId).toBe('patient-002');
    expect((await getBookingDraft(actorId))?.reason).toBeUndefined();

    await discardBookingDraft(actorId);
    expect(await getBookingDraft(actorId)).toBeNull();
  });
});
