'use client';

const CHANNEL_NAME = 'roshi-patient-records';

export function publishPatientRecordChange(patientId: string) {
  if (typeof window === 'undefined') return;
  const event = { patientId, updatedAt: Date.now() };
  window.localStorage.setItem('roshi-patient-record-change', JSON.stringify(event));
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  }
}

export function subscribeToPatientRecordChanges(onChange: (patientId: string) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== 'roshi-patient-record-change' || !event.newValue) return;
    try { onChange(JSON.parse(event.newValue).patientId); } catch {}
  };
  window.addEventListener('storage', handleStorage);
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : undefined;
  if (channel) channel.onmessage = (event: MessageEvent<{ patientId?: string }>) => { if (event.data.patientId) onChange(event.data.patientId); };
  return () => {
    window.removeEventListener('storage', handleStorage);
    channel?.close();
  };
}
