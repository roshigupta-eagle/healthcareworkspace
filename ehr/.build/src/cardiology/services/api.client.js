"use strict";
/**
 * Cardiology API Client (HTTP)
 *
 * Production HTTP client for the cardiology practice backend.
 * Replaces api.mock.ts for real API integration.
 *
 * Configuration via environment variables:
 * - NEXT_PUBLIC_CARDIOLOGY_API_URL (default: http://localhost:8080/cardiology)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_CONFIG = void 0;
exports.fetchDashboard = fetchDashboard;
exports.fetchVisitDetail = fetchVisitDetail;
exports.fetchQueueItems = fetchQueueItems;
exports.claimQueueItem = claimQueueItem;
exports.completeQueueItem = completeQueueItem;
exports.recordVitals = recordVitals;
exports.transitionVisitState = transitionVisitState;
exports.getCurrentUser = getCurrentUser;
exports.healthCheck = healthCheck;
const API_BASE_URL = process.env.NEXT_PUBLIC_CARDIOLOGY_API_URL || 'http://localhost:8080/cardiology';
const TIMEOUT_MS = 10000;
/**
 * Fetch with timeout and error handling
 */
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(url, Object.assign(Object.assign({}, options), { signal: controller.signal }));
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        return response;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
/**
 * Fetch the full dashboard
 */
async function fetchDashboard(tenantId = 'default') {
    const response = await fetchWithTimeout(`${API_BASE_URL}/dashboard?tenantId=${encodeURIComponent(tenantId)}`);
    return response.json();
}
/**
 * Fetch a specific visit detail
 */
async function fetchVisitDetail(visitId) {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/visits/${encodeURIComponent(visitId)}`);
        return response.json();
    }
    catch (error) {
        console.error('Failed to fetch visit detail:', error);
        return null;
    }
}
/**
 * Fetch queue items
 */
async function fetchQueueItems(queueNames, tenantId = 'default') {
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
async function claimQueueItem(itemId, userId) {
    await fetchWithTimeout(`${API_BASE_URL}/queues/items/${encodeURIComponent(itemId)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
    });
}
/**
 * Complete a queue item
 */
async function completeQueueItem(itemId, notes) {
    await fetchWithTimeout(`${API_BASE_URL}/queues/items/${encodeURIComponent(itemId)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
    });
}
/**
 * Record vitals
 */
async function recordVitals(visitId, vitals) {
    await fetchWithTimeout(`${API_BASE_URL}/visits/${encodeURIComponent(visitId)}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vitals),
    });
}
/**
 * Perform a state transition
 */
async function transitionVisitState(visitId, request) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/visits/${encodeURIComponent(visitId)}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });
    return response.json();
}
/**
 * Get current user from session/auth context
 * In production, this would read from NextAuth or similar
 */
function getCurrentUser() {
    // In production, read from session context or auth provider
    // For now, return null and let the app handle auth
    return null;
}
/**
 * Health check
 */
async function healthCheck() {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/health`);
        return response.ok;
    }
    catch (_a) {
        return false;
    }
}
exports.API_CONFIG = {
    baseUrl: API_BASE_URL,
    timeout: TIMEOUT_MS,
};
