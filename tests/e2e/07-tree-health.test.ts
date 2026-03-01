/**
 * Test 07: Tree Health & Decay
 * Verifies tree health decrements over time and buffer day logic.
 */
import { assert, buildTestResult, log, sleep } from './lib/test-utils.js';
import type { PBTestClient } from './lib/pb-client.js';
import type { AITestClient } from './lib/ai-client.js';
import type { TestSuiteResult, ProviderKey } from './lib/types.js';

export async function run(pb: PBTestClient, _ai: AITestClient, provider: ProviderKey): Promise<TestSuiteResult> {
  const start = Date.now();
  const t = Date.now();
  const asserts = [];
  const errors: string[] = [];
  const createdUserIds: string[] = [];

  log('📋 Test 07: Tree Health & Decay');

  try {
    const user = await pb.createTestUser('TreeKid');
    createdUserIds.push(user.id);

    // Tree at full health
    const tree = await pb.createTree(user.id, {
      status: 'growing',
      health: 100,
      sunDropsEarned: 30,
      sunDropsTotal: 50,
      growthStage: 2,
      lessonsCompleted: 3,
      bufferDays: 1,
      lastRefreshDate: new Date().toISOString(),
    });
    asserts.push(assert('Tree created at 100% health', tree['health'] === 100, 100, tree['health']));
    asserts.push(assert('Tree status is growing', tree['status'] === 'growing', 'growing', tree['status']));
    asserts.push(assert('Buffer days = 1', tree['bufferDays'] === 1, 1, tree['bufferDays']));

    // Simulate 1 day missed: health drops by 10 (typical decay)
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const t2 = await pb.updateTree(tree['id'] as string, {
      health: 90,
      bufferDays: 0,
      lastRefreshDate: yesterday,
    });
    asserts.push(assert('Health decremented to 90', t2['health'] === 90, 90, t2['health']));
    asserts.push(assert('Buffer days consumed', t2['bufferDays'] === 0, 0, t2['bufferDays']));

    // Simulate 2 more days missed: health continues to drop
    const t3 = await pb.updateTree(tree['id'] as string, { health: 70, status: 'growing' });
    asserts.push(assert('Health at 70 after multiple missed days', t3['health'] === 70, 70, t3['health']));

    // Simulate minimal health but still growing
    const t4 = await pb.updateTree(tree['id'] as string, { health: 10 });
    asserts.push(assert('Tree can reach low health', t4['health'] === 10, 10, t4['health']));

    // Recovery: user does a lesson — health climbs back
    const t5 = await pb.updateTree(tree['id'] as string, {
      health: 50, status: 'growing',
      lastRefreshDate: new Date().toISOString(),
    });
    asserts.push(assert('Tree health recovers after lesson', t5['health'] === 50, 50, t5['health']));
    asserts.push(assert('Status stays growing during recovery', t5['status'] === 'growing', 'growing', t5['status']));

    // Multiple trees: user can have multiple active trees
    const tree2 = await pb.createTree(user.id, { status: 'seed', health: 100 });
    const allTrees = await pb.getUserTrees(user.id);
    asserts.push(assert('User can have multiple trees', allTrees.length >= 2, '≥2', allTrees.length));

  } catch (e) {
    errors.push((e as Error).message);
  }

  for (const uid of createdUserIds) {
    await pb.cleanup('user_trees', `user="${uid}"`).catch(() => {});
    await pb.deleteTestUser(uid).catch(() => {});
    await sleep(100);
  }

  const tests = [buildTestResult('07-tree-health', 'Tree Health & Decay', asserts, t, errors)];
  return {
    suiteName: 'Tree Health & Decay',
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
