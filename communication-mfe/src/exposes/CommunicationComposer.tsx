import { useState, type FormEvent } from 'react';
import { createCommunicationClient } from '../api/communicationClient';
import type { CommunicationHostContract } from '../contracts/hostContract';
import '../styles/remote.css';

type CommunicationComposerProps = { readonly host: CommunicationHostContract; readonly recipientId: string; readonly patientId?: string; readonly subject?: string };

function newIdempotencyKey() { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `communication-${Date.now()}`; }

export function CommunicationComposer({ host, recipientId, patientId, subject = '' }: CommunicationComposerProps) {
  const client = createCommunicationClient(host);
  const [bodyText, setBodyText] = useState('');
  const [currentSubject, setCurrentSubject] = useState(subject);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bodyText.trim() || !currentSubject.trim() || status === 'sending') return;
    setStatus('sending');
    setError(null);
    try {
      const result = await client.createConversation({ recipientId, patientId, subject: currentSubject.trim(), bodyText: bodyText.trim(), category: 'General', priority: 'routine', channel: 'secure_message' }, newIdempotencyKey());
      const record = result as { readonly id?: unknown; readonly messages?: readonly { readonly id?: unknown }[] };
      const messageId = typeof record.messages?.[0]?.id === 'string' ? record.messages[0].id : '';
      if (typeof record.id !== 'string' || !messageId) throw new Error('The communication response was incomplete.');
      setBodyText('');
      setStatus('sent');
      host.emit({ type: 'messageAccepted', messageId, conversationId: record.id });
    } catch (caught: unknown) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'The communication could not be sent.');
    }
  }

  return <form className="roshi-communication-composer" onSubmit={(event) => void submit(event)}><div className="roshi-communication-composer__notice"><strong>Secure communication</strong><span>Confirm the patient and recipient before sending. This service is not for emergencies.</span></div><label>Subject<input value={currentSubject} onChange={(event) => setCurrentSubject(event.target.value)} required /></label><label>Message<textarea value={bodyText} onChange={(event) => { setBodyText(event.target.value); host.emit({ type: 'draftStateChanged', state: event.target.value ? 'dirty' : 'empty' }); }} rows={6} placeholder="Write a clear, patient-friendly message..." required /></label>{error && <div className="roshi-communication-mfe__error" role="alert">{error}</div>}{status === 'sent' && <div className="roshi-communication-mfe__success" role="status">Message accepted by Roshi and retained in the communication thread.</div>}<div className="roshi-communication-composer__actions"><button type="submit" disabled={status === 'sending' || !bodyText.trim() || !currentSubject.trim()}>{status === 'sending' ? 'Sending' : 'Review and send'}</button></div></form>;
}
