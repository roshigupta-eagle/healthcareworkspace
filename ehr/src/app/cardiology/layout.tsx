import React from 'react';

export default function CardiologyLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-gray-50">
      <div className="max-w-8xl mx-auto p-4">{children}</div>
    </section>
  );
}
