import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function NewReferralPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const query = new URLSearchParams({ new: '1' });
  for (const key of ['patientId']) {
    const value = firstValue(params[key]);
    if (value) query.set(key, value);
  }
  redirect(`/dashboard/referrals?${query.toString()}`);
}
