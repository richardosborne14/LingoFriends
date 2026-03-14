/**
 * LingoFriends — Lesson Quality Evaluator
 *
 * Scores generated lessons on 10 pedagogical quality dimensions (0-10 each).
 * Uses heuristic language detection — good enough to catch obvious failures.
 *
 * @module tests/e2e/lib/evaluator
 */

import type { GeneratedChunk, LessonQualityScore, LessonCombination, ProviderKey } from './types.js';

// ── Language detection markers ────────────────────────────────────────────────
// German word list is large because German shares short words with Spanish/English.
// Umlauts (ü/ö/ä/ß) score much higher to be near-conclusive — false positives
// were the #1 evaluator bug, caused by Spanish markers matching German prepositions.
const LANG_MARKERS: Record<string, { chars: string[]; words: string[] }> = {
  de: {
    chars: ['ü','ö','ä','ß'],
    words: [
      'der','die','das','ist','und','ich','ein','eine','nicht','mit',
      'zu','auf','für','von','hallo','bitte','danke','wie','geht','sie',
      'mein','dein','wir','ihr','haben','sein','werden','kann','guten',
      'morgen','abend','nacht','tag','bitte','schön','sprechen','lernen',
      'heißen','kommen','gehen','machen','sagen','sehen','wissen','mögen',
    ],
  },
  fr: {
    chars: ['ç','é','è','ê','ë','î','ï','ô','û','ù','à','â'],
    words: ['le','la','les','est','et','des','un','une','je','tu','nous','vous','bonjour','merci','oui','non','avec','dans','sur','pour','mais','ou'],
  },
  en: {
    chars: [],
    words: ['the','is','and','of','to','a','in','that','it','you','he','she','they','we','hello','please','thank','good','morning','evening'],
  },
  es: {
    chars: ['ñ','¿','¡'],
    words: ['el','los','es','y','que','en','un','una','con','por','hola','gracias','buenos','días','cómo','estás'],
  },
};

/** Detect language code from a text string using heuristics */
function detectLanguage(text: string): string {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = { de: 0, fr: 0, en: 0, es: 0 };

  for (const [code, markers] of Object.entries(LANG_MARKERS)) {
    for (const ch of markers.chars) {
      // Special chars (umlauts, ç, ñ) are near-conclusive — weight them heavily
      if (lower.includes(ch)) scores[code] += 8;
    }
    for (const word of markers.words) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const m = lower.match(regex);
      if (m) scores[code] += m.length;
    }
  }

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

/** Convert language name to code */
function nameToCode(name: string): string {
  const map: Record<string, string> = { german: 'de', french: 'fr', english: 'en', spanish: 'es' };
  return map[name.toLowerCase()] ?? name.toLowerCase().slice(0, 2);
}

// ── Scoring functions ─────────────────────────────────────────────────────────

/** 1. Language correctness: are target phrases in the right language? */
function scoreLanguageCorrectness(chunks: GeneratedChunk[], targetLang: string, nativeLang: string): { score: number; notes: string[] } {
  const notes: string[] = [];
  const tCode = nameToCode(targetLang);
  const nCode = nameToCode(nativeLang);
  let correct = 0;
  let total = 0;

  for (const chunk of chunks) {
    total++;
    const phraseDetected = detectLanguage(chunk.targetPhrase);
    if (phraseDetected === tCode || tCode === 'en') {
      correct++;
    } else {
      notes.push(`targetPhrase "${chunk.targetPhrase}" detected as ${phraseDetected}, expected ${tCode}`);
    }

    // Check distractors are in native language.
    // Special case: when native is English, don't use detectLanguage() on short phrases
    // because short English phrases are easily misclassified as German/Spanish.
    // Instead, only fail if the distractor contains unambiguous target-language chars (umlauts etc.)
    for (const d of chunk.distractors) {
      if (nCode === 'en') {
        // Only flag if distractor has obvious target-language special characters
        const targetChars = LANG_MARKERS[tCode]?.chars ?? [];
        const hasTargetChars = targetChars.some(ch => d.toLowerCase().includes(ch));
        if (hasTargetChars && tCode !== nCode) {
          notes.push(`Distractor "${d}" contains target-language characters (${tCode})`);
        }
      } else {
        const dLang = detectLanguage(d);
        if (dLang === tCode && tCode !== nCode) {
          notes.push(`Distractor "${d}" appears to be in target language (${tCode}), not native`);
        }
      }
    }
  }

  const score = total === 0 ? 5 : Math.round((correct / total) * 10);
  return { score, notes };
}

/** 2. Teach-first: INFO step before quiz per chunk (evaluated on assembled plan) */
function scoreTeachFirst(plan: Record<string, unknown>): { score: number; notes: string[] } {
  const steps = (plan['steps'] as unknown[]) ?? [];
  const notes: string[] = [];
  let violations = 0;
  let seenInfo = false;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] as Record<string, unknown>;
    const activity = step['activity'] as Record<string, unknown> | undefined;
    if (!activity) continue;

    if (activity['type'] === 'info' || activity['type'] === 'INFO') {
      seenInfo = true;
    } else if (!seenInfo) {
      violations++;
      notes.push(`Step ${i + 1} (${activity['type']}) appears before first INFO step`);
    }
  }

  const score = violations === 0 ? 10 : Math.max(0, 10 - violations * 3);
  return { score, notes };
}

/** 3. Activity variety: how many distinct non-info types? */
function scoreActivityVariety(plan: Record<string, unknown>): { score: number; notes: string[] } {
  const steps = (plan['steps'] as unknown[]) ?? [];
  const notes: string[] = [];
  const quizTypes: string[] = [];

  for (const step of steps) {
    const a = (step as Record<string, unknown>)['activity'] as Record<string, unknown> | undefined;
    if (!a) continue;
    const t = String(a['type'] ?? '').toLowerCase();
    if (t !== 'info') quizTypes.push(t);
  }

  const distinct = new Set(quizTypes).size;
  let score = 10;

  if (distinct < 2) { score = 2; notes.push('Only 1 activity type used'); }
  else if (distinct < 3) { score = 6; notes.push('Only 2 activity types used'); }
  else if (distinct < 4) { score = 8; }

  // Penalise consecutive duplicates
  let consecutiveDupes = 0;
  for (let i = 1; i < quizTypes.length; i++) {
    if (quizTypes[i] === quizTypes[i - 1]) consecutiveDupes++;
  }
  if (consecutiveDupes > 0) {
    score = Math.max(0, score - consecutiveDupes);
    notes.push(`${consecutiveDupes} consecutive duplicate activity type(s)`);
  }

  return { score, notes };
}

/** 4. Chunk quality: phrases not single words */
function scoreChunkQuality(chunks: GeneratedChunk[]): { score: number; notes: string[] } {
  const notes: string[] = [];
  let singleWordCount = 0;

  for (const chunk of chunks) {
    const words = chunk.targetPhrase.trim().split(/\s+/);
    if (words.length < 2) {
      singleWordCount++;
      notes.push(`"${chunk.targetPhrase}" is a single word — lexical approach requires phrases`);
    }
  }

  const score = chunks.length === 0 ? 5 : Math.round(((chunks.length - singleWordCount) / chunks.length) * 10);
  return { score, notes };
}

/** 5. Distractor quality: in native language, not matching correct answer */
function scoreDistractorQuality(chunks: GeneratedChunk[], nativeLang: string): { score: number; notes: string[] } {
  const notes: string[] = [];
  const tCode = nameToCode(nativeLang);
  let issues = 0;
  let total = 0;

  for (const chunk of chunks) {
    for (const d of chunk.distractors) {
      total++;
      if (d.toLowerCase().trim() === chunk.nativeTranslation.toLowerCase().trim()) {
        issues++;
        notes.push(`Distractor "${d}" matches correct answer`);
      }
      const detected = detectLanguage(d);
      const targetCode = nameToCode(chunk.targetPhrase);
      if (detected !== tCode && detected !== 'en' && tCode === 'en') {
        // Skip — English native with ambiguous detection
      }
    }
  }

  const score = total === 0 ? 5 : Math.max(0, Math.round(((total - issues) / total) * 10));
  return { score, notes };
}

/** 6. Age appropriateness: simple heuristic check */
function scoreAgeAppropriateness(chunks: GeneratedChunk[], ageGroup: string): { score: number; notes: string[] } {
  const notes: string[] = [];
  const badWords = ['death','kill','murder','sex','violence','war','blood','hate'];
  let issues = 0;

  for (const chunk of chunks) {
    // Only check native-language fields — the targetPhrase is in the target language
    // and may legitimately contain English homophones (e.g. German "war" = "was" in English).
    // Checking targetPhrase for English bad words causes false positives for German content.
    const nativeText = [chunk.nativeTranslation, chunk.explanation, chunk.usageNote].join(' ').toLowerCase();
    for (const bad of badWords) {
      if (nativeText.includes(bad)) {
        issues++;
        notes.push(`Potentially inappropriate content: "${bad}" found in native-language text`);
      }
    }
  }

  // A1 content check: flag if phrases seem too complex (>8 words)
  if (ageGroup === '7-10') {
    for (const chunk of chunks) {
      if (chunk.targetPhrase.split(' ').length > 6) {
        notes.push(`Phrase may be too long for age 7-10: "${chunk.targetPhrase}"`);
      }
    }
  }

  const score = issues === 0 ? 10 : Math.max(0, 10 - issues * 3);
  return { score, notes };
}

/** 7. Interest personalisation: does content reference learner interests? */
function scoreInterestPersonalisation(chunks: GeneratedChunk[], interests: string[]): { score: number; notes: string[] } {
  const notes: string[] = [];
  if (interests.length === 0) return { score: 5, notes: ['No interests provided to check against'] };

  const allText = chunks.map(c =>
    [c.targetPhrase, c.nativeTranslation, c.exampleSentence, c.usageNote].join(' ')
  ).join(' ').toLowerCase();

  let hits = 0;
  for (const interest of interests) {
    if (allText.includes(interest.toLowerCase())) hits++;
  }

  const score = hits === 0 ? 2 : hits === 1 ? 6 : hits >= 2 ? 9 : 10;
  if (hits === 0) notes.push(`No references to interests: ${interests.join(', ')}`);

  return { score, notes };
}

/** 8. Field completeness: validated via lessonValidator result */
function scoreFieldCompleteness(validationResult: { valid: boolean; errors: string[]; warnings: string[] }): { score: number; notes: string[] } {
  const { errors, warnings } = validationResult;
  let score = 10;
  score -= errors.length * 2;
  score -= warnings.length * 0.5;
  score = Math.max(0, Math.round(score));
  return { score, notes: [...errors, ...warnings].slice(0, 5) };
}

/** 9. i+1 difficulty: A1 should have short phrases, A2 slightly longer */
function scoreDifficulty(chunks: GeneratedChunk[], level: string): { score: number; notes: string[] } {
  const notes: string[] = [];
  const avgWords = chunks.reduce((s, c) => s + c.targetPhrase.split(' ').length, 0) / (chunks.length || 1);

  if (level === 'A1') {
    if (avgWords > 5) notes.push(`Average phrase length ${avgWords.toFixed(1)} words — may be too complex for A1`);
    if (avgWords < 1.5) notes.push(`Average phrase length ${avgWords.toFixed(1)} — single words, not chunks`);
  }
  if (level === 'A2') {
    if (avgWords > 8) notes.push(`Average phrase length ${avgWords.toFixed(1)} — very long for A2`);
  }

  const score = notes.length === 0 ? 9 : 6;
  return { score, notes };
}

/** 10. Native language instructions: tutorText/helpText in native language */
function scoreNativeLanguageInstructions(plan: Record<string, unknown>, nativeLang: string): { score: number; notes: string[] } {
  const steps = (plan['steps'] as unknown[]) ?? [];
  const notes: string[] = [];
  const nCode = nameToCode(nativeLang);
  let correct = 0;
  let total = 0;

  for (const step of steps) {
    const s = step as Record<string, unknown>;
    const tutorText = String(s['tutorText'] ?? '');
    if (tutorText.length > 5) {
      total++;
      const detected = detectLanguage(tutorText);
      if (detected === nCode || nCode === 'en') correct++;
      else notes.push(`tutorText appears to be in ${detected}, expected ${nCode}`);
    }
  }

  const score = total === 0 ? 5 : Math.round((correct / total) * 10);
  return { score, notes };
}

// ── Main scoring function ─────────────────────────────────────────────────────

/**
 * Score a generated lesson on all 10 pedagogical quality dimensions.
 */
export function scoreLessonQuality(params: {
  provider: ProviderKey;
  combination: LessonCombination;
  chunks: GeneratedChunk[];
  assembledPlan: Record<string, unknown> | null;
  validationResult: { valid: boolean; errors: string[]; warnings: string[] };
  responseTimeMs: number;
  parseSuccess: boolean;
  assemblySuccess: boolean;
  /** Learner interests used when generating chunks — passed to scoreInterestPersonalisation */
  interests?: string[];
}): LessonQualityScore {
  const { provider, combination, chunks, assembledPlan, validationResult, responseTimeMs, parseSuccess, assemblySuccess } = params;

  // Zero scores for failed generations
  if (!parseSuccess || !assemblySuccess || chunks.length === 0) {
    return {
      provider,
      lessonTitle: 'FAILED',
      combination,
      responseTimeMs,
      parseSuccess,
      assemblySuccess,
      validationResult,
      scores: { languageCorrectness: 0, teachFirstEnforcement: 0, activityVariety: 0, chunkQuality: 0, distractorQuality: 0, ageAppropriateness: 0, interestPersonalisation: 0, fieldCompleteness: 0, i1Difficulty: 0, nativeLanguageInstructions: 0 },
      totalScore: 0,
      rawChunks: chunks,
      rawLesson: assembledPlan,
      notes: ['Generation failed — zero scores'],
    };
  }

  const plan = assembledPlan ?? {};
  const allNotes: string[] = [];

  const r1 = scoreLanguageCorrectness(chunks, combination.targetLanguage, combination.nativeLanguage);
  const r2 = assembledPlan ? scoreTeachFirst(plan) : { score: 0, notes: ['No plan'] };
  const r3 = assembledPlan ? scoreActivityVariety(plan) : { score: 0, notes: ['No plan'] };
  const r4 = scoreChunkQuality(chunks);
  const r5 = scoreDistractorQuality(chunks, combination.nativeLanguage);
  const r6 = scoreAgeAppropriateness(chunks, combination.ageGroup);
  // Use passed interests — previously hardcoded [] meant interest score was always 5
  const r7 = scoreInterestPersonalisation(chunks, params.interests ?? []);
  const r8 = scoreFieldCompleteness(validationResult);
  const r9 = scoreDifficulty(chunks, combination.level);
  const r10 = assembledPlan ? scoreNativeLanguageInstructions(plan, combination.nativeLanguage) : { score: 5, notes: [] };

  for (const r of [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10]) {
    allNotes.push(...r.notes);
  }

  const scores = {
    languageCorrectness: r1.score,
    teachFirstEnforcement: r2.score,
    activityVariety: r3.score,
    chunkQuality: r4.score,
    distractorQuality: r5.score,
    ageAppropriateness: r6.score,
    interestPersonalisation: r7.score,
    fieldCompleteness: r8.score,
    i1Difficulty: r9.score,
    nativeLanguageInstructions: r10.score,
  };

  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);
  const title = (plan['title'] as string | undefined) ?? 'Untitled';

  return {
    provider,
    lessonTitle: title,
    combination,
    responseTimeMs,
    parseSuccess,
    assemblySuccess,
    validationResult,
    scores,
    totalScore,
    rawChunks: chunks,
    rawLesson: assembledPlan,
    notes: allNotes,
  };
}
