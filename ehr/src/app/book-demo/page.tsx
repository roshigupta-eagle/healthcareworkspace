import Link from 'next/link';

export default function BookDemoPage() {
  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-4">Book a Live Demo</h1>
        <p className="mb-4">Please contact us to schedule a personalized demo of Roshi EHR.</p>
        <div className="flex gap-4">
          <a href="mailto:sales@roshihealthcare.example" className="rounded-md bg-sky-600 text-white px-4 py-2">Email Sales</a>
          <Link href="/contact" className="rounded-md border px-4 py-2">Contact Form</Link>
        </div>
      </div>
    </main>
  );
}
