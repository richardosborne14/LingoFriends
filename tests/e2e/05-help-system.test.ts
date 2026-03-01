/**
 * Test 05: Help System & Question Reporting
 * Tests the AI help response and question_reports collection.
 */
import { assert, buildTestResult, log, sleep } from './lib/test-utils.js';
import type { PBTestClient } from './lib/pb-client.js';
import type { AITestClient } from './lib/ai-client.js';
import type { TestSuiteResult, ProviderKey } from './lib/types.js';

export async function run(pb: PBTestClient, ai: AITestClient, provider: ProviderKey): Promise<TestSuiteResult> {
  const start = Date.now();
  const t = Date.now();
  const asserts = [];
  const errors: string[] = [];
  const createdUserIds: string[] = [];

  log('📋 Test 05: Help System & Question Reporting');

  try {
    const user = await pb.createTestUser('HelpKid');
    createdUserIds.push(user.id);

    // Test AI help response
    if (ai.isAvailable(provider)) {
      const helpResult = await ai.requestHelp(provider, {
        activityType: 'multiple_choice',
        activityData: { question: 'What does "Guten Morgen" mean?', options: ['Good morning', 'Good night', 'Good afternoon', 'Goodbye'] },
        targetLanguage: 'German',
        nativeLanguage: 'English',
        userQuestion: "I don't understand the answer",
      });
      asserts.push(assert('Help response returned text', helpResult.text.length > 10, '>10 chars', helpResult.text.length));
      asserts.push(assert('Help does not reveal answer directly', !helpResult.text.toLowerCase().includes('good morning'), 'no direct answer', 'ok', 'warning'));
      asserts.push(assert('Help response time < 10s', helpResult.responseTimeMs < 10000, '<10000ms', helpResult.responseTimeMs));
    } else {
      asserts.push(assert('AI help skipped (no API key)', true, true, true, 'warning'));
    }

    // Test question_reports collection
    const reportPayload = {
      user: user.id,
      lesson_id: 'test-lesson-001',
      step_index: 3,
      activity_type: 'multiple_choice',
      issue_type: 'wrong_answer',
      description: 'The correct answer seems wrong',
      activity_data: JSON.stringify({ question: 'Test question', options: ['A', 'B', 'C', 'D'] }),
    };

    const { status, body } = await pb.createQuestionReport(reportPayload, user.authToken);
    if (status >= 200 && status < 300) {
      asserts.push(assert('Question report created', true));
      const rec = body as Record<string, unknown>;
      asserts.push(assert('Report has ID', !!rec['id']));
      asserts.push(assert('Report user matches', rec['user'] === user.id, user.id, rec['user'], 'warning'));

      // Verify admin can read it
      const reports = await pb.getQuestionReports(`user="${user.id}"`);
      asserts.push(assert('Report readable by admin', reports.length > 0, '>0', reports.length, 'warning'));
    } else {
      // collection may not exist
      asserts.push(assert('Question report collection accessible', false, '200-299', `HTTP ${status}`, 'warning'));
    }

  } catch (e) {
    errors.push((e as Error).message);
  }

  // Cleanup
  for (const uid of createdUserIds) {
    await pb.cleanup('question_reports', `user="${uid}"`).catch(() => {});
    await pb.deleteTestUser(uid).catch(() => {});
    await sleep(100);
  }

  const tests = [buildTestResult('05-help-system', 'Help System & Question Reporting', asserts, t, errors)];
  return {
    suiteName: 'Help System & Question Reporting',
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
