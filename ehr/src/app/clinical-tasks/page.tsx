import React from 'react';
import ClinicalTasksClient from '../../components/clinicalTasks/ClinicalTasksClient';

export default function Page() {
  return (
    <main>
      {/* Server component hosts a client component for interactive UI */}
      <ClinicalTasksClient />
    </main>
  );
}
