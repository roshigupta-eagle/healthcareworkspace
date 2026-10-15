import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function PatientReferralsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const [{ id }, queryParams] = await Promise.all([
    params,
    searchParams || Promise.resolve<SearchParams>({}),
  ]);
  const query = new URLSearchParams({ patientId: id });
  for (const key of ['asUser', 'noauth']) {
    const value = firstValue(queryParams[key]);
    if (value) query.set(key, value);
  }
  redirect(`/dashboard/referrals?${query.toString()}`);
}
