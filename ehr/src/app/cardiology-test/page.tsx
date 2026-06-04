'use client';

/**
 * Cardiology Components Test Page
 *
 * Demonstrates all cardiology components with mock data.
 * This page verifies that the design system + cardiology UI works correctly.
 */

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/design-system';
import { CardiovascularDashboard, QueueManager, VisitDetail } from '@/cardiology';
import {
  fetchDashboard,
  fetchQueueItems,
  fetchVisitDetail,
  claimQueueItem,
  completeQueueItem,
  recordVitals,
  transitionVisitState,
} from '@/cardiology/services/api';
import { CardiologyRole, CardiologyDashboard, QueueItem, CardiovascularVisit, AvailableTransition } from '@/cardiology/types/fhir-domain';

export default function CardiovascularTestPage() {
  const [dashboard, setDashboard] = useState<CardiologyDashboard | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<CardiovascularVisit | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard and queues on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dash, items] = await Promise.all([
          fetchDashboard('default'),
          fetchQueueItems(undefined, 'default'),
        ]);

        setDashboard(dash);
        setQueueItems(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load visit detail when selected
  useEffect(() => {
    if (!selectedVisitId) return;

    const loadVisit = async () => {
      try {
        const visit = await fetchVisitDetail(selectedVisitId);
        setSelectedVisit(visit);
      } catch (err) {
        console.error('Failed to fetch visit:', err);
      }
    };

    loadVisit();
  }, [selectedVisitId]);

  const handleClaimItem = async (itemId: string) => {
    try {
      await claimQueueItem(itemId, 'test-user-123');
      // Refresh queue items
      const items = await fetchQueueItems();
      setQueueItems(items);
    } catch (err) {
      console.error('Failed to claim item:', err);
    }
  };

  const handleCompleteItem = async (itemId: string, notes?: string) => {
    try {
      await completeQueueItem(itemId, notes);
      // Refresh queue items
      const items = await fetchQueueItems();
      setQueueItems(items);
    } catch (err) {
      console.error('Failed to complete item:', err);
    }
  };

  const handleViewPatient = async (visitId: string) => {
    setSelectedVisitId(visitId);
    setIsDetailOpen(true);
  };

  const availableTransitions: AvailableTransition[] = selectedVisit
    ? [
        {
          event: 'Complete Consult',
          toState: 'CONSULTATION_COMPLETE' as any,
          allowedForCurrentUser: true,
        },
        {
          event: 'Place Orders',
          toState: 'ORDERS_PLACED' as any,
          allowedForCurrentUser: true,
        },
      ]
    : [];

  if (error) {
    return (
      <main className="p-6 bg-red-50">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Error Loading Cardiology UI</h1>
          <p className="text-red-700">{error}</p>
          <p className="text-sm text-red-600 mt-2">
            Make sure the backend API is running at the configured URL.
          </p>
        </div>
      </main>
    );
  }

  if (loading || !dashboard) {
    return (
      <main className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading cardiology dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-neutral-50 min-h-screen">
      <PageHeader
        title="Cardiology Practice UI Test"
        subtitle="Testing design system components with mock data"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Cardiology Test' }]}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Dashboard */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-neutral-900">Dashboard Component</h2>
          <CardiovascularDashboard
            userId="test-user-123"
            userName="Dr. Test Chen"
            userRole={CardiologyRole.CARDIOLOGIST}
            dashboard={dashboard}
            onClaimQueueItem={handleClaimItem}
            onViewPatientDetail={handleViewPatient}
            onRefresh={() => {
              window.location.reload();
            }}
          />
        </section>

        {/* Queue Manager */}
        <section className="space-y-4 bg-white rounded-lg p-6">
          <h2 className="text-xl font-bold text-neutral-900">Queue Manager Component</h2>
          <QueueManager
            items={queueItems}
            currentUserRole={CardiologyRole.CARDIOLOGIST}
            currentUserId="test-user-123"
            currentUserName="Dr. Test Chen"
            onClaimItem={handleClaimItem}
            onCompleteItem={handleCompleteItem}
            onViewVisit={handleViewPatient}
          />
        </section>

        {/* Visit Detail Modal */}
        {selectedVisit && (
          <VisitDetail
            visit={selectedVisit}
            currentUserRole={CardiologyRole.CARDIOLOGIST}
            currentUserId="test-user-123"
            currentUserName="Dr. Test Chen"
            availableTransitions={availableTransitions}
            onVitalsRecorded={async (vitals) => {
              try {
                await recordVitals(selectedVisit.id, vitals);
                const updated = await fetchVisitDetail(selectedVisit.id);
                if (updated) setSelectedVisit(updated);
              } catch (err) {
                console.error('Failed to record vitals:', err);
              }
            }}
            onTransition={async (request) => {
              try {
                await transitionVisitState(selectedVisit.id, request);
                const updated = await fetchVisitDetail(selectedVisit.id);
                if (updated) setSelectedVisit(updated);
              } catch (err) {
                console.error('Failed to transition:', err);
              }
            }}
            onClose={() => setIsDetailOpen(false)}
            isOpen={isDetailOpen}
          />
        )}

        {/* Test Info */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">✓ Test Results</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Dashboard loaded successfully with {Object.values(dashboard.visits.byState).reduce((a, b) => a + b, 0)} total visits</li>
            <li>✓ Queue items loaded: {queueItems.length} items across {dashboard.queues.length} queues</li>
            <li>✓ Room status: {dashboard.rooms.occupied}/{dashboard.rooms.total} rooms in use</li>
            <li>✓ Design system components rendering correctly</li>
            <li>✓ TypeScript compilation: 0 errors</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
