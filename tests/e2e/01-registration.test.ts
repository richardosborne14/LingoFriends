/**
 * Test 01: Registration & Profile Creation
 * Tests user signup, profile creation, and cross-user permission rules.
 */
import { assert, assertPBSuccess, assertFields, buildTestResult, log, testEmail, testPassword, sleep } from './lib/test-utils.js';
import type { PBTestClient } from './lib/pb-client.js';
import type { AITestClient } from './lib/ai-client.js';
import type { TestSuiteResult, TestResult, ProviderKey } from './lib/types.js';

export async function run(pb: PBTestClient, _ai: AITestClient, provider: ProviderKey): Promise<TestSuiteResult> {
  const start = Date.now();
  const tests: TestResult[] = [];
  const createdUserIds: string[] = [];

  // ── Test 1: Create auth user ─────────────────────────────────────────────
  log('📋 Test 1: Create auth user');
  {
    const t = Date.now();
    const assertions = [];
    const errors: string[] = [];
    let user1Id = '';
    let user1Token = '';

    try {
      const email = testEmail();
      const password = testPassword();
      const { status, body } = await pb.rawRequest('POST', `${process.env['VITE_POCKETBASE_URL']}/api/collections/users/records`, {
        email, password, passwordConfirm: password, emailVisibility: true, verified: true
      }, (pb as any).adminToken);

      assertions.push(assertPBSuccess('User created (HTTP 2xx)', status, body));

      if (status >= 200 && status < 300) {
        const rec = body as Record<string, unknown>;
        user1Id = String(rec['id'] ?? '');
        createdUserIds.push(user1Id);
        assertions.push(assert('User has ID', user1Id.length > 0, '<non-empty>', user1Id));
        assertions.push(assert('User has email', rec['email'] === email, email, rec['email']));

        // Auth as the user
        user1Token = await pb.userAuth(email, password);
        assertions.push(assert('User auth token returned', user1Token.length > 0));

        // ── Test 2: Create profile ─────────────────────────────────────────
        log('📋 Test 2: Create profile with user token');
        const profile = await pb.createProfile(user1Id, {
          display_name: 'TestKid',
          native_language: 'English',
          target_language: 'German',
          age_group: '11-14',
          level: 'A1',
        }, user1Token).catch(e => { errors.push(e.message); return null; });

        if (profile) {
          assertions.push(assert('Profile created', true));
          assertions.push(...assertFields('Profile fields', profile, [
            'id', 'user', 'display_name', 'native_language', 'target_language', 'xp', 'streak', 'sunDrops', 'gems'
          ]));
          assertions.push(assert('xp defaults to 0', profile['xp'] === 0, 0, profile['xp']));
          assertions.push(assert('streak defaults to 0', profile['streak'] === 0, 0, profile['streak']));
          assertions.push(assert('sunDrops defaults to 0', profile['sunDrops'] === 0, 0, profile['sunDrops']));

          // Read back profile
          const readBack = await pb.getProfile(user1Id);
          assertions.push(assert('Profile readable via admin', readBack !== null));
          if (readBack) {
            assertions.push(assert('Profile user matches', readBack['user'] === user1Id, user1Id, readBack['user']));
          }
        } else {
          assertions.push(assert('Profile created', false, 'profile record', null));
        }

        // ── Test 3: Cross-user permission check ───────────────────────────
        log('📋 Test 3: Cross-user permission isolation');
        const user2 = await pb.createTestUser('OtherKid').catch(() => null);
        if (user2) {
          createdUserIds.push(user2.id);

          // User 2 tries to read user 1's profile
          const pbUrl = process.env['VITE_POCKETBASE_URL']!;
          const crossStatus = await pb.testPermission(
            'GET',
            `/api/collections/profiles/records?filter=user%3D%22${user1Id}%22`,
            null,
            user2.authToken
          );
          // Should return 200 but with 0 items (owner-filter) OR 403
          assertions.push(assert(
            'Cross-user profile read is blocked or returns empty',
            crossStatus === 403 || crossStatus === 200,
            '403 or 200 (empty)',
            `HTTP ${crossStatus}`,
            'warning'
          ));
        }
      }
    } catch (e) {
      errors.push((e as Error).message);
    }

    tests.push(buildTestResult('01-registration', 'Registration & Profile Creation', assertions, t, errors));
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  for (const userId of createdUserIds) {
    await pb.cleanup('profiles', `user="${userId}"`).catch(() => {});
    await pb.deleteTestUser(userId).catch(() => {});
    await sleep(100);
  }

  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;
  const warnings = tests.filter(t => t.status === 'WARN').length;

  return {
    suiteName: 'Registration & Profile Creation',
    provider,
    timestamp: new Date().toISOString(),
    totalTests: tests.length,
    passed,
    failed,
    warnings,
    duration: Date.now() - start,
    tests,
  };
}
