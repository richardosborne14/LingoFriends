/**
 * LingoFriends — E2E Test Runner
 *
 * Orchestrates all test suites in order.
 * Usage:
 *   npx tsx tests/e2e/test-runner.ts
 *   npx tsx tests/e2e/test-runner.ts --only 03-lesson-generation
 *   npx tsx tests/e2e/test-runner.ts --provider groq
 *   npx tsx tests/e2e/test-runner.ts --verbose
 *   npx tsx tests/e2e/test-runner.ts --help
 *
 * @module tests/e2e/test-runner
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root BEFORE any other imports that read env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import {
  initResultsDir,
  writeResults,
  printSuiteSummary,
  printOverallSummary,
  log,
  setVerbose,
} from './lib/test-utils.js';
import { PBTestClient } from './lib/pb-client.js';
import { AITestClient } from './lib/ai-client.js';
import type { TestSuiteResult, ProviderKey } from './lib/types.js';

// ── CLI argument parsing ──────────────────────────────────────────────────────

interface CLIArgs {
  only?: string;
  provider: ProviderKey;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = { provider: 'groq', verbose: false, help: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') result.help = true;
    if (args[i] === '--verbose' || args[i] === '-v') result.verbose = true;
    if (args[i] === '--only' && args[i + 1]) result.only = args[++i];
    if (args[i] === '--provider' && args[i + 1]) result.provider = args[++i] as ProviderKey;
  }

  return result;
}

function printHelp(): void {
  log(`
LingoFriends E2E Test Runner
════════════════════════════

Usage:
  npx tsx tests/e2e/test-runner.ts [options]

Options:
  --only <suite>       Run only the named suite (e.g. 03-lesson-generation)
  --provider <key>     AI provider: deepinfra | groq | anthropic  (default: groq)
  --verbose            Show all HTTP requests and test steps
  --help               Show this help message

Available suites:
  01-registration
  02-onboarding
  03-lesson-generation
  04-lesson-completion
  05-help-system
  06-rewards
  07-tree-health
  08-cross-llm-comparison

Examples:
  npx tsx tests/e2e/test-runner.ts
  npx tsx tests/e2e/test-runner.ts --only 03-lesson-generation --provider deepinfra
  npx tsx tests/e2e/test-runner.ts --only 08-cross-llm-comparison --verbose
`);
}

// ── Suite loader ──────────────────────────────────────────────────────────────

type SuiteRunner = (pb: PBTestClient, ai: AITestClient, provider: ProviderKey) => Promise<TestSuiteResult>;

interface Suite {
  id: string;
  name: string;
  file: string;
}

const ALL_SUITES: Suite[] = [
  { id: '01-registration',        name: 'Registration & Profile Creation',  file: './01-registration.test.js' },
  { id: '02-onboarding',          name: 'Onboarding Configuration',          file: './02-onboarding.test.js' },
  { id: '03-lesson-generation',   name: 'Lesson Generation & Validation',    file: './03-lesson-generation.test.js' },
  { id: '04-lesson-completion',   name: 'Lesson Completion & Scoring',       file: './04-lesson-completion.test.js' },
  { id: '05-help-system',         name: 'Help System & Question Reporting',  file: './05-help-system.test.js' },
  { id: '06-rewards',             name: 'Reward System Verification',        file: './06-rewards.test.js' },
  { id: '07-tree-health',         name: 'Tree Health & Decay',               file: './07-tree-health.test.js' },
  { id: '08-cross-llm-comparison',name: 'Cross-LLM Quality Comparison',      file: './08-cross-llm-comparison.js' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  setVerbose(args.verbose);

  // Validate environment
  const pbUrl = process.env['VITE_POCKETBASE_URL'];
  const pbEmail = process.env['PB_ADMIN_EMAIL'];
  const pbPass = process.env['PB_ADMIN_PASSWORD'];

  if (!pbUrl || !pbEmail || !pbPass) {
    log('❌ Missing required environment variables:');
    if (!pbUrl) log('   VITE_POCKETBASE_URL');
    if (!pbEmail) log('   PB_ADMIN_EMAIL');
    if (!pbPass) log('   PB_ADMIN_PASSWORD');
    log('\nCheck your .env file.');
    process.exit(1);
  }

  // Determine which suites to run
  const suitesToRun = args.only
    ? ALL_SUITES.filter(s => s.id === args.only || s.id.includes(args.only!))
    : ALL_SUITES;

  if (suitesToRun.length === 0) {
    log(`❌ No suites matched "--only ${args.only}"`);
    log('   Available: ' + ALL_SUITES.map(s => s.id).join(', '));
    process.exit(1);
  }

  // Initialize
  initResultsDir();

  log(`\n🚀 LingoFriends E2E Test Runner`);
  log(`   Provider: ${args.provider}`);
  log(`   Suites:   ${suitesToRun.map(s => s.id).join(', ')}\n`);

  // Create clients
  const pb = new PBTestClient(pbUrl, args.verbose);
  const ai = new AITestClient();

  // Admin auth
  log('🔑 Authenticating as admin...');
  try {
    await pb.adminAuth(pbEmail, pbPass);
  } catch (e) {
    log(`❌ Admin auth failed: ${(e as Error).message}`);
    process.exit(1);
  }

  // Check AI providers
  const availableProviders = ai.getAvailableProviders();
  log(`🤖 Available AI providers: ${availableProviders.join(', ') || 'NONE'}`);

  if (!ai.isAvailable(args.provider)) {
    log(`⚠️  Provider "${args.provider}" has no API key — will attempt anyway`);
  }

  // Run suites
  const allResults: TestSuiteResult[] = [];

  for (const suite of suitesToRun) {
    log(`\n${'═'.repeat(60)}`);
    log(`🧪 ${suite.name}`);
    log(`${'═'.repeat(60)}`);

    try {
      const module = await import(suite.file) as { run: SuiteRunner };
      if (typeof module.run !== 'function') {
        throw new Error(`Suite "${suite.id}" does not export a run() function`);
      }

      const result = await module.run(pb, ai, args.provider);
      allResults.push(result);
      printSuiteSummary(result);

      // Save individual suite result
      writeResults(`${suite.id}.json`, result);
    } catch (e) {
      log(`❌ Suite "${suite.id}" crashed: ${(e as Error).message}`);
      if (args.verbose) console.error(e);

      // Record as failed suite
      const failedSuite: TestSuiteResult = {
        suiteName: suite.name,
        provider: args.provider,
        timestamp: new Date().toISOString(),
        totalTests: 1,
        passed: 0,
        failed: 1,
        warnings: 0,
        duration: 0,
        tests: [{
          testId: suite.id,
          testName: suite.name,
          status: 'FAIL',
          duration: 0,
          assertions: [],
          errors: [(e as Error).message],
          warnings: [],
        }],
      };
      allResults.push(failedSuite);
    }
  }

  // Write combined summary
  const summary = {
    timestamp: new Date().toISOString(),
    provider: args.provider,
    suitesRun: allResults.length,
    suites: allResults,
  };
  writeResults('summary.json', summary);

  // Print overall summary
  printOverallSummary(allResults);

  // Exit with appropriate code
  const anyFailed = allResults.some(r => r.failed > 0);
  process.exit(anyFailed ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
