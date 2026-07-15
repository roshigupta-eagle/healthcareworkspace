import SchedulingAppClient from './SchedulingAppClient';

export default function SchedulingPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-neutral-900">Scheduling</h1>
      <p className="text-sm text-neutral-600 mt-1">Calendar, booking, and slot management (prototype).</p>
      <div className="mt-6">
        {/* Client component implementing the Professional Booking UI spec */}
        <SchedulingAppClient />
      </div>
    </div>
  );
}
