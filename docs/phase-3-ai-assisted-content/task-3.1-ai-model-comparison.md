# Task 3.1: AI Model Head-to-Head Comparison

**Status:** 🔲 Not started  
**Phase:** 3 (AI-Coached Learning)  
**Dependencies:** Task 2.0.5 (AI Provider Migration — must be complete)  
**Estimated Time:** 4–6 hours  
**Priority:** CRITICAL — blocks all other Phase 3 tasks

---

## Objective

Run a rigorous comparison of GLM-5 (DeepInfra), Claude Haiku 4.5 (Anthropic), and Llama 3.3 (Groq) for lesson content generation. Determine which model should be the production default for Phase 3's chunk family generation.

The previous attempt (Phase 2.1/2.2) was abandoned because GLM-5 "didn't work due to output parsing." This task must first fix the parsing issue, then run a fair comparison.

---

## Why This Matters

Phase 3 asks the AI to do something harder than before: generate *coherent chunk families* with personal context injection, not just random phrases. The model must:

1. Follow complex structured output instructions reliably
2. Produce linguistically accurate content in the target language
3. Personalise based on learner context without hallucinating
4. Output valid JSON consistently (not markdown-wrapped, not truncated)
5. Do all of this for a reasonable cost and latency

A 9B parameter model (GLM-5) might struggle with this. Or it might be fine. We need data, not assumptions.

---

## Step-by-Step

### Step 1: Fix GLM-5 JSON Parsing

**File:** `src/services/ai/deepInfraProvider.ts`

The likely issue is that GLM-5 wraps JSON output in markdown code fences or adds preamble text. The DeepInfra provider passes `response_format: { type: 'json_object' }` but smaller models sometimes ignore this.

**Fix: Add robust JSON extraction to the provider's `complete()` method:**

```typescript
/**
 * Extract JSON from a response that might contain markdown fences or preamble.
 * Handles:
 *   - Clean JSON: { ... }
 *   - Markdown-wrapped: ```json\n{ ... }\n```
 *   - Preamble: "Here's the content:\n{ ... }"
 *   - Array responses: [ ... ]
 */
function extractJSON(text: string): string {
  // Try parsing as-is first
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // Strip markdown fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Find first { or [ and extract to matching closer
  const jsonStart = trimmed.search(/[\[{]/);
  if (jsonStart >= 0) {
    const opener = trimmed[jsonStart];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    for (let i = jsonStart; i < trimmed.length; i++) {
      if (trimmed[i] === opener) depth++;
      if (trimmed[i] === closer) depth--;
      if (depth === 0) return trimmed.slice(jsonStart, i + 1);
    }
  }

  // Last resort: return as-is and let the caller handle the parse error
  return trimmed;
}
```

Add this extraction step in `complete()` before returning `result.text`:

```typescript
// In the complete() method, after getting data from API:
let text = data.choices[0]?.message?.content || '';

// If jsonMode was requested, ensure we extract clean JSON
if (jsonMode) {
  text = extractJSON(text);
}

return { text, usage: { ... } };
```

**Also add this same function to `groqProvider.ts` and `anthropicProvider.ts`** for consistency. All providers should handle mixed-format output gracefully.

**Acceptance criteria:**
- [ ] GLM-5 returns parseable JSON for `jsonMode: true` requests
- [ ] Markdown-wrapped responses are cleaned automatically
- [ ] Non-JSON preamble is stripped

---

### Step 2: Create Comparison Script

**File:** `scripts/ai-model-comparison.ts`

This script generates the SAME lesson requests across all three providers and scores the results.

```typescript
/**
 * AI Model Comparison Script
 *
 * Generates identical lesson requests across GLM-5, Haiku 4.5, and Llama 3.3.
 * Scores each on: JSON validity, linguistic accuracy, chunk coherence,
 * personalisation quality, and response time.
 *
 * Usage:
 *   npx tsx scripts/ai-model-comparison.ts
 *
 * Requires .env with:
 *   VITE_DEEPINFRA_API_KEY
 *   VITE_ANTHROPIC_API_KEY
 *   VITE_GROQ_API_KEY
 */
```

**Test matrix (10 requests per provider = 30 total):**

| # | Topic | Target Lang | Native Lang | Age Group | Interests | Personal Context |
|---|-------|-------------|-------------|-----------|-----------|-----------------|
| 1 | Introduce Yourself | German | French | 7-10 | animals, football | "I have a cat named Luna" |
| 2 | Introduce Yourself | German | English | 11-14 | gaming, music | "I play Minecraft every day" |
| 3 | At the Restaurant | German | French | 15-18 | cooking, travel | "I want to order pizza" |
| 4 | Talking About Hobbies | English | French | 7-10 | drawing, dinosaurs | "I like drawing T-Rex" |
| 5 | Asking for Directions | German | English | 11-14 | cycling, nature | "I bike to school" |
| 6 | My Family | English | French | 7-10 | animals, reading | "I have a little brother" |
| 7 | At School | German | French | 11-14 | maths, football | "My favourite class is maths" |
| 8 | Shopping | English | French | 15-18 | fashion, music | "I want new headphones" |
| 9 | Weekend Plans | German | English | 7-10 | swimming, cartoons | "I go swimming on Saturdays" |
| 10 | Feelings & Emotions | English | French | 11-14 | writing, animals | "My dog makes me happy" |

**Use the NEW chunk family prompt** (from Task 3.2 design, included below in simplified form for the comparison):

```typescript
const COMPARISON_PROMPT = `You are a language education content creator for children.

Generate a CHUNK FAMILY for a ${targetLanguage} lesson about "${topic}".
The learner's native language is ${nativeLanguage}. Age group: ${ageGroup}.

PERSONAL CONTEXT from the learner: "${personalContext}"

A chunk family is ONE core sentence frame with 3 variations that fill the frame
with personally relevant content.

RULES:
1. The core frame must be a reusable sentence pattern (e.g. "Ich bin ___")
2. All 3 variations must use the SAME frame but fill it differently
3. At least 1 variation must reference the personal context
4. All target phrases must be in ${targetLanguage}
5. All translations, distractors, and usage notes must be in ${nativeLanguage}
6. Distractors must be plausible but clearly wrong, in the NATIVE language
7. Age-appropriate content only

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "coreFrame": "...",
  "coreFrameTranslation": "...",
  "title": "Lesson title",
  "chunks": [
    {
      "targetPhrase": "...",
      "nativeTranslation": "...",
      "exampleSentence": "...",
      "usageNote": "...",
      "explanation": "...",
      "distractors": ["...", "...", "..."],
      "correctUsageContext": "...",
      "wrongUsageContexts": ["...", "...", "..."]
    }
  ]
}`;
```

### Step 3: Scoring Rubric

Each response is scored on 5 dimensions (1-5 scale):

| Dimension | 1 (Fail) | 3 (Acceptable) | 5 (Excellent) |
|-----------|----------|-----------------|---------------|
| **JSON Validity** | Parse error | Valid but missing fields | All fields present and correct types |
| **Target Language Accuracy** | Wrong language or gibberish | Minor errors | Native-quality phrases |
| **Chunk Coherence** | 3 unrelated phrases | Share a theme but different frames | True family: same frame, varied slots |
| **Personalisation** | Ignores personal context | Mentions context generically | Context woven naturally into chunks |
| **Distractor Quality** | Wrong language or nonsensical | Correct language, too easy | Plausible, same semantic field, correct language |

**Also measure:**
- Response time (ms)
- Token usage (input + output)
- JSON extraction needed (yes/no — did the model output clean JSON or wrapped it?)

### Step 4: Run Comparison and Document

Run the script. Score each response manually (or with a second AI call for automated scoring). Document results in:

**File:** `docs/phase-3/ai-model-comparison-results.md`

Format:
```markdown
# AI Model Comparison Results

## Summary

| Model | Avg Score | JSON Valid% | Avg Response Time | Avg Cost |
|-------|-----------|-------------|-------------------|----------|
| GLM-5 9B (DeepInfra) | X.X/5 | XX% | XXXms | $X.XXX |
| Haiku 4.5 (Anthropic) | X.X/5 | XX% | XXXms | $X.XXX |
| Llama 3.3 70B (Groq) | X.X/5 | XX% | XXXms | $X.XXX |

## Recommendation: [MODEL] as production default

## Detailed Results
[Per-request breakdown]
```

### Step 5: Update Provider Configuration

Based on results, update `src/services/ai/aiProviderService.ts`:

- Set the winning model as the default for `purpose: 'general'` (lesson generation)
- Keep Groq Llama 3.3 as the default for `purpose: 'fast'` (chat interactions)
- Update `PROVIDER_PRIORITY` array if needed

---

## Acceptance Criteria

- [ ] GLM-5 successfully returns parseable JSON (parsing fix works)
- [ ] All 30 test requests complete without crashes
- [ ] Results document exists with scores for all 3 models
- [ ] Clear recommendation with rationale
- [ ] Provider configuration updated with winning model
- [ ] Winning model produces chunks in the correct target language 100% of the time

---

## Test Commands

```bash
# Run the comparison
npx tsx scripts/ai-model-comparison.ts

# Verify provider config
grep -n "PROVIDER_PRIORITY" src/services/ai/aiProviderService.ts

# Quick smoke test with winning model
npx tsx -e "
  const { aiProviderService } = require('./src/services/ai');
  const provider = aiProviderService.getPrimaryProvider();
  console.log('Primary provider:', provider.name);
  provider.complete({
    messages: [{ role: 'user', content: 'Say hello in German' }],
  }).then(r => console.log(r.text));
"
```

---

## Notes

- If GLM-5 scores within 10% of Haiku 4.5, prefer GLM-5 for cost reasons (10x cheaper)
- If no model scores above 3.5 average, escalate — the prompt needs rework before proceeding
- Anthropic API key is dev-mode only; for production, GLM-5 or Groq must work
- Don't forget: the test uses a simplified version of the chunk family prompt. The full prompt (Task 3.2) will get even better results from the same model.
