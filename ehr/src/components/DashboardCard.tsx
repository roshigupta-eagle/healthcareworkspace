export default function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/10">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
