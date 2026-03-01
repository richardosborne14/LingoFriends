/**
 * Test 03: Lesson Generation & Validation
 * The most critical test — validates AI chunks → assembler → validator pipeline.
 */
import { assert, buildTestResult, log, writeLessonResult, sleep } from './lib/test-utils.js';
import { scoreLessonQuality } from './lib/evaluator.js';
import type { PBTestClient } from './lib/pb-client.js';
import type { AITestClient } from './lib/ai-client.js';
import type { TestSuiteResult, TestResult, ProviderKey, LessonCombination } from './lib/types.js';

// Import pure assembler/validator (no browser deps)
import { assembleLessonPlan } from '../../src/services/lessonAssembler.js';
import { validateLessonPlan } from '../../src/services/lessonValidator.js';

const SCENARIOS: LessonCombination[] = [
  { targetLanguage: 'German',  nativeLanguage: 'English', topic: 'Greetings',         ageGroup: '11-14', level: 'A1' },
  { targetLanguage: 'French',  nativeLanguage: 'English', topic: 'Food & Drinks',     ageGroup: '11-14', level: 'A1' },
  { targetLanguage: 'German',  nativeLanguage: 'French',  topic: 'School Phrases',    ageGroup: '15-18', level: 'A2' },
  { targetLanguage: 'German',  nativeLanguage: 'English', topic: 'Food & Drinks',     ageGroup: '7-10',  level: 'A1' },
  { targetLanguage: 'German',  nativeLanguage: 'English', topic: 'Family & Friends',  ageGroup: '11-14', level: 'A1' },
];

export async function run(pb: PBTestClient, ai: AITestClient, provider: ProviderKey): Promise<TestSuiteResult> {
  const start = Date.now();
  const tests: TestResult[] = [];

  for (const scenario of SCENARIOS) {
    const label = `${scenario.targetLanguage}/${scenario.nativeLanguage} — "${scenario.topic}"`;
    log(`📋 Generating lesson: ${label}`);
    const t = Date.now();
    const asserts = [];
    const errors: string[] = [];

    try {
      // Generate chunks via AI
      const result = await ai.generateChunks(provider, {
        targetLanguage: scenario.targetLanguage,
        nativeLanguage: scenario.nativeLanguage,
        topic: scenario.topic,
        level: scenario.level,
        interests: ['music', 'sports'],
        chunkCount: 3,
        ageGroup: scenario.ageGroup,
      });

      asserts.push(assert('AI returned valid JSON', result.parseSuccess, true, result.parseSuccess));
      asserts.push(assert('AI returned chunks', result.chunks.length > 0, '>0', result.chunks.length));

      if (result.chunks.length > 0) {
        // Validate each chunk
        for (const chunk of result.chunks) {
          asserts.push(assert(`Chunk has targetPhrase`, !!chunk.targetPhrase));
          asserts.push(assert(`Chunk has nativeTranslation`, !!chunk.nativeTranslation));
          asserts.push(assert(`Chunk has 3 distractors`, chunk.distractors.length === 3, 3, chunk.distractors.length));
          asserts.push(assert(`Chunk has correctUsageContext`, !!chunk.correctUsageContext));
          asserts.push(assert(`Chunk has wrongUsageContexts (3)`, chunk.wrongUsageContexts.length === 3, 3, chunk.wrongUsageContexts.length));
          // Critical: distractors must NOT be the correct answer
          for (const d of chunk.distractors) {
            asserts.push(assert(
              `Distractor "${d.substring(0,20)}" ≠ correct answer`,
              d.toLowerCase().trim() !== chunk.nativeTranslation.toLowerCase().trim(),
              '!= correct',
              d,
              'warning'
            ));
          }
        }

        // Assemble lesson
        let plan: ReturnType<typeof assembleLessonPlan> | null = null;
        let assemblySuccess = false;
        try {
          plan = assembleLessonPlan(
            { title: `Test: ${scenario.topic}`, targetLanguageCode: scenario.targetLanguage.toLowerCase().slice(0, 2), nativeLanguageCode: scenario.nativeLanguage.toLowerCase().slice(0, 2), chunks: result.chunks },
            `test-${Date.now()}`
          );
          assemblySuccess = true;
        } catch (e) {
          errors.push(`Assembly failed: ${(e as Error).message}`);
        }

        asserts.push(assert('Lesson assembly succeeded', assemblySuccess));

        // Validate lesson
        let validationResult = { valid: false, errors: ['not run'], warnings: [] as string[] };
        if (plan) {
          validationResult = validateLessonPlan(plan);
          asserts.push(assert('Lesson validation passed', validationResult.valid, true, validationResult.valid));
          if (!validationResult.valid) {
            errors.push(...validationResult.errors.slice(0, 3));
          }

          // Teach-before-test check
          const firstStep = plan.steps[0];
          asserts.push(assert('First step is INFO (teach-first)', firstStep?.activity?.type === 'info', 'info', firstStep?.activity?.type));

          // SunDrops consistency
          const sumDrops = plan.steps.reduce((s, step) => s + (step.activity?.sunDrops ?? 0), 0);
          asserts.push(assert('SunDrops sum matches total', sumDrops === plan.totalSunDrops, plan.totalSunDrops, sumDrops, 'warning'));

          // Score quality
          const score = scoreLessonQuality({
            provider, combination: scenario, chunks: result.chunks,
            assembledPlan: plan as unknown as Record<string, unknown>,
            validationResult, responseTimeMs: result.responseTimeMs,
            parseSuccess: result.parseSuccess, assemblySuccess,
          });

          writeLessonResult(provider, `03-${scenario.targetLanguage}-${scenario.topic.replace(/\s+/g, '-')}.json`, {
            scenario, score, rawChunks: result.chunks, rawLesson: plan,
          });

          asserts.push(assert(`Quality score ≥ 50/100`, score.totalScore >= 50, '≥50', score.totalScore, 'warning'));
        }
      }
    } catch (e) {
      errors.push((e as Error).message);
    }

    tests.push(buildTestResult(`03-${scenario.targetLanguage}`, label, asserts, t, errors));
    await sleep(500);
  }

  return {
    suiteName: 'Lesson Generation & Validation',
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
