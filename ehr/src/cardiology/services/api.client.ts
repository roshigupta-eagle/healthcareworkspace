/**
 * Cardiology API Client (HTTP)
 *
 * Production HTTP client for the cardiology practice backend.
 * Replaces api.mock.ts for real API integration.
 *
 * Configuration via environment variables:
 * - NEXT_PUBLIC_CARDIOLOGY_API_URL (default: http://localhost:8080/cardiology)
 */

import {
  CardiologyDashboard,
  CardiovascularVisit,
  QueueItem,
  QueueName,
  QueueItemStatus,
  VitalSigns,
  User,
  TransitionRequest,
  TransitionResponse,
} from '../types/fhir-domain';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CARDIOLOGY_API_URL || 'http://localhost:8080/cardiology';

const TIMEOUT_MS = 10_000;

/**
 * Fetch with timeout and error handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch the full dashboard
 */
export async function fetchDashboard(tenantId: string = 'default'): Promise<CardiologyDashboard> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/dashboard?tenantId=${encodeURIComponent(tenantId)}`,
  );
  return response.json();
}

/**
 * Fetch a specific visit detail
 */
export async function fetchVisitDetail(visitId: string): Promise<CardiovascularVisit | null> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/visits/${encodeURIComponent(visitId)}`);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch visit detail:', error);
    return null;
  }
}

/**
 * Fetch queue items
 */
export async function fetchQueueItems(
  queueNames?: QueueName[],
  tenantId: string = 'default',
): Promise<QueueItem[]> {
  const query = new URLSearchParams();
  query.set('tenantId', tenantId);
  if (queueNames && queueNames.length > 0) {
    queueNames.forEach((q) => query.append('queues', q));
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/queues/items?${query.toString()}`);
  return response.json();
}

/**
 * Claim a queue item
 */
export async function claimQueueItem(itemId: string, userId: string): Promise<void> {
  await fetchWithTimeout(`${API_BASE_URL}/queues/items/${encodeURIComponent(itemId)}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

/**
 * Complete a queue item
 */
export async function completeQueueItem(itemId: string, notes?: string): Promise<void> {
  await fetchWithTimeout(`${API_BASE_URL}/queues/items/${encodeURIComponent(itemId)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

/**
 * Record vitals
 */
export async function recordVitals(visitId: string, vitals: VitalSigns): Promise<void> {
  await fetchWithTimeout(`${API_BASE_URL}/visits/${encodeURIComponent(visitId)}/vitals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vitals),
  });
}

/**
 * Perform a state transition
 */
export async function transitionVisitState(
  visitId: string,
  request: TransitionRequest,
): Promise<TransitionResponse> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/visits/${encodeURIComponent(visitId)}/transition`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
  );
  return response.json();
}

/**
 * Get current user from session/auth context
 * In production, this would read from NextAuth or similar
 */
export function getCurrentUser(): User | null {
  // In production, read from session context or auth provider
  // For now, return null and let the app handle auth
  return null;
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  timeout: TIMEOUT_MS,
};
