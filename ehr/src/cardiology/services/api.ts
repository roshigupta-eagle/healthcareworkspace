/**
 * Cardiology API Facade
 *
 * Exports appropriate API implementation based on environment:
 * - Development: api.mock.ts (realistic mock data)
 * - Production: api.client.ts (real HTTP backend)
 *
 * Usage is identical regardless of implementation.
 */

// Re-export all API functions and types
export * from './api.mock';

// In production, uncomment to use real API:
// export * from './api.client';

// To switch implementations:
// 1. Comment out api.mock export above
// 2. Uncomment api.client export
// 3. Set NEXT_PUBLIC_CARDIOLOGY_API_URL environment variable
// 4. Rebuild: npm run build

export const API_ENVIRONMENT = process.env.NODE_ENV === 'production' ? 'production' : 'development';
