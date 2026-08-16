"use client";

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MyQueueTab from './tabs/MyQueueTab';
import RoomsTab from './tabs/RoomsTab';
import AllQueuesTab from './tabs/AllQueuesTab';

export default function QueueWorkbench() {
  const search = useSearchParams();
  const router = useRouter();
  const queue = search.get('queue') || 'my';

  function setQueue(q: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('queue', q);
    router.replace(url.pathname + url.search);
  }

  return (
    <section aria-labelledby="queue-workbench-heading" className="p-4 bg-white border rounded">
      <div className="flex items-center justify-between">
        <h2 id="queue-workbench-heading" className="text-lg font-semibold">My Queue</h2>
        <div className="flex items-center gap-2">
          <button className={`px-3 py-1 rounded ${queue==='my' ? 'bg-sky-50 border' : 'bg-white border'}`} onClick={() => setQueue('my')}>My Queue</button>
          <button className={`px-3 py-1 rounded ${queue==='rooms' ? 'bg-sky-50 border' : 'bg-white border'}`} onClick={() => setQueue('rooms')}>Rooms</button>
          <button className={`px-3 py-1 rounded ${queue==='all' ? 'bg-sky-50 border' : 'bg-white border'}`} onClick={() => setQueue('all')}>All Queues</button>
        </div>
      </div>

      <div className="mt-4">
        {queue === 'my' && <MyQueueTab />}
        {queue === 'rooms' && <RoomsTab />}
        {queue === 'all' && <AllQueuesTab />}
      </div>
    </section>
  );
}
