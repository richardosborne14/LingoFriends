/**
 * LingoFriends — E2E Test Utilities
 *
 * Shared helpers for assertion, logging, cleanup, and result writing.
 * Every test file uses these utilities to keep output consistent.
 *
 * @module tests/e2e/lib/test-utils
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AssertionResult, TestResult, TestSuiteResult } from './types.js';

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Create an assertion result with structured pass/fail logging.
 *
 * @param description - Human-readable description of what we're checking
 * @param condition - true = pass, false = fail
 * @param expected - What we expected (for failure messages)
 * @param actual - What we actually got (for failure messages)
 * @param severity - 'error' = blocking failure; 'warning' = non-blocking
 */
export function assert(
  description: string,
  condition: boolean,
  expected?: unknown,
  actual?: unknown,
  severity: 'error' | 'warning' = 'error'
): AssertionResult {
  const result: AssertionResult = {
    description,
    passed: condition,
    expected,
    actual,
    severity,
  };

  if (condition) {
    logStep(`  ✅ ${description}`);
  } else {
    const icon = severity === 'warning' ? '⚠️' : '❌';
    logStep(`  ${icon} FAIL: ${description}`);
    if (expected !== undefined) {
      logStep(`     Expected: ${JSON.stringify(expected)}`);
    }
    if (actual !== undefined) {
      logStep(`     Actual:   ${JSON.stringify(actual)}`);
    }
  }

  return result;
}

/**
 * Assert that a fetch response was successful (2xx status).
 */
export function assertPBSuccess(
  description: string,
  status: number,
  body?: unknown
): AssertionResult {
  const passed = status >= 200 && status < 300;
  const result = assert(
    description,
    passed,
    'HTTP 2xx',
    `HTTP ${status}`
  );
  if (!passed && body) {
    logStep(`     Response body: ${JSON.stringify(body).substring(0, 300)}`);
  }
  return result;
}

/**
 * Assert that a record has all required fields with non-empty values.
 *
 * @param description - Label for the assertion group
 * @param record - The record to check
 * @param requiredFields - Fields that must be present and non-empty
 */
export function assertFields(
  description: string,
  record: Record<string, unknown>,
  requiredFields: string[]
): AssertionResult[] {
  return requiredFields.map(field => {
    const value = record[field];
    const hasValue =
      value !== undefined &&
      value !== null &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0);
    return assert(`${description}: has field "${field}"`, hasValue, '<non-empty>', value);
  });
}

// ============================================================================
// LOGGING
// ============================================================================

let verbose = false;

/** Enable verbose output (show every step) */
export function setVerbose(v: boolean): void {
  verbose = v;
}

/** Log a test step. Shown in verbose mode, always written to audit trail. */
export function logStep(message: string, details?: unknown): void {
  const line = details ? `${message} ${JSON.stringify(details)}` : message;
  if (verbose || message.startsWith('  ❌') || message.startsWith('  ⚠️') || message.startsWith('🧪') || message.startsWith('📋') || message.startsWith('🚀') || message.startsWith('✅') || message.startsWith('❌')) {
    console.log(line);
  }
}

/** Always log (regardless of verbose mode) */
export function log(message: string): void {
  console.log(message);
}

/** Log an error loudly */
export function logError(message: string, error?: unknown): void {
  console.error(`❌ ${message}`, error ?? '');
}

// ============================================================================
// TEST RESULT BUILDERS
// ============================================================================

/**
 * Calculate overall test status from assertion results.
 * FAIL if any error-severity assertions failed.
 * WARN if any warning-severity assertions failed (but no errors).
 * PASS if all passed.
 */
export function calculateStatus(assertions: AssertionResult[]): 'PASS' | 'FAIL' | 'WARN' {
  const hasErrors = assertions.some(a => !a.passed && a.severity === 'error');
  const hasWarnings = assertions.some(a => !a.passed && a.severity === 'warning');
  if (hasErrors) return 'FAIL';
  if (hasWarnings) return 'WARN';
  return 'PASS';
}

/**
 * Build a TestResult from collected assertions.
 */
export function buildTestResult(
  testId: string,
  testName: string,
  assertions: AssertionResult[],
  startTime: number,
  errors: string[] = [],
  warnings: string[] = [],
  metadata?: Record<string, unknown>
): TestResult {
  const duration = Date.now() - startTime;
  const status = errors.length > 0 ? 'FAIL' : calculateStatus(assertions);

  return {
    testId,
    testName,
    status,
    duration,
    assertions,
    errors,
    warnings,
    metadata,
  };
}

// ============================================================================
// EMAIL / ID GENERATORS
// ============================================================================

/**
 * Generate a unique test email address.
 * Uses timestamp + random suffix to avoid collisions across parallel runs.
 */
export function testEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  return `test-${ts}-${rand}@lingofriends-test.local`;
}

/**
 * Generate a test password that meets PocketBase minimum requirements.
 * (At least 8 characters)
 */
export function testPassword(): string {
  return `TestPass${Date.now()}!`;
}

// ============================================================================
// SLEEP / TIMING
// ============================================================================

/** Sleep for the specified number of milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RESULT FILE WRITING
// ============================================================================

let resultsDir: string = '';

/**
 * Initialize the results directory for this test run.
 * Returns the directory path.
 */
export function initResultsDir(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  resultsDir = path.join(process.cwd(), 'tests', 'e2e', 'results', timestamp);
  fs.mkdirSync(path.join(resultsDir, 'lessons', 'deepinfra'), { recursive: true });
  fs.mkdirSync(path.join(resultsDir, 'lessons', 'groq'), { recursive: true });
  fs.mkdirSync(path.join(resultsDir, 'lessons', 'anthropic'), { recursive: true });
  log(`📁 Results directory: ${resultsDir}`);
  return resultsDir;
}

/** Get the current results directory */
export function getResultsDir(): string {
  return resultsDir;
}

/**
 * Write a JSON file to the results directory.
 *
 * @param filename - Relative path within results dir (e.g. 'summary.json')
 * @param data - Data to serialize
 */
export function writeResults(filename: string, data: unknown): void {
  if (!resultsDir) {
    console.warn('[test-utils] Results dir not initialized — call initResultsDir() first');
    return;
  }
  const filePath = path.join(resultsDir, filename);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  logStep(`📝 Written: ${path.relative(process.cwd(), filePath)}`);
}

/**
 * Write a raw lesson JSON to the lessons/{provider}/ subdirectory.
 */
export function writeLessonResult(provider: string, filename: string, data: unknown): void {
  writeResults(`lessons/${provider}/${filename}`, data);
}

/**
 * Write a text file to the results directory.
 */
export function writeTextFile(filename: string, content: string): void {
  if (!resultsDir) return;
  const filePath = path.join(resultsDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  log(`📝 Written: ${path.relative(process.cwd(), filePath)}`);
}

// ============================================================================
// SUITE SUMMARY PRINTER
// ============================================================================

/**
 * Print a formatted summary of a test suite result to stdout.
 */
export function printSuiteSummary(suite: TestSuiteResult): void {
  const icon = suite.failed > 0 ? '❌' : suite.warnings > 0 ? '⚠️' : '✅';
  log(`\n${icon} ${suite.suiteName}`);
  log(`   ${suite.passed}/${suite.totalTests} passed, ${suite.failed} failed, ${suite.warnings} warned`);
  log(`   Duration: ${suite.duration}ms`);

  for (const test of suite.tests) {
    const testIcon = test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌';
    const failCount = test.assertions.filter(a => !a.passed).length;
    const detail = failCount > 0 ? ` (${failCount} assertion(s) failed)` : '';
    log(`   ${testIcon} ${test.testName}${detail} [${test.duration}ms]`);

    // Print failures in verbose mode or always for errors
    if (test.status === 'FAIL') {
      for (const a of test.assertions.filter(a => !a.passed && a.severity === 'error')) {
        log(`      ↳ ${a.description}: expected=${JSON.stringify(a.expected)} actual=${JSON.stringify(a.actual)}`);
      }
      for (const e of test.errors) {
        log(`      ↳ ERROR: ${e}`);
      }
    }
  }
}

/**
 * Print overall summary across all suites.
 */
export function printOverallSummary(suites: TestSuiteResult[]): void {
  const total = suites.reduce((s, r) => s + r.totalTests, 0);
  const passed = suites.reduce((s, r) => s + r.passed, 0);
  const failed = suites.reduce((s, r) => s + r.failed, 0);
  const warned = suites.reduce((s, r) => s + r.warnings, 0);

  log('\n══════════════════════════════════════════════════');
  log('OVERALL TEST SUMMARY');
  log('══════════════════════════════════════════════════');
  log(`Total:   ${total} tests`);
  log(`Passed:  ${passed} ✅`);
  log(`Failed:  ${failed} ❌`);
  log(`Warned:  ${warned} ⚠️`);
  log(`Results: ${getResultsDir()}`);
  log('══════════════════════════════════════════════════\n');
}
