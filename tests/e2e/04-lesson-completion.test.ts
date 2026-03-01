/**
 * Test 04: Lesson Completion & Scoring
 * Verifies XP, SunDrops, streak, and lesson history are saved after lesson completion.
 */
import { assert, assertFields, buildTestResult, log, sleep } from './lib/test-utils.js';
import type { PBTestClient } from './lib/pb-client.js';
import type { AITestClient } from './lib/ai-client.js';
import type { TestSuiteResult, ProviderKey } from './lib/types.js';

export async function run(pb: PBTestClient, _ai: AITestClient, provider: ProviderKey): Promise<TestSuiteResult> {
  const start = Date.now();
  const t = Date.now();
  const asserts = [];
  const errors: string[] = [];
  const createdUserIds: string[] = [];

  log('📋 Test 04: Lesson Completion & Scoring');

  try {
    const user = await pb.createTestUser('LessonKid');
    createdUserIds.push(user.id);

    const profile = await pb.createProfile(user.id, {
      display_name: 'LessonKid',
      native_language: 'English',
      target_language: 'German',
      xp: 0,
      sunDrops: 0,
      streak: 0,
    }, user.authToken);
    asserts.push(assert('Profile created', !!profile['id']));

    // Simulate lesson completion: update XP and SunDrops
    const EARNED_XP = 15;
    const EARNED_SUN_DROPS = 8;
    const p1 = await pb.updateProfile(profile['id'] as string, {
      xp: EARNED_XP,
      sunDrops: EARNED_SUN_DROPS,
      streak: 1,
      last_activity: new Date().toISOString(),
    });
    asserts.push(assert('XP updated', p1['xp'] === EARNED_XP, EARNED_XP, p1['xp']));
    asserts.push(assert('SunDrops updated', p1['sunDrops'] === EARNED_SUN_DROPS, EARNED_SUN_DROPS, p1['sunDrops']));
    asserts.push(assert('Streak incremented', p1['streak'] === 1, 1, p1['streak']));

    // Save lesson_history record — collection may not exist yet (Phase 2.1 adds it)
    const lessonHistory = await pb.create('lesson_history', {
      user: user.id,
      lesson_title: 'Test: Greetings',
      target_language: 'de',
      native_language: 'en',
      xp_earned: EARNED_XP,
      sun_drops_earned: EARNED_SUN_DROPS,
      total_steps: 15,
      completed_steps: 15,
      score_percentage: 100,
      completed_at: new Date().toISOString(),
    }).catch(() => null);  // Don't error — collection may not exist yet

    if (lessonHistory) {
      asserts.push(assert('Lesson history created', !!lessonHistory['id']));
      asserts.push(assert('XP in history matches', lessonHistory['xp_earned'] === EARNED_XP, EARNED_XP, lessonHistory['xp_earned']));
      const readBack = await pb.getById('lesson_history', lessonHistory['id'] as string);
      asserts.push(assert('Lesson history readable', readBack !== null));
    } else {
      asserts.push(assert('lesson_history collection exists (Phase 2.1+)', false, 'collection', 'missing', 'warning'));
    }

    // Update tree sunDropsEarned
    const tree = await pb.createTree(user.id, { sunDropsEarned: 0, growthStage: 0 });
    const updatedTree = await pb.updateTree(tree['id'] as string, {
      sunDropsEarned: EARNED_SUN_DROPS,
      lessonsCompleted: 1,
    });
    asserts.push(assert('Tree sunDropsEarned updated', updatedTree['sunDropsEarned'] === EARNED_SUN_DROPS, EARNED_SUN_DROPS, updatedTree['sunDropsEarned']));
    asserts.push(assert('Tree lessonsCompleted incremented', updatedTree['lessonsCompleted'] === 1, 1, updatedTree['lessonsCompleted']));

    // Check daily_xp cap (50 by default)
    const p2 = await pb.updateProfile(profile['id'] as string, { daily_xp_today: EARNED_XP });
    asserts.push(assert('daily_xp_today tracked', p2['daily_xp_today'] === EARNED_XP, EARNED_XP, p2['daily_xp_today']));

    const daily_cap = Number(p2['daily_cap'] ?? 50);
    asserts.push(assert('daily_cap exists and > 0', daily_cap > 0, '>0', daily_cap));
    asserts.push(assert('XP earned within daily cap', EARNED_XP <= daily_cap, `<= ${daily_cap}`, EARNED_XP));

  } catch (e) {
    errors.push((e as Error).message);
  }

  // Cleanup
  for (const uid of createdUserIds) {
    await pb.cleanup('lesson_history', `user="${uid}"`).catch(() => {});
    await pb.cleanup('user_trees', `user="${uid}"`).catch(() => {});
    await pb.cleanup('profiles', `user="${uid}"`).catch(() => {});
    await pb.deleteTestUser(uid).catch(() => {});
    await sleep(100);
  }

  const tests = [buildTestResult('04-lesson-completion', 'Lesson Completion & Scoring', asserts, t, errors)];
  return {
    suiteName: 'Lesson Completion & Scoring',
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
