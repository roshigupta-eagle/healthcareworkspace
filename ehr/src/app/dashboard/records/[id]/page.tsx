import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPatientById } from '../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';

export default async function PatientDetailPage({ params, searchParams }: { params: any; searchParams?: Record<string, string | string[]> }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // allow dev preview
  }
  // Support dev override via ?asUser=USER_ID (only outside production)
  if (!session && searchParams && searchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(searchParams.asUser) ? searchParams.asUser[0] : searchParams.asUser;
    if (override) {
      session = { user: { id: override, name: override } };
    }
  }
  if (!session) redirect('/login');

  const patient = getPatientById(String(id));
  if (!patient) {
    redirect('/dashboard/records');
  }

  const statusClass = (s: string | undefined) => {
    if (!s) return 'bg-gray-100 text-gray-700';
    if (s === 'Scheduled') return 'bg-blue-100 text-blue-800';
    if (s === 'Confirmed') return 'bg-green-100 text-green-800';
    if (s === 'Cancelled' || s === 'Canceled') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="mb-4">
        <Link href="/dashboard/records" className="inline-flex items-center text-sm text-teal-600 hover:underline gap-2">← Back to Records</Link>
      </div>

      <PatientProfileHeader patient={patient} />
      {/* AI summary + Vitals trend */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50">
          <h4 className="text-sm font-semibold text-gray-800">🤖 AI Health Summary</h4>
          <div className="mt-3 text-sm text-gray-700">
            {(() => {
              const bullets: string[] = [];
              if (patient.labResults && patient.labResults.length > 0) {
                const latest = patient.labResults[0];
                bullets.push(`Latest lab: ${latest.name} ${latest.result}${latest.unit ? ' ' + latest.unit : ''} (${latest.normalRange || 'ref'}) on ${latest.date}`);
              }
              if (patient.upcoming && patient.upcoming.length > 0) {
                bullets.push(`Next appointment: ${patient.upcoming[0].type} with ${patient.upcoming[0].doctor} on ${patient.upcoming[0].date}`);
              }
              if (bullets.length === 0) bullets.push('No recent labs or upcoming appointments to summarize.');
              return (
                <ul className="list-disc list-inside space-y-2">
                  {bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              );
            })()}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50">
          <h4 className="text-sm font-semibold text-gray-800">Vitals Trend</h4>
          <div className="mt-3 text-sm text-gray-700">
            <div className="text-xs text-gray-500">Weight</div>
            <div className="text-2xl font-bold text-gray-900">{patient.weight || '—'}</div>
            <div className="mt-3">
              <svg className="w-full h-16" viewBox="0 0 100 30" preserveAspectRatio="none">
                <polyline fill="none" stroke="#06b6d4" strokeWidth="2" points="0,20 20,15 40,12 60,10 80,8 100,6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Unified timeline feed (notes, visits, labs, appointments) */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-800">Timeline</h3>
        <div className="mt-3 bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50">
          {(() => {
            const events: any[] = [];
            (patient.notes || []).forEach((n: any) => events.push({ type: 'note', date: n.date, title: `Note by ${n.author}`, content: n.snippet }));
            (patient.history || []).forEach((h: any) => events.push({ type: 'visit', date: h.date, title: h.reason, content: h.provider }));
            (patient.labResults || []).forEach((l: any) => events.push({ type: 'lab', date: l.date, title: l.name, content: `${l.result}${l.unit ? ' ' + l.unit : ''}` }));
            (patient.upcoming || []).forEach((a: any) => events.push({ type: 'appt', date: a.date, title: a.type, content: `${a.doctor} • ${a.status || 'Planned'}` }));

            events.sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime()));

            if (events.length === 0) return <div className="text-sm text-gray-500">No timeline events</div>;

            return (
              <div className="space-y-3">
                {events.map((e, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-10 text-xs text-gray-400">{new Date(e.date).toLocaleString()}</div>
                    <div className="flex-1 bg-gray-50 p-3 rounded-md">
                      <div className="text-sm font-medium text-gray-900">{e.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{e.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-lg ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" />
                Current Health Concerns
              </h3>
            </div>
            <div className="mt-1 space-y-2">
              {(patient.currentConcerns && patient.currentConcerns.length > 0) ? (
                patient.currentConcerns.map((c: string, i: number) => (
                  <div key={i} className="inline-block mr-2 mb-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-sm">{c}</div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No active concerns recorded.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50">
            <h3 className="flex items-center gap-3 text-sm font-semibold text-gray-800"><span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" />Key Conditions</h3>
            <div className="mt-3 space-y-2">
              {(patient.conditions || []).map((c: string) => (
                <div key={c} className="inline-block mr-2 mb-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm">{c}</div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">All Medications</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {(patient.medications || []).map((m: any) => (
                <li key={m.name} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{m.name}</div>
                    <div className="text-xs text-gray-500">{m.freq || ''}</div>
                  </div>
                  <div className="text-sm text-gray-700">{m.dose || '—'}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-lg ring-1 ring-gray-100">
            <h3 className="flex items-center gap-3 text-sm font-semibold text-gray-800"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />Upcoming Tests</h3>
            <div className="mt-3 text-sm text-gray-700 space-y-2">
              {(patient.tests && patient.tests.length > 0) ? (
                patient.tests.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.date}</div>
                    </div>
                    <div className="text-xs text-gray-500">{t.status}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No upcoming tests</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Recent Lab Results</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              {(patient.labResults && patient.labResults.length > 0) ? (
                patient.labResults.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">{l.name}</div>
                      <div className="text-xs text-gray-500">{l.date} • {l.unit || ''}</div>
                    </div>
                    <div className="text-sm text-gray-700">{l.result} <span className="text-xs text-gray-500">({l.normalRange})</span></div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No recent lab results</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-lg ring-1 ring-gray-100">
            <h3 className="flex items-center gap-3 text-sm font-semibold text-gray-800"><span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />Upcoming Appointments</h3>
            <div className="mt-3 text-sm text-gray-700 space-y-2">
              {(patient.upcoming && patient.upcoming.length > 0) ? (
                patient.upcoming.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">{a.date}</div>
                      <div className="text-xs text-gray-500">{a.doctor} • {a.type}</div>
                    </div>
                    <div className={`text-sm px-2 py-1 rounded-full ${statusClass(a.status)}`}>{a.status || 'Planned'}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No upcoming appointments</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Doctor Notes (Recent)</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              {(patient.notes || []).map((n: any) => (
                <div key={n.id} className="border-b border-gray-100 pb-2">
                  <div className="font-medium text-gray-900">{n.author} <span className="text-xs text-gray-500">• {n.date}</span></div>
                  <div className="text-xs text-gray-500">{n.snippet}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-lg ring-1 ring-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-800">Medical History</h3>
        <div className="mt-3 text-sm text-gray-700 space-y-3">
          <div>
            <div className="text-xs text-gray-500">Allergies</div>
            <div className="font-medium">{patient.allergies?.length ? patient.allergies.join(', ') : (patient.documents?.length ? 'See uploaded documents' : 'No allergies recorded')}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Immunizations</div>
            <div className="font-medium">{patient.immunizations?.length ? patient.immunizations.join(', ') : (patient.tests?.map((t: any) => t.name).join(', ') || '—')}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Visit History</div>
            <div className="mt-2 space-y-2">
              {(patient.history || []).map((h: any) => (
                <div key={h.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">{h.date} — {h.reason}</div>
                    <div className="text-xs text-gray-500">{h.provider}</div>
                  </div>
                  <div className="text-xs text-gray-500">{h.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Documents</div>
            <ul className="mt-2 space-y-1">
              {(patient.documents || []).map((d: any) => (
                <li key={d.id} className="text-sm text-teal-600 hover:underline"><a href={d.url}>{d.name} • {d.date}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
