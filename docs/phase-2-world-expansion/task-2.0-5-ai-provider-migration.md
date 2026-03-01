# Task 2.0.5: AI Provider Migration

**Status:** 🔲 Not started  
**Phase:** 2.0 — Wave 1 (critical path)  
**Dependencies:** None  
**Estimated Time:** 8–12 hours  
**Priority:** High — lesson quality depends on AI quality

---

## Problem Statement

Lesson generation quality via Groq Llama 3.3 is poor: wrong-language content, questions about untaught vocabulary, activities with missing fields. We need to:

1. Switch primary AI to GLM-5 via DeepInfra for all AI actions (lesson generation, voice chat, chunk generation, help system)
2. Build a proper provider abstraction so we can easily test and swap models
3. Add Anthropic (Haiku 4.5, Sonnet 4.6) as a dev-mode testing option
4. Keep Groq Llama 3.3 as a fallback safety net
5. Preserve existing Groq Whisper for STT and Google TTS for speech

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                AIProviderService                 │
│                                                  │
│  getProvider() → returns active provider          │
│  setProvider(id) → switch active provider         │
│  listProviders() → available providers           │
│                                                  │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ │
│  │ DeepInfra  │ │ Anthropic  │ │   Groq       │ │
│  │ (GLM-5)    │ │ (Haiku/    │ │ (Llama 3.3)  │ │
│  │            │ │  Sonnet)   │ │              │ │
│  │ PRODUCTION │ │ DEV ONLY   │ │ FALLBACK     │ │
│  └────────────┘ └────────────┘ └──────────────┘ │
│                                                  │
│  All implement: AIProvider interface              │
│  All use: OpenAI-compatible chat completions API  │
└─────────────────────────────────────────────────┘

Unchanged:
  - Groq Whisper → STT (speech-to-text)
  - Google Cloud TTS → TTS (text-to-speech)
```

---

## Objectives

1. Create `AIProviderService` with strategy pattern
2. Create `DeepInfraProvider` for GLM-5
3. Create `AnthropicProvider` for Haiku 4.5 / Sonnet 4.6
4. Refactor existing `groqService.ts` into `GroqProvider`
5. Add dev-mode UI toggle for provider switching
6. Ensure all existing AI consumers use the abstraction
7. Run quality comparison before committing to production default

---

## Step-by-Step Implementation

### Step 1 — Define Provider Interface

**File:** `src/services/ai/types.ts` (NEW)

```typescript
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  temperature?: number;       // default 0.7
  maxTokens?: number;         // default 1024
  jsonMode?: boolean;         // request JSON output
  stream?: boolean;           // enable streaming
}

export interface AICompletionResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost?: number;
  };
}

export interface AIStreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  isAvailable: boolean;            // has API key configured
  models: AIModelConfig[];

  /** Non-streaming completion */
  complete(options: AICompletionOptions): Promise<AICompletionResult>;

  /** Streaming completion */
  stream(options: AICompletionOptions, callbacks: AIStreamCallbacks): Promise<void>;
}

export interface AIModelConfig {
  id: string;           // e.g., 'zai-org/GLM-5'
  name: string;         // e.g., 'GLM-5'
  purpose: 'general' | 'fast' | 'reasoning';
  contextWindow: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

export type ProviderKey = 'deepinfra' | 'anthropic' | 'groq';
```

### Step 2 — Create DeepInfra Provider

**File:** `src/services/ai/deepInfraProvider.ts` (NEW)

DeepInfra uses the OpenAI-compatible API format. Key details:
- Base URL: `https://api.deepinfra.com/v1/openai`
- Auth: `Authorization: Bearer ${DEEPINFRA_TOKEN}`
- Model string: `zai-org/GLM-5`
- Supports: streaming, JSON mode, function calling

```typescript
const DEEPINFRA_CONFIG = {
  baseUrl: 'https://api.deepinfra.com/v1/openai/chat/completions',
  models: [
    {
      id: 'zai-org/GLM-5',
      name: 'GLM-5',
      purpose: 'general' as const,
      contextWindow: 200_000,
      costPer1kInput: 0.0008,
      costPer1kOutput: 0.00256,
    },
  ],
};
```

The implementation mirrors the existing `groqService.ts` fetch logic but with the DeepInfra base URL and model string. Streaming uses the same SSE format.

### Step 3 — Create Anthropic Provider

**File:** `src/services/ai/anthropicProvider.ts` (NEW)

Anthropic uses its own messages API format (NOT OpenAI-compatible). Key differences:
- Base URL: `https://api.anthropic.com/v1/messages`
- Auth: `x-api-key: ${ANTHROPIC_KEY}` (header, not Bearer token)
- System prompt goes in `system` field, not as a message
- Response format differs (`content` array with `type: "text"`)

```typescript
const ANTHROPIC_CONFIG = {
  baseUrl: 'https://api.anthropic.com/v1/messages',
  models: [
    {
      id: 'claude-haiku-4-5-20251001',
      name: 'Haiku 4.5',
      purpose: 'fast' as const,
      contextWindow: 200_000,
    },
    {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Sonnet 4.6',
      purpose: 'reasoning' as const,
      contextWindow: 200_000,
    },
  ],
};
```

The implementation needs to translate between the internal `AIMessage[]` format and Anthropic's format:
```typescript
// Extract system message
const systemMessage = options.messages.find(m => m.role === 'system')?.content || '';
const userMessages = options.messages.filter(m => m.role !== 'system');

const body = {
  model: selectedModel,
  system: systemMessage,
  max_tokens: options.maxTokens || 1024,
  messages: userMessages,
};
```

**Important:** The Anthropic provider should ONLY be active when `VITE_DEV_MODE=true`. Never expose it in production. Gate the UI toggle behind dev mode.

### Step 4 — Refactor Groq into Provider Pattern

**File:** `src/services/ai/groqProvider.ts` (NEW — extracted from `groqService.ts`)

Extract the chat completion logic from the existing `groqService.ts` into the provider interface. Keep `groqService.ts` as a thin wrapper that delegates to the provider, so existing imports don't break.

**Leave STT (Whisper) in `groqService.ts`** — the provider abstraction is for text LLM completions only. Voice services have their own dedicated service files.

### Step 5 — Create AIProviderService

**File:** `src/services/ai/aiProviderService.ts` (NEW)

```typescript
import { DeepInfraProvider } from './deepInfraProvider';
import { AnthropicProvider } from './anthropicProvider';
import { GroqProvider } from './groqProvider';
import type { AIProvider, ProviderKey } from './types';

class AIProviderServiceClass {
  private providers: Map<ProviderKey, AIProvider> = new Map();
  private activeProvider: ProviderKey = 'deepinfra';

  constructor() {
    // Register all providers
    this.providers.set('deepinfra', new DeepInfraProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('groq', new GroqProvider());

    // Read preference from env / localStorage
    const envProvider = import.meta.env.VITE_AI_PROVIDER as ProviderKey;
    if (envProvider && this.providers.has(envProvider)) {
      this.activeProvider = envProvider;
    }
  }

  getProvider(): AIProvider {
    const provider = this.providers.get(this.activeProvider);
    if (!provider?.isAvailable) {
      // Fallback chain: deepinfra → groq → anthropic
      for (const fallback of ['deepinfra', 'groq', 'anthropic'] as ProviderKey[]) {
        const fb = this.providers.get(fallback);
        if (fb?.isAvailable) return fb;
      }
      throw new Error('No AI provider available — check API keys');
    }
    return provider;
  }

  setProvider(key: ProviderKey): void {
    if (this.providers.has(key)) {
      this.activeProvider = key;
      localStorage.setItem('ai-provider', key);
    }
  }

  listProviders(): Array<{ key: ProviderKey; name: string; available: boolean }> {
    return [...this.providers.entries()].map(([key, provider]) => ({
      key,
      name: provider.name,
      available: provider.isAvailable,
    }));
  }
}

export const AIProviderService = new AIProviderServiceClass();
```

### Step 6 — Update All AI Consumers

Every file that currently imports from `groqService.ts` for LLM completions needs to use the provider abstraction instead:

```typescript
// BEFORE
import { generateResponse } from '../services/groqService';

// AFTER
import { AIProviderService } from '../services/ai/aiProviderService';

const provider = AIProviderService.getProvider();
const result = await provider.complete({
  messages: [...],
  temperature: 0.7,
});
```

**Files to update (audit the codebase for all groqService imports):**
- `src/services/lessonGeneratorV2.ts` (or wherever lesson generation lives)
- `src/services/chunkGeneratorService.ts`
- `src/services/aiPedagogyClient.ts`
- `src/services/groqService.ts` (keep for STT, delegate LLM to provider)
- Any component that directly calls Groq for chat

### Step 7 — Dev Mode Provider Toggle

**File:** `src/components/settings/DevModePanel.tsx` (NEW or extend existing settings)

Only visible when `VITE_DEV_MODE=true`:

```typescript
// Simple dropdown to switch providers
<select
  value={currentProvider}
  onChange={(e) => AIProviderService.setProvider(e.target.value)}
>
  {AIProviderService.listProviders()
    .filter(p => p.available)
    .map(p => (
      <option key={p.key} value={p.key}>{p.name}</option>
    ))
  }
</select>
```

For Anthropic, also show a model sub-selector (Haiku vs Sonnet).

### Step 8 — Quality Evaluation (Manual)

Before committing GLM-5 as the production default:

1. Generate 20 lessons with GLM-5 across different languages and levels
2. Generate 20 lessons with the existing Llama 3.3
3. (Optional) Generate 20 lessons with Haiku 4.5
4. Compare on:
   - Correct target language content
   - Natural-sounding chunks
   - Activity field completeness (no missing options/answers)
   - Instruction quality in native language
   - Response time
5. Document findings and decide on production default

---

## Environment Variables

```bash
# DeepInfra (production default)
VITE_DEEPINFRA_API_KEY=<key>

# Anthropic (dev mode only)
VITE_ANTHROPIC_API_KEY=<key>

# Groq (fallback, existing)
VITE_GROQ_API_KEY=<existing-key>

# Provider selection
VITE_AI_PROVIDER=deepinfra    # deepinfra | anthropic | groq
VITE_DEV_MODE=false           # enables provider switching in UI
```

**CRITICAL:** API keys must be in `.env` only, never committed to source. The `.env.example` should document the variable names without values.

---

## Data Sovereignty Note

DeepInfra processes data in US-based data centres with zero data retention (SOC 2, ISO 27001 certified). This is a pragmatic trade-off for development speed. The provider abstraction is designed so that a future EU-hosted provider (e.g., self-hosted inference, Scaleway AI, or EU-specific API) can be added as a new provider class without changing any consuming code.

For production launch with children's data, evaluate:
- DeepInfra's DPA (Data Processing Agreement) for GDPR compliance
- Whether a proxy service in the EU adds sufficient protection
- EU-hosted alternatives for GLM-5 inference

---

## Testing Checklist

- [ ] DeepInfra provider connects and generates responses
- [ ] Anthropic provider connects and generates responses (dev mode)
- [ ] Groq provider still works as fallback
- [ ] Fallback chain works when primary provider key is missing
- [ ] Streaming works for all three providers
- [ ] JSON mode works for lesson generation
- [ ] Dev mode toggle switches providers at runtime
- [ ] Non-dev-mode hides the toggle
- [ ] All existing AI consumers work through the abstraction
- [ ] STT (Whisper) still works through Groq directly
- [ ] TTS still works through Google Cloud directly
- [ ] No API keys exposed in client bundle or logs

---

## Files to Create

| File | Description |
|------|-------------|
| `src/services/ai/types.ts` | Provider interface definitions |
| `src/services/ai/aiProviderService.ts` | Provider manager / factory |
| `src/services/ai/deepInfraProvider.ts` | GLM-5 via DeepInfra |
| `src/services/ai/anthropicProvider.ts` | Haiku / Sonnet via Anthropic |
| `src/services/ai/groqProvider.ts` | Llama 3.3 via Groq (extracted) |
| `src/services/ai/index.ts` | Barrel exports |

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/groqService.ts` | Keep STT, delegate LLM to provider |
| `src/services/aiPedagogyClient.ts` | Use AIProviderService |
| `src/services/chunkGeneratorService.ts` | Use AIProviderService |
| `src/services/lessonGeneratorV2.ts` | Use AIProviderService |
| `.env.example` | Add new env var documentation |
