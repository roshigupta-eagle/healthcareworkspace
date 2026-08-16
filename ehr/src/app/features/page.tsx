import Link from 'next/link';

export default function FeaturesPage() {
  return (
    <main id="main-content" className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Roshi EHR — Features</h1>
        <p className="mb-6">Explore core features: Patient Records, Clinical Notes, Scheduling, Orders & Results, Prescriptions, Timeline, Messaging, and Analytics.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-white rounded shadow">Patient Records</div>
          <div className="p-4 bg-white rounded shadow">Clinical Notes</div>
          <div className="p-4 bg-white rounded shadow">Scheduling</div>
          <div className="p-4 bg-white rounded shadow">Orders & Results</div>
          <div className="p-4 bg-white rounded shadow">Prescriptions</div>
          <div className="p-4 bg-white rounded shadow">Clinical Timeline</div>
        </div>
        <div className="mt-8">
          <Link href="/" className="text-sky-600">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
