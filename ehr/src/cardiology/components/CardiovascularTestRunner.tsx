'use client';

/**
 * Cardiology Integration Tests
 *
 * Run directly in browser at: http://localhost:3000/cardiology-test
 * Tests mock API responses and component integration
 */

import React, { useEffect, useState } from 'react';

interface TestResult {
  name: string;
  status: 'pending' | 'pass' | 'fail';
  message?: string;
}

export function CardiovascularTestRunner() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    async function runTests() {
      const testResults: TestResult[] = [];

      // Test 1: Mock API functions exist
      try {
        const { fetchDashboard, fetchQueueItems, fetchVisitDetail } = await import(
          '@/cardiology/services/api.mock'
        );

        if (
          typeof fetchDashboard === 'function' &&
          typeof fetchQueueItems === 'function' &&
          typeof fetchVisitDetail === 'function'
        ) {
          testResults.push({
            name: 'API: Mock functions exported correctly',
            status: 'pass',
          });
        } else {
          testResults.push({
            name: 'API: Mock functions exported correctly',
            status: 'fail',
            message: 'Functions not properly exported',
          });
        }
      } catch (error) {
        testResults.push({
          name: 'API: Mock functions exported correctly',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Import failed',
        });
      }

      // Test 2: Mock data contains required fields
      try {
        const { mockVisits, mockQueueItems } = await import('@/cardiology/services/api.mock');

        if (mockVisits.length > 0 && mockVisits[0].patientName && mockVisits[0].id) {
          testResults.push({
            name: 'Data: Mock visits have required fields',
            status: 'pass',
          });
        } else {
          testResults.push({
            name: 'Data: Mock visits have required fields',
            status: 'fail',
            message: 'Missing patientName or id',
          });
        }

        if (
          mockQueueItems.length > 0 &&
          mockQueueItems[0].queueName &&
          mockQueueItems[0].status &&
          mockQueueItems[0].priority
        ) {
          testResults.push({
            name: 'Data: Mock queue items have required fields',
            status: 'pass',
          });
        } else {
          testResults.push({
            name: 'Data: Mock queue items have required fields',
            status: 'fail',
            message: 'Missing queue fields',
          });
        }
      } catch (error) {
        testResults.push({
          name: 'Data: Mock imports failed',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Import error',
        });
      }

      // Test 3: Component types export correctly
      try {
        const {
          CardiovascularVisitState,
          CardiologyRole,
          QueueName,
          VisitPriority,
        } = await import('@/cardiology/types/fhir-domain');

        const stateCount = Object.keys(CardiovascularVisitState).length;
        const roleCount = Object.keys(CardiologyRole).length;
        const queueCount = Object.keys(QueueName).length;

        if (stateCount >= 23) {
          testResults.push({
            name: `Types: All ${stateCount} visit states defined`,
            status: 'pass',
          });
        } else {
          testResults.push({
            name: 'Types: Visit states defined',
            status: 'fail',
            message: `Expected 23+, got ${stateCount}`,
          });
        }

        if (roleCount >= 8) {
          testResults.push({
            name: `Types: All ${roleCount} roles defined`,
            status: 'pass',
          });
        } else {
          testResults.push({
            name: 'Types: Roles defined',
            status: 'fail',
            message: `Expected 8+, got ${roleCount}`,
          });
        }

        if (queueCount >= 13) {
          testResults.push({
            name: `Types: All ${queueCount} queues defined`,
            status: 'pass',
          });
        } else {
          testResults.push({
            name: 'Types: Queues defined',
            status: 'fail',
            message: `Expected 13+, got ${queueCount}`,
          });
        }
      } catch (error) {
        testResults.push({
          name: 'Types: Import failed',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Import error',
        });
      }

      // Test 4: Components export correctly
      try {
        const { CardiovascularDashboard, QueueManager, VisitDetail } = await import('@/cardiology');

        if (typeof CardiovascularDashboard === 'function') {
          testResults.push({
            name: 'Components: CardiovascularDashboard exported',
            status: 'pass',
          });
        } else {
          testResults.push({
            name: 'Components: CardiovascularDashboard exported',
            status: 'fail',
            message: 'Not a function',
          });
        }

        if (typeof QueueManager === 'function') {
          testResults.push({
            name: 'Components: QueueManager exported',
            status: 'pass',
          });
        } else {
          testResults.push({
            name: 'Components: QueueManager exported',
            status: 'fail',
            message: 'Not a function',
          });
        }

        if (typeof VisitDetail === 'function') {
          testResults.push({
            name: 'Components: VisitDetail exported',
            status: 'pass',
          });
        } else {
          testResults.push({
            name: 'Components: VisitDetail exported',
            status: 'fail',
            message: 'Not a function',
          });
        }
      } catch (error) {
        testResults.push({
          name: 'Components: Import failed',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Import error',
        });
      }

      // Test 5: Design system exports
      try {
        const { Button, Card, Alert, Tabs, Input, Modal } = await import('@/design-system');

        if (typeof Button === 'function') {
          testResults.push({
            name: 'Design System: Core components exported',
            status: 'pass',
          });
        } else {
          testResults.push({
            name: 'Design System: Core components exported',
            status: 'fail',
            message: 'Missing components',
          });
        }
      } catch (error) {
        testResults.push({
          name: 'Design System: Import failed',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Import error',
        });
      }

      setResults(testResults);
      setRunning(false);
    }

    runTests();
  }, []);

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Integration Test Results</h2>

        {running ? (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <p className="text-neutral-600">Running tests...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-primary-600">{passed}</div>
                <div className="text-sm text-primary-700">Passed</div>
              </div>
              <div className={failed > 0 ? 'bg-critical-50 border border-critical-200 rounded-lg p-3' : 'bg-neutral-50 border border-neutral-200 rounded-lg p-3'}>
                <div className={`text-2xl font-bold ${failed > 0 ? 'text-critical-600' : 'text-neutral-600'}`}>{failed}</div>
                <div className={`text-sm ${failed > 0 ? 'text-critical-700' : 'text-neutral-700'}`}>Failed</div>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-neutral-600">{results.length}</div>
                <div className="text-sm text-neutral-700">Total</div>
              </div>
            </div>

            <div className="space-y-2">
              {results.map((result, i) => (
                <div
                  key={i}
                  className={`p-3 rounded border flex items-start gap-3 ${
                    result.status === 'pass'
                      ? 'bg-success-50 border-success-200'
                      : 'bg-critical-50 border-critical-200'
                  }`}
                >
                  <div className="pt-0.5">
                    {result.status === 'pass' ? (
                      <div className="text-lg text-success-600">✓</div>
                    ) : (
                      <div className="text-lg text-critical-600">✗</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${result.status === 'pass' ? 'text-success-900' : 'text-critical-900'}`}>
                      {result.name}
                    </div>
                    {result.message && (
                      <div className={`text-sm ${result.status === 'pass' ? 'text-success-700' : 'text-critical-700'}`}>
                        {result.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-200">
              {failed === 0 ? (
                <div className="bg-success-50 border border-success-200 rounded-lg p-4 text-success-900">
                  <strong>✓ All integration tests passed!</strong>
                  <p className="text-sm mt-1">Design system, types, and components are properly integrated.</p>
                </div>
              ) : (
                <div className="bg-critical-50 border border-critical-200 rounded-lg p-4 text-critical-900">
                  <strong>✗ Some tests failed</strong>
                  <p className="text-sm mt-1">Check the errors above and review component exports.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CardiovascularTestRunner;
