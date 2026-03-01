/**
 * LingoFriends - Question Regeneration Service
 *
 * Handles regeneration of broken or poorly-formed questions.
 * When a user reports a question or the AI detects issues, this service
 * generates a replacement activity while maintaining learning objectives.
 *
 * @module questionRegenerationService
 * @see docs/phase-2-world-expansion/task-2.0-7-help-system-overhaul.md
 */

import type { ActivityConfig, LessonStep } from '../types/game';
import type { GeneratedChunkContent } from './lessonAssembler';
import { aiProviderService } from './ai';
import { assembleLessonPlan } from './lessonAssembler';
import { planActivitySequence } from './activitySequencer';
import { toLanguageName } from '../utils/languageUtils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Reasons why a question might need regeneration.
 */
export enum RegenerationReason {
  /** Options in wrong language (distractors should be native, not target) */
  WRONG_LANGUAGE = 'wrong_language',
  
  /** Correct answer is ambiguous or has multiple valid interpretations */
  AMBIGUOUS_ANSWER = 'ambiguous_answer',
  
  /** Mismatched pairs in matching activity */
  MISMATCHED_PAIRS = 'mismatched_pairs',
  
  /** Question text doesn't match the expected format */
  INVALID_FORMAT = 'invalid_format',
  
  /** User explicitly reported the question */
  USER_REPORTED = 'user_reported',
  
  /** AI detected the issue during help conversation */
  AI_DETECTED = 'ai_detected',
  
  /** Translation is incorrect or misleading */
  INCORRECT_TRANSLATION = 'incorrect_translation',
}

/**
 * Request to regenerate a question.
 */
export interface RegenerationRequest {
  /** The original activity that has issues */
  originalActivity: ActivityConfig;
  
  /** The chunk being tested */
  chunk: GeneratedChunkContent;
  
  /** Why regeneration is needed */
  reason: RegenerationReason;
  
  /** User's description of the problem (optional) */
  userDescription?: string;
  
  /** Target language code */
  targetLanguageCode: string;
  
  /** Native language code */
  nativeLanguageCode: string;
  
  /** Desired activity type (defaults to same as original) */
  activityType?: ActivityConfig['type'];
  
  /** Difficulty level 1-5 */
  difficulty?: number;
}

/**
 * Result of regeneration attempt.
 */
export interface RegenerationResult {
  /** Whether regeneration was successful */
  success: boolean;
  
  /** The new activity (if successful) */
  newActivity?: ActivityConfig;
  
  /** The new lesson step (if successful) */
  newStep?: LessonStep;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Whether fallback to original is recommended */
  shouldUseFallback?: boolean;
}

// ============================================================================
// REGENERATION LOGIC
// ============================================================================

/**
 * Regenerate a broken question with a new activity.
 *
 * This function:
 * 1. Analyzes the original activity
 * 2. Uses AI to generate corrected content
 * 3. Assembles a new activity of the same type (or specified type)
 *
 * @param request - The regeneration request
 * @returns Result with new activity or error
 */
export async function regenerateQuestion(
  request: RegenerationRequest
): Promise<RegenerationResult> {
  const {
    originalActivity,
    chunk,
    reason,
    userDescription,
    targetLanguageCode,
    nativeLanguageCode,
    activityType,
    difficulty = 2,
  } = request;
  
  const targetLangName = toLanguageName(targetLanguageCode);
  const nativeLangName = toLanguageName(nativeLanguageCode);
  
  // Default to same activity type
  const targetType = activityType || originalActivity.type;
  
  try {
    console.log(`[QuestionRegen] Regenerating ${targetType} question for reason: ${reason}`);
    
    // Build AI prompt for regeneration
    const systemPrompt = buildRegenerationSystemPrompt(
      targetLangName,
      nativeLangName,
      targetType,
      reason
    );
    
    const userPrompt = buildRegenerationUserPrompt(
      chunk,
      originalActivity,
      reason,
      userDescription
    );
    
    // Call AI for regeneration
    const result = await aiProviderService.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5, // Lower temperature for more deterministic output
      maxTokens: 1000,
      jsonMode: true,
    });
    
    // Parse the response
    const responseText = result.text.trim();
    const newContent = parseRegenerationResponse(responseText, targetType);
    
    if (!newContent) {
      console.warn('[QuestionRegen] Failed to parse AI response');
      return {
        success: false,
        error: 'Failed to parse regeneration response',
        shouldUseFallback: true,
      };
    }
    
    // Build new step from regenerated content
    const newStep = buildStepFromContent(newContent, targetType, chunk);
    
    console.log(`[QuestionRegen] Successfully regenerated ${targetType} question`);
    
    return {
      success: true,
      newActivity: newStep.activity,
      newStep,
    };
    
  } catch (error) {
    console.error('[QuestionRegen] Regeneration failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldUseFallback: true,
    };
  }
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

/**
 * Build the system prompt for regeneration.
 */
function buildRegenerationSystemPrompt(
  targetLangName: string,
  nativeLangName: string,
  activityType: string,
  reason: RegenerationReason
): string {
  const issueGuidance = getIssueGuidance(reason);
  
  return `You are a language learning content corrector. Your job is to fix a broken question for a ${targetLangName} lesson.

TARGET LANGUAGE: ${targetLangName}
NATIVE LANGUAGE: ${nativeLangName}
ACTIVITY TYPE: ${activityType}

ISSUE: ${issueGuidance}

STRICT RULES:
1. ALL options, distractors, and wrong answers MUST be in ${nativeLangName} (the NATIVE language)
2. The CORRECT answer and target phrase MUST be in ${targetLangName} (the TARGET language)
3. Questions should be in ${nativeLangName} asking about ${targetLangName} phrases
4. Keep the same difficulty level and learning objective
5. Generate valid, unambiguous content

OUTPUT FORMAT (JSON):
${getOutputFormat(activityType)}

Return ONLY valid JSON, no additional text.`;
}

/**
 * Build the user prompt with original content.
 */
function buildRegenerationUserPrompt(
  chunk: GeneratedChunkContent,
  originalActivity: ActivityConfig,
  reason: RegenerationReason,
  userDescription?: string
): string {
  let prompt = `ORIGINAL CHUNK:
- Target phrase: "${chunk.targetPhrase}"
- Translation: "${chunk.nativeTranslation}"
- Example: "${chunk.exampleSentence}"
- Usage note: "${chunk.usageNote}"

ORIGINAL (BROKEN) QUESTION:
${JSON.stringify(originalActivity, null, 2)}

REASON FOR REGENERATION: ${reason}

`;

  if (userDescription) {
    prompt += `USER DESCRIPTION OF ISSUE: "${userDescription}"

`;
  }

  prompt += `Please generate a corrected version of this question. Keep the same learning objective but fix the issues.`;

  return prompt;
}

/**
 * Get guidance text for a specific issue type.
 */
function getIssueGuidance(reason: RegenerationReason): string {
  switch (reason) {
    case RegenerationReason.WRONG_LANGUAGE:
      return 'Options are in the wrong language. Distractors must be in the NATIVE language, not the target language.';
    
    case RegenerationReason.AMBIGUOUS_ANSWER:
      return 'The correct answer is ambiguous. Create clearer options where only one answer is correct.';
    
    case RegenerationReason.MISMATCHED_PAIRS:
      return 'Matching pairs are incorrect or mismatched. Ensure each left item correctly matches its right item.';
    
    case RegenerationReason.INVALID_FORMAT:
      return 'The question format is invalid. Reconstruct it with proper structure.';
    
    case RegenerationReason.USER_REPORTED:
      return 'A user reported this question. Review it and regenerate with corrections.';
    
    case RegenerationReason.AI_DETECTED:
      return 'AI detected an issue during help conversation. Fix the identified problem.';
    
    case RegenerationReason.INCORRECT_TRANSLATION:
      return 'The translation is incorrect. Provide the correct translation.';
    
    default:
      return 'The question has issues. Regenerate it with corrections.';
  }
}

/**
 * Get the expected output format for an activity type.
 */
function getOutputFormat(activityType: string): string {
  switch (activityType) {
    case 'multiple_choice':
      return `{
  "question": "Question text in native language",
  "options": ["correct answer", "wrong1", "wrong2", "wrong3"],
  "correctIndex": 0,
  "hint": "Optional hint in native language"
}`;
    
    case 'fill_blank':
      return `{
  "sentence": "Sentence with ___ blank in target language",
  "correctAnswer": "word to fill in",
  "hint": "Optional hint"
}`;
    
    case 'translate':
      return `{
  "sourcePhrase": "Phrase in native language",
  "correctAnswer": "Correct translation in target language",
  "acceptedAnswers": ["answer1", "answer2"]
}`;
    
    case 'true_false':
      return `{
  "statement": "Statement about the phrase",
  "isTrue": true,
  "hint": "Optional hint"
}`;
    
    case 'matching':
      return `{
  "pairs": [
    {"left": "target phrase 1", "right": "translation 1"},
    {"left": "target phrase 2", "right": "translation 2"}
  ]
}`;
    
    case 'word_arrange':
      return `{
  "targetSentence": "Correct sentence in target language",
  "scrambledWords": ["word1", "word2", "word3"]
}`;
    
    default:
      return `{
  "content": "Activity content"
}`;
  }
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

/**
 * Parse the AI response and extract activity content.
 */
function parseRegenerationResponse(
  responseText: string,
  activityType: string
): Record<string, unknown> | null {
  try {
    // Strip markdown if present
    let jsonStr = responseText.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate required fields based on type
    if (!validateActivityContent(parsed, activityType)) {
      console.warn('[QuestionRegen] Validation failed for activity content');
      return null;
    }
    
    return parsed;
    
  } catch (error) {
    console.error('[QuestionRegen] Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Validate that the activity content has required fields.
 */
function validateActivityContent(
  content: Record<string, unknown>,
  activityType: string
): boolean {
  switch (activityType) {
    case 'multiple_choice':
      return (
        typeof content.question === 'string' &&
        Array.isArray(content.options) &&
        content.options.length === 4 &&
        typeof content.correctIndex === 'number'
      );
    
    case 'fill_blank':
      return (
        typeof content.sentence === 'string' &&
        typeof content.correctAnswer === 'string' &&
        content.sentence.includes('___')
      );
    
    case 'translate':
      return (
        typeof content.sourcePhrase === 'string' &&
        typeof content.correctAnswer === 'string'
      );
    
    case 'true_false':
      return (
        (typeof content.statement === 'string' || typeof content.question === 'string') &&
        typeof content.isTrue === 'boolean'
      );
    
    case 'matching':
      return (
        Array.isArray(content.pairs) &&
        content.pairs.length >= 2 &&
        content.pairs.every((p: unknown) =>
          typeof p === 'object' && p !== null &&
          'left' in p && 'right' in p
        )
      );
    
    case 'word_arrange':
      return (
        typeof content.targetSentence === 'string' &&
        Array.isArray(content.scrambledWords) &&
        content.scrambledWords.length >= 2
      );
    
    default:
      return true;
  }
}

// ============================================================================
// STEP BUILDER
// ============================================================================

/**
 * Build a lesson step from regenerated content.
 */
function buildStepFromContent(
  content: Record<string, unknown>,
  activityType: string,
  chunk: GeneratedChunkContent
): LessonStep {
  const tutorText = getTutorText(activityType, chunk);
  const helpText = chunk.usageNote || chunk.explanation;
  
  const activity: ActivityConfig = {
    type: activityType as ActivityConfig['type'],
    ...content,
    sunDrops: getSunDrops(activityType),
  } as ActivityConfig;
  
  return {
    tutorText,
    helpText,
    activity,
  };
}

/**
 * Get appropriate tutor text for an activity type.
 */
function getTutorText(activityType: string, chunk: GeneratedChunkContent): string {
  switch (activityType) {
    case 'multiple_choice':
      return `Let's check — what does "${chunk.targetPhrase}" mean?`;
    
    case 'fill_blank':
      return `Practice time! Complete this phrase.`;
    
    case 'translate':
      return `Your turn! Translate this phrase.`;
    
    case 'true_false':
      return `Quick check: Is this statement true or false?`;
    
    case 'matching':
      return `Match the phrases with their meanings!`;
    
    case 'word_arrange':
      return `Arrange these words to form the phrase.`;
    
    default:
      return `Let's practice!`;
  }
}

/**
 * Get SunDrops for an activity type.
 */
function getSunDrops(activityType: string): number {
  const sunDropMap: Record<string, number> = {
    'info': 0,
    'true_false': 1,
    'multiple_choice': 1,
    'fill_blank': 2,
    'matching': 2,
    'word_arrange': 3,
    'translate': 3,
  };
  
  return sunDropMap[activityType] ?? 2;
}

// ============================================================================
// REPORT RECORDING
// ============================================================================

/**
 * Record a question report for analysis.
 * This would be stored in Pocketbase for tracking.
 */
export interface QuestionReport {
  id: string;
  userId: string;
  lessonId: string;
  stepIndex: number;
  activityType: string;
  chunkId?: string;
  reason: RegenerationReason;
  userDescription?: string;
  originalContent: Record<string, unknown>;
  regeneratedContent?: Record<string, unknown>;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

/**
 * In-memory store for question reports (temporary until Pocketbase integration).
 */
const questionReports: Map<string, QuestionReport> = new Map();

/**
 * Record a question report.
 */
export function recordQuestionReport(
  userId: string,
  lessonId: string,
  stepIndex: number,
  activityType: string,
  reason: RegenerationReason,
  originalContent: Record<string, unknown>,
  userDescription?: string
): string {
  const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const report: QuestionReport = {
    id: reportId,
    userId,
    lessonId,
    stepIndex,
    activityType,
    reason,
    userDescription,
    originalContent,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  questionReports.set(reportId, report);
  
  console.log(`[QuestionRegen] Recorded report ${reportId} for reason: ${reason}`);
  
  return reportId;
}

/**
 * Mark a report as resolved after regeneration.
 */
export function resolveQuestionReport(
  reportId: string,
  regeneratedContent?: Record<string, unknown>
): void {
  const report = questionReports.get(reportId);
  if (report) {
    report.status = 'resolved';
    report.regeneratedContent = regeneratedContent;
    console.log(`[QuestionRegen] Report ${reportId} resolved`);
  }
}

/**
 * Get all pending reports (for admin review).
 */
export function getPendingReports(): QuestionReport[] {
  return Array.from(questionReports.values()).filter(r => r.status === 'pending');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  regenerateQuestion,
  recordQuestionReport,
  resolveQuestionReport,
  getPendingReports,
  RegenerationReason,
};