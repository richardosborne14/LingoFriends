/**
 * LingoFriends — PocketBase Test Client
 *
 * Admin-authenticated PocketBase API wrapper for the E2E test harness.
 * Uses raw fetch() calls (no PocketBase SDK) so behaviour is transparent.
 *
 * All requests are logged with method, URL, status, and timing so permission
 * failures surface immediately with their full response body.
 *
 * Auth strategy:
 *   - Admin auth via /api/collections/_superusers/auth-with-password (PB 0.23+)
 *   - Falls back to /api/admins/auth-with-password (older PB)
 *   - User auth via /api/collections/users/auth-with-password
 *
 * @module tests/e2e/lib/pb-client
 */

import { log, logStep, logError, sleep } from './test-utils.js';
import type { TestUser, ProfileData, TreeData, SkillPathData, LearnerProfileData } from './types.js';

// ============================================================================
// TYPES
// ============================================================================

interface PBRecord {
  id: string;
  [key: string]: unknown;
}

interface PBListResult {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: PBRecord[];
}

interface PBAuthResult {
  token: string;
  record?: PBRecord;
  admin?: PBRecord;
}

// ============================================================================
// CLIENT CLASS
// ============================================================================

/**
 * Admin-authenticated PocketBase client.
 * Provides full CRUD access to all collections, bypassing API rules.
 * Also supports user-level auth for testing permission rules.
 */
export class PBTestClient {
  private adminToken: string = '';
  private baseUrl: string;
  private verbose: boolean;

  constructor(baseUrl: string, verbose = false) {
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.verbose = verbose;
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────

  /**
   * Authenticate as PocketBase superadmin.
   * Tries PB 0.23+ endpoint first, falls back to legacy.
   * Stores the admin token for all subsequent requests.
   *
   * @throws Error if both auth endpoints fail
   */
  async adminAuth(email: string, password: string): Promise<void> {
    // PocketBase 0.23+ uses _superusers collection
    const endpoints = [
      `${this.baseUrl}/api/collections/_superusers/auth-with-password`,
      `${this.baseUrl}/api/admins/auth-with-password`, // Legacy
    ];

    let lastError: Error | null = null;

    for (const url of endpoints) {
      try {
        const { status, body } = await this.rawRequest('POST', url, { identity: email, password }, '');
        if (status === 200 && (body as PBAuthResult).token) {
          this.adminToken = (body as PBAuthResult).token;
          log(`✅ Admin auth OK (${url.includes('_superusers') ? 'PB 0.23+' : 'legacy'})`);
          return;
        }
        lastError = new Error(`Admin auth returned HTTP ${status}: ${JSON.stringify(body).substring(0, 200)}`);
      } catch (e) {
        lastError = e as Error;
      }
    }

    throw lastError ?? new Error('Admin auth failed on all endpoints');
  }

  /**
   * Create a test user (auth record) and return credentials.
   * Uses admin auth to bypass email verification.
   */
  async createTestUser(displayName: string, nativeLanguage: string = 'English'): Promise<TestUser> {
    const email = this.generateTestEmail();
    const password = `TestPass${Date.now()}!`;

    const { status, body } = await this.adminRequest('POST', '/api/collections/users/records', {
      email,
      password,
      passwordConfirm: password,
      emailVisibility: true,
      verified: true, // Skip email verification for tests
    });

    if (status < 200 || status >= 300) {
      throw new Error(`Failed to create test user: HTTP ${status} — ${JSON.stringify(body).substring(0, 300)}`);
    }

    const record = body as PBRecord;
    const authToken = await this.userAuth(email, password);

    log(`  👤 Created test user: ${email} (ID: ${record.id})`);

    return {
      id: record.id,
      email,
      password,
      authToken,
    };
  }

  /**
   * Authenticate as a specific user and return their auth token.
   */
  async userAuth(email: string, password: string): Promise<string> {
    const { status, body } = await this.rawRequest(
      'POST',
      `${this.baseUrl}/api/collections/users/auth-with-password`,
      { identity: email, password },
      ''
    );

    if (status !== 200) {
      throw new Error(`User auth failed: HTTP ${status} — ${JSON.stringify(body).substring(0, 200)}`);
    }

    return (body as PBAuthResult).token;
  }

  /**
   * Delete a test user (auth record) by ID.
   * Uses admin auth to bypass ownership rules.
   */
  async deleteTestUser(userId: string): Promise<void> {
    await this.adminRequest('DELETE', `/api/collections/users/records/${userId}`, null);
  }

  // ── PROFILE ───────────────────────────────────────────────────────────────

  /**
   * Create a profile for a user.
   * Uses admin token by default to bypass PocketBase required-boolean quirks
   * (PB treats boolean `false` as "blank" on required fields).
   * Pass useUserToken=true to test user-level create permissions explicitly.
   */
  async createProfile(userId: string, data: Partial<ProfileData>, userToken: string, useUserToken = false): Promise<PBRecord> {
    const payload: Record<string, unknown> = {
      user: userId,
      xp: 0,
      streak: 0,
      sunDrops: 0,
      gems: 0,
      daily_xp_today: 0,
      daily_cap: 50,
      goals: [],
      interests: [],
      selected_interests: [],
      traits: [],
      onboarding_complete: true,
      level: 'A1',
      display_name: 'TestUser',
      native_language: 'English',
      target_language: 'German',
      ...data,
    };

    // Use admin token to bypass schema validation quirks unless explicitly testing user perms
    const req = useUserToken
      ? this.userRequest('POST', '/api/collections/profiles/records', payload, userToken)
      : this.adminRequest('POST', '/api/collections/profiles/records', payload);

    const { status, body } = await req;

    if (status < 200 || status >= 300) {
      throw new Error(`Failed to create profile: HTTP ${status} — ${JSON.stringify(body).substring(0, 400)}`);
    }

    return body as PBRecord;
  }

  /**
   * Get the profile record for a user. Returns null if not found.
   */
  async getProfile(userId: string): Promise<PBRecord | null> {
    const { status, body } = await this.adminRequest(
      'GET',
      `/api/collections/profiles/records?filter=user%3D%22${userId}%22&perPage=1`
    );

    if (status !== 200) return null;
    const list = body as PBListResult;
    return list.items[0] ?? null;
  }

  /**
   * Update a profile record.
   */
  async updateProfile(profileId: string, data: Partial<ProfileData>): Promise<PBRecord> {
    const { status, body } = await this.adminRequest('PATCH', `/api/collections/profiles/records/${profileId}`, data);

    if (status < 200 || status >= 300) {
      throw new Error(`Failed to update profile: HTTP ${status} — ${JSON.stringify(body).substring(0, 300)}`);
    }

    return body as PBRecord;
  }

  // ── TREES ─────────────────────────────────────────────────────────────────

  /**
   * Create a user_tree record.
   */
  async createTree(userId: string, data: Partial<TreeData>): Promise<PBRecord> {
    const payload: Record<string, unknown> = {
      user: userId,
      status: 'seed',
      health: 100,
      sunDropsEarned: 0,
      sunDropsTotal: 0,
      lessonsCompleted: 0,
      lessonsTotal: 20,
      lastRefreshDate: new Date().toISOString(),
      bufferDays: 0,
      giftsReceived: [],
      gridPosition: { gx: 3, gz: 3 },
      position: 0,
      decorations: [],
      ...data,
    };

    const { status, body } = await this.adminRequest('POST', '/api/collections/user_trees/records', payload);

    if (status < 200 || status >= 300) {
      throw new Error(`Failed to create tree: HTTP ${status} — ${JSON.stringify(body).substring(0, 300)}`);
    }

    return body as PBRecord;
  }

  /**
   * Get all trees for a user.
   */
  async getUserTrees(userId: string): Promise<PBRecord[]> {
    const { status, body } = await this.adminRequest(
      'GET',
      `/api/collections/user_trees/records?filter=user%3D%22${userId}%22&perPage=50`
    );

    if (status !== 200) return [];
    return (body as PBListResult).items;
  }

  /**
   * Update a tree record.
   */
  async updateTree(treeId: string, data: Partial<TreeData>): Promise<PBRecord> {
    const { status, body } = await this.adminRequest('PATCH', `/api/collections/user_trees/records/${treeId}`, data);

    if (status < 200 || status >= 300) {
      throw new Error(`Failed to update tree: HTTP ${status} — ${JSON.stringify(body).substring(0, 300)}`);
    }

    return body as PBRecord;
  }

  // ── SKILL PATHS ───────────────────────────────────────────────────────────

  /**
   * Get available skill paths. Returns up to 50.
   */
  async getSkillPaths(): Promise<PBRecord[]> {
    const { status, body } = await this.adminRequest('GET', '/api/collections/skill_paths/records?perPage=50');
    if (status !== 200) return [];
    return (body as PBListResult).items;
  }

  /**
   * Create a skill path record.
   */
  async createSkillPath(data: Partial<SkillPathData>): Promise<PBRecord> {
    const payload: Record<string, unknown> = {
      name: `Test Path ${Date.now()}`,
      description: 'Test skill path',
      icon: '🧪',
      level: 'A1',
      totalLessons: 20,
      ...data,
    };

    const { status, body } = await this.adminRequest('POST', '/api/collections/skill_paths/records', payload);

    if (status < 200 || status >= 300) {
      throw new Error(`Failed to create skill path: HTTP ${status} — ${JSON.stringify(body).substring(0, 300)}`);
    }

    return body as PBRecord;
  }

  // ── LEARNER PROFILES ──────────────────────────────────────────────────────

  /**
   * Get the learner_profile for a user.
   */
  async getLearnerProfile(userId: string): Promise<PBRecord | null> {
    const { status, body } = await this.adminRequest(
      'GET',
      `/api/collections/learner_profiles/records?filter=user%3D%22${userId}%22&perPage=1`
    );

    if (status !== 200) return null;
    const list = body as PBListResult;
    return list.items[0] ?? null;
  }

  /**
   * Create a learner_profile record.
   */
  async createLearnerProfile(userId: string, data: Partial<LearnerProfileData>): Promise<PBRecord> {
    const payload: Record<string, unknown> = {
      user: userId,
      current_level: 1,
      total_chunks_encountered: 0,
      chunks_acquired: 0,
      ...data,
    };

    const { status, body } = await this.adminRequest('POST', '/api/collections/learner_profiles/records', payload);

    if (status < 200 || status >= 300) {
      throw new Error(`Failed to create learner profile: HTTP ${status} — ${JSON.stringify(body).substring(0, 300)}`);
    }

    return body as PBRecord;
  }

  /**
   * Update a learner_profile record.
   */
  async updateLearnerProfile(profileId: string, data: Record<string, unknown>): Promise<void> {
    await this.adminRequest('PATCH', `/api/collections/learner_profiles/records/${profileId}`, data);
  }

  // ── QUESTION REPORTS ──────────────────────────────────────────────────────

  /**
   * Create a question_report record.
   */
  async createQuestionReport(data: Record<string, unknown>, userToken: string): Promise<{ status: number; body: PBRecord }> {
    const { status, body } = await this.userRequest(
      'POST',
      '/api/collections/question_reports/records',
      data,
      userToken
    );
    return { status, body: body as PBRecord };
  }

  /**
   * Get question reports (admin-level read).
   */
  async getQuestionReports(filter?: string): Promise<PBRecord[]> {
    const filterParam = filter ? `&filter=${encodeURIComponent(filter)}` : '';
    const { status, body } = await this.adminRequest(
      'GET',
      `/api/collections/question_reports/records?perPage=50${filterParam}`
    );

    if (status !== 200) return [];
    return (body as PBListResult).items;
  }

  // ── GENERIC CRUD ──────────────────────────────────────────────────────────

  /**
   * Raw admin-level query on any collection.
   */
  async query(collection: string, filter?: string): Promise<PBRecord[]> {
    const filterParam = filter ? `?filter=${encodeURIComponent(filter)}&perPage=50` : '?perPage=50';
    const { status, body } = await this.adminRequest('GET', `/api/collections/${collection}/records${filterParam}`);

    if (status !== 200) return [];
    return (body as PBListResult).items;
  }

  /**
   * Raw admin-level record create.
   */
  async create(collection: string, data: Record<string, unknown>): Promise<PBRecord> {
    const { status, body } = await this.adminRequest('POST', `/api/collections/${collection}/records`, data);

    if (status < 200 || status >= 300) {
      throw new Error(`Create ${collection} failed: HTTP ${status} — ${JSON.stringify(body).substring(0, 300)}`);
    }

    return body as PBRecord;
  }

  /**
   * Raw admin-level record update (PATCH).
   */
  async update(collection: string, id: string, data: Record<string, unknown>): Promise<PBRecord> {
    const { status, body } = await this.adminRequest('PATCH', `/api/collections/${collection}/records/${id}`, data);

    if (status < 200 || status >= 300) {
      throw new Error(`Update ${collection}/${id} failed: HTTP ${status}`);
    }

    return body as PBRecord;
  }

  /**
   * Raw admin-level record delete.
   */
  async delete(collection: string, id: string): Promise<void> {
    await this.adminRequest('DELETE', `/api/collections/${collection}/records/${id}`, null);
  }

  /**
   * Get a single record by ID from any collection.
   */
  async getById(collection: string, id: string): Promise<PBRecord | null> {
    const { status, body } = await this.adminRequest('GET', `/api/collections/${collection}/records/${id}`);
    if (status !== 200) return null;
    return body as PBRecord;
  }

  /**
   * Test user-level permission — attempt a request with a user token and
   * return the raw status code.
   */
  async testPermission(method: string, path: string, data: unknown, userToken: string): Promise<number> {
    const { status } = await this.userRequest(method, path, data, userToken);
    return status;
  }

  // ── CLEANUP ───────────────────────────────────────────────────────────────

  /**
   * Delete all records matching a filter in a collection.
   * Used in finally blocks to clean up test data.
   */
  async cleanup(collection: string, filter: string): Promise<void> {
    try {
      const records = await this.query(collection, filter);
      for (const record of records) {
        await this.delete(collection, record.id).catch(e => {
          logError(`Cleanup: failed to delete ${collection}/${record.id}`, e);
        });
        await sleep(100); // Avoid hammering PB
      }
      if (records.length > 0) {
        logStep(`  🧹 Cleaned up ${records.length} record(s) from ${collection}`);
      }
    } catch (e) {
      logError(`Cleanup failed for ${collection} (filter: ${filter})`, e);
    }
  }

  // ── HTTP HELPERS ──────────────────────────────────────────────────────────

  /** Make a request with the admin token. */
  private async adminRequest(method: string, path: string, body?: unknown): Promise<{ status: number; body: unknown }> {
    const url = `${this.baseUrl}${path}`;
    return this.rawRequest(method, url, body, this.adminToken);
  }

  /** Make a request with a specific user token. */
  private async userRequest(method: string, path: string, body: unknown, token: string): Promise<{ status: number; body: unknown }> {
    const url = `${this.baseUrl}${path}`;
    return this.rawRequest(method, url, body, token);
  }

  /**
   * Raw HTTP request with logging.
   *
   * @param method - HTTP method
   * @param url - Full URL
   * @param body - Request body (null/undefined for no body)
   * @param token - Bearer token (empty string for no auth)
   */
  async rawRequest(
    method: string,
    url: string,
    body: unknown,
    token: string
  ): Promise<{ status: number; body: unknown }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = token;
    }

    const start = Date.now();

    const response = await fetch(url, {
      method,
      headers,
      body: body !== null && body !== undefined ? JSON.stringify(body) : undefined,
    });

    const duration = Date.now() - start;
    const contentType = response.headers.get('content-type') ?? '';
    let responseBody: unknown;

    try {
      responseBody = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
    } catch {
      responseBody = '<failed to parse response>';
    }

    if (this.verbose) {
      logStep(`  🌐 ${method} ${url.replace(this.baseUrl, '')} → ${response.status} [${duration}ms]`);
    }

    // Always log non-2xx responses from non-delete operations
    if (response.status >= 400) {
      logStep(`  🚨 ${method} ${url.replace(this.baseUrl, '')} → HTTP ${response.status}: ${JSON.stringify(responseBody).substring(0, 400)}`);
    }

    return { status: response.status, body: responseBody };
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private generateTestEmail(): string {
    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);
    return `test-${ts}-${rand}@lingofriends-test.local`;
  }

  get isAdminAuthed(): boolean {
    return this.adminToken.length > 0;
  }
}
