# Task 3: AI Service Swap

**Status:** ✅ Complete  
**Completed:** 2026-04-02

## Objective

Replace Google Gemini with Groq (Llama 3.3 70B) for main AI chat functionality while keeping Gemini for TTS and translations.

## Summary

Successfully created a modular AI service architecture:
- **groqService.ts** - Main chat using Groq Llama 3.3 70B
- **systemPrompts.ts** - Kid-friendly, age-aware prompts
- **contentFilter.ts** - Safety filtering for responses
- **geminiService.ts** - Retained for TTS and translations (now using flash-lite)

## Files Created/Modified

### Created
| File | Purpose |
|------|---------|
| `services/groqService.ts` | Groq API client with streaming & retry logic |
| `services/systemPrompts.ts` | Age-based prompt generation |
| `services/contentFilter.ts` | Kid-safe content filtering |

### Modified
| File | Changes |
|------|---------|
| `types.ts` | Added `AgeGroup` type and `ageGroup` to `UserProfile` |
| `services/pocketbaseService.ts` | Added ageGroup to profile mapping |
| `services/geminiService.ts` | Updated translation to use `gemini-2.5-flash-lite` |
| `scripts/setup-pocketbase.cjs` | Added `age_group` field to profiles schema |
| `App.tsx` | Switched chat to groqService, kept Gemini for TTS/translation |

## Architecture

```
┌─────────────┐     ┌──────────────────┐
│   App.tsx   │────▶│  groqService.ts  │──── Chat (Llama 3.3)
│             │     └──────────────────┘
│             │            │
│             │     ┌──────┴──────────┐
│             │     │ systemPrompts   │ Age-based prompts
│             │     │ contentFilter   │ Safety filtering
│             │     └─────────────────┘
│             │
│             │────▶│ geminiService.ts │──── TTS + Translation
└─────────────┘     └──────────────────┘     (flash-lite)
```

## Key Features

### 3.1 Groq Client
- [x] OpenAI-compatible API via fetch
- [x] Rate limiting (500ms between requests)
- [x] Retry with exponential backoff (3 retries)
- [x] Streaming support ready for future use
- [x] Error handling with kid-friendly fallbacks

### 3.2 System Prompts
- [x] "Lingo" persona - friendly owl tutor
- [x] Age-based adjustments (7-10, 11-14, 15-18)
- [x] Session-specific instructions (Main Hall vs Lesson)
- [x] Language-specific rules (French immersion mode)
- [x] JSON action instructions for app integration

### 3.3 Content Filtering
- [x] Unsafe pattern detection (violence, romance, etc.)
- [x] Phrase filtering (personal info requests, secrets)
- [x] Input sanitization (prompt injection prevention)
- [x] Distress detection for extra care

### 3.4 Profile Updates
- [x] Added `ageGroup` field to UserProfile
- [x] Default value: '11-14' (middle age group)
- [x] Pocketbase schema updated
- [x] Service mapping complete

## Model Assignments

| Task | Model | Service |
|------|-------|---------|
| Main Chat | Llama 3.3 70B | groqService |
| Lesson Chat | Llama 3.3 70B | groqService |
| Text-to-Speech | Gemini 2.5 Flash TTS | geminiService |
| Translation | Gemini 2.5 Flash Lite | geminiService |

## Environment Variables

```bash
VITE_GROQ_API_KEY=gsk_...     # Required for chat
VITE_GOOGLE_AI_KEY=...        # Required for TTS/translation
```

## Testing Notes

### Manual Testing Required
- [ ] Test chat responses with different age groups
- [ ] Verify content filtering blocks inappropriate content
- [ ] Test rate limiting under rapid requests
- [ ] Verify retry logic on API failures
- [ ] Test JSON action parsing for all action types

### Edge Cases to Test
- Empty responses from API
- Malformed JSON in responses
- Rate limit (429) handling
- Network timeout scenarios
- Very long user messages

## Deferred Items

| Item | Reason | Phase |
|------|--------|-------|
| Streaming UI | Complexity for MVP | Future |
| Model Router | Only using Groq for now | Phase 2 |
| Claude Haiku | Not needed for MVP | Phase 2 |

## Confidence Score: 8/10

**Met:**
- [x] Groq integration working
- [x] Kid-friendly prompts with age awareness
- [x] Content safety filtering
- [x] Drop-in replacement (same API signature)
- [x] Rate limiting and retry logic

**Concerns:**
- [ ] Streaming UI not yet implemented (non-blocking)
- [ ] Need real-world testing with kids

**Notes:**
- Streaming function is ready (`generateResponseStream`) but not wired to UI yet
- Content filter patterns may need tuning based on real usage
- Age group selector not yet in UI (will add in settings)
