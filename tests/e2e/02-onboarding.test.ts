/**
 * Test 02: Onboarding Configuration
 * Verifies all onboarding fields persist correctly to PocketBase.
 */
import { assert, assertFields, buildTestResult, log, sleep } from './lib/test-utils.js';
import type { PBTestClient } from './lib/pb-client.js';
import type { AITestClient } from './lib/ai-client.js';
import type { TestSuiteResult, ProviderKey } from './lib/types.js';

export async function run(pb: PBTestClient, _ai: AITestClient, provider: ProviderKey): Promise<TestSuiteResult> {
  const start = Date.now();
  const createdUserIds: string[] = [];
  const assertions: string[] = [];

  log('📋 Test 02: Onboarding Configuration');
  const t = Date.now();
  const asserts = [];
  const errors: string[] = [];

  try {
    // Setup: create user + profile
    const user = await pb.createTestUser('OnboardingKid');
    createdUserIds.push(user.id);

    const profile = await pb.createProfile(user.id, {
      display_name: 'OnboardingKid',
      native_language: 'English',
      target_language: 'English',
    }, user.authToken);

    asserts.push(assert('Profile created for onboarding', !!profile['id']));

    // Step 1: Set subject
    const p1 = await pb.updateProfile(profile['id'] as string, {
      subject_type: 'language',
      target_subject: 'German',
      target_language: 'German',
    });
    asserts.push(assert('Subject updated', p1['target_subject'] === 'German', 'German', p1['target_subject']));

    // Step 2: Set interests
    const interests = [{ id: 'music', label: 'Music', emoji: '🎵' }, { id: 'sports', label: 'Sports', emoji: '⚽' }];
    const p2 = await pb.updateProfile(profile['id'] as string, { selected_interests: interests });
    asserts.push(assert('Interests stored', Array.isArray(p2['selected_interests']), 'array', typeof p2['selected_interests']));

    // Step 3: Set native language
    const p3 = await pb.updateProfile(profile['id'] as string, { native_language: 'French' });
    asserts.push(assert('Native language updated to French', p3['native_language'] === 'French', 'French', p3['native_language']));

    // Step 4: Mark onboarding complete
    const p4 = await pb.updateProfile(profile['id'] as string, { onboarding_complete: true });
    asserts.push(assert('onboarding_complete set to true', p4['onboarding_complete'] === true, true, p4['onboarding_complete']));

    // Step 5: Create tree
    const tree = await pb.createTree(user.id, {
      name: 'My German Tree',
      status: 'seed',
      health: 100,
      sunDropsEarned: 0,
      lessonsCompleted: 0,
    });
    asserts.push(assert('Tree created', !!tree['id']));
    asserts.push(...assertFields('Tree fields', tree, ['id', 'user', 'status', 'health', 'lastRefreshDate']));
    asserts.push(assert('Tree health is 100', tree['health'] === 100, 100, tree['health']));

    // Step 6: Create learner profile
    const lp = await pb.createLearnerProfile(user.id, {
      native_language: 'fr',
      target_language: 'de',
      current_level: 1,
    });
    asserts.push(assert('Learner profile created', !!lp['id']));
    asserts.push(assert('Learner profile native_language', lp['native_language'] === 'fr', 'fr', lp['native_language']));
    asserts.push(assert('Learner profile target_language', lp['target_language'] === 'de', 'de', lp['target_language']));

  } catch (e) {
    errors.push((e as Error).message);
  }

  // Cleanup
  for (const uid of createdUserIds) {
    await pb.cleanup('learner_profiles', `user="${uid}"`).catch(() => {});
    await pb.cleanup('user_trees', `user="${uid}"`).catch(() => {});
    await pb.cleanup('profiles', `user="${uid}"`).catch(() => {});
    await pb.deleteTestUser(uid).catch(() => {});
    await sleep(100);
  }

  const tests = [buildTestResult('02-onboarding', 'Onboarding Configuration', asserts, t, errors)];
  return {
    suiteName: 'Onboarding Configuration',
    provider,
    timestamp: new Date().toISOString(),
    totalTests: tests.length,
    passed: tests.filter(t => t.status === 'PASS').length,
    failed: tests.filter(t => t.status === 'FAIL').length,
    warnings: tests.filter(t => t.status === 'WARN').length,
    duration: Date.now() - start,
    tests,
  };
}
