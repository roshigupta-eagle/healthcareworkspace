import { useEffect, useState } from 'react';
import { createCommunicationClient, type MfeConversationSummary } from '../api/communicationClient';
import type { CommunicationHostContract } from '../contracts/hostContract';
import '../styles/remote.css';

type CommunicationHubProps = { readonly host: CommunicationHostContract; readonly title?: string };

export function CommunicationHub({ host, title = 'Communication Hub' }: CommunicationHubProps) {
  const client = createCommunicationClient(host);
  const [items, setItems] = useState<readonly MfeConversationSummary[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    client.inbox(query).then((inbox) => { if (active) { setItems(inbox.conversations); setError(null); } }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Communication service is unavailable.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);

  return <section className="roshi-communication-mfe" aria-labelledby="communication-mfe-title">
    <header className="roshi-communication-mfe__header"><div><span className="roshi-communication-mfe__kicker">Roshi clinical exchange</span><h1 id="communication-mfe-title">{title}</h1><p>Patient, care-team, pharmacy, lab, and hospital communication in one thread.</p></div><span className="roshi-communication-mfe__secure">Secure BFF connection</span></header>
    <div className="roshi-communication-mfe__toolbar"><label><span className="sr-only">Search communications</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient or topic" /></label><span aria-live="polite">{loading ? 'Loading' : `${items.length} conversations`}</span></div>
    {error && <div className="roshi-communication-mfe__error" role="alert">{error}</div>}
    {!loading && !error && items.length === 0 && <div className="roshi-communication-mfe__empty"><strong>No conversations found</strong><span>Try another search or start a secure communication.</span></div>}
    <div className="roshi-communication-mfe__list" aria-label="Conversations">{items.map((item) => <button type="button" key={item.id} className={item.id === selectedId ? 'is-selected' : ''} onClick={() => { setSelectedId(item.id); host.emit({ type: 'conversationSelected', conversationId: item.id }); }}><span className="roshi-communication-mfe__avatar">{item.participantName.slice(0, 2).toUpperCase()}</span><span><strong>{item.participantName}</strong><b>{item.topic}</b><small>{item.patientName || 'Administrative'} ? {item.preview}</small></span><time dateTime={item.lastActivityAt}>{new Date(item.lastActivityAt).toLocaleDateString(host.locale)}</time></button>)}</div>
  </section>;
}
