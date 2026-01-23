import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

/**
 * Offline queue item for pending API requests.
 */
export interface QueuedRequest {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
  timestamp: number;
  retryCount: number;
}

/**
 * Cached score for offline storage.
 */
export interface CachedScore {
  id: string;
  submissionId: string;
  seatId: string;
  criterionId: string;
  phase: 'appearance' | 'taste_texture';
  scoreValue: number;
  comment?: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  timestamp: number;
}

/**
 * Cached submission for offline reference.
 */
export interface CachedSubmission {
  id: string;
  categoryId: string;
  teamId: string;
  submissionNumber: number;
  status: string;
  cachedAt: number;
}

/**
 * IndexedDB schema for the CBA app.
 */
interface CBADatabase extends DBSchema {
  'offline-queue': {
    key: string;
    value: QueuedRequest;
    indexes: { 'by-timestamp': number };
  };
  'cached-scores': {
    key: string;
    value: CachedScore;
    indexes: {
      'by-submission': string;
      'by-sync-status': string;
      'by-timestamp': number;
    };
  };
  'cached-submissions': {
    key: string;
    value: CachedSubmission;
    indexes: { 'by-category': string };
  };
  'app-state': {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'cba-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<CBADatabase> | null = null;

/**
 * Initialize and return the IndexedDB database.
 */
export async function getDB(): Promise<IDBPDatabase<CBADatabase>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<CBADatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Offline request queue
      if (!db.objectStoreNames.contains('offline-queue')) {
        const queueStore = db.createObjectStore('offline-queue', {
          keyPath: 'id',
        });
        queueStore.createIndex('by-timestamp', 'timestamp');
      }

      // Cached scores for offline judging
      if (!db.objectStoreNames.contains('cached-scores')) {
        const scoresStore = db.createObjectStore('cached-scores', {
          keyPath: 'id',
        });
        scoresStore.createIndex('by-submission', 'submissionId');
        scoresStore.createIndex('by-sync-status', 'syncStatus');
        scoresStore.createIndex('by-timestamp', 'timestamp');
      }

      // Cached submissions for offline reference
      if (!db.objectStoreNames.contains('cached-submissions')) {
        const submissionsStore = db.createObjectStore('cached-submissions', {
          keyPath: 'id',
        });
        submissionsStore.createIndex('by-category', 'categoryId');
      }

      // General app state storage
      if (!db.objectStoreNames.contains('app-state')) {
        db.createObjectStore('app-state');
      }
    },
  });

  return dbInstance;
}

/**
 * Add a request to the offline queue.
 */
export async function queueRequest(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const queuedRequest: QueuedRequest = {
    ...request,
    id,
    timestamp: Date.now(),
    retryCount: 0,
  };
  await db.put('offline-queue', queuedRequest);
  return id;
}

/**
 * Get all pending requests from the queue.
 */
export async function getPendingRequests(): Promise<QueuedRequest[]> {
  const db = await getDB();
  return db.getAllFromIndex('offline-queue', 'by-timestamp');
}

/**
 * Remove a request from the queue.
 */
export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('offline-queue', id);
}

/**
 * Update retry count for a queued request.
 */
export async function incrementRetryCount(id: string): Promise<void> {
  const db = await getDB();
  const request = await db.get('offline-queue', id);
  if (request) {
    request.retryCount++;
    await db.put('offline-queue', request);
  }
}

/**
 * Save a score to the local cache.
 */
export async function cacheScore(score: Omit<CachedScore, 'timestamp'>): Promise<void> {
  const db = await getDB();
  await db.put('cached-scores', {
    ...score,
    timestamp: Date.now(),
  });
}

/**
 * Get all pending (unsynced) scores.
 */
export async function getPendingScores(): Promise<CachedScore[]> {
  const db = await getDB();
  return db.getAllFromIndex('cached-scores', 'by-sync-status', 'pending');
}

/**
 * Update score sync status.
 */
export async function updateScoreSyncStatus(
  id: string,
  syncStatus: 'pending' | 'synced' | 'failed'
): Promise<void> {
  const db = await getDB();
  const score = await db.get('cached-scores', id);
  if (score) {
    score.syncStatus = syncStatus;
    await db.put('cached-scores', score);
  }
}

/**
 * Get scores for a submission.
 */
export async function getScoresForSubmission(submissionId: string): Promise<CachedScore[]> {
  const db = await getDB();
  return db.getAllFromIndex('cached-scores', 'by-submission', submissionId);
}

/**
 * Cache a submission for offline reference.
 */
export async function cacheSubmission(submission: Omit<CachedSubmission, 'cachedAt'>): Promise<void> {
  const db = await getDB();
  await db.put('cached-submissions', {
    ...submission,
    cachedAt: Date.now(),
  });
}

/**
 * Get cached submissions for a category.
 */
export async function getCachedSubmissions(categoryId: string): Promise<CachedSubmission[]> {
  const db = await getDB();
  return db.getAllFromIndex('cached-submissions', 'by-category', categoryId);
}

/**
 * Save app state to IndexedDB.
 */
export async function saveAppState<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('app-state', value, key);
}

/**
 * Get app state from IndexedDB.
 */
export async function getAppState<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get('app-state', key) as Promise<T | undefined>;
}

/**
 * Clear all cached data (for logout or reset).
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('offline-queue');
  await db.clear('cached-scores');
  await db.clear('cached-submissions');
  await db.clear('app-state');
}
