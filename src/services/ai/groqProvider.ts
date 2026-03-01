/**
 * LingoFriends - Groq AI Provider
 * 
 * Provider for Llama 3.3 70B via Groq API.
 * This is the FALLBACK provider when DeepInfra/Anthropic are unavailable.
 * 
 * Uses OpenAI-compatible chat completions API format.
 * 
 * @module services/ai/groqProvider
 */

import type { AIProvider, AICompletionOptions, AICompletionResult, AIStreamCallbacks, AIModelConfig, ProviderConfig } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Groq models available for LingoFriends.
 */
const GROQ_MODELS: AIModelConfig[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    purpose: 'general',
    contextWindow: 128_000,
    costPer1kInput: 0.00059,
    costPer1kOutput: 0.00079,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    purpose: 'fast',
    contextWindow: 128_000,
    costPer1kInput: 0.0,
    costPer1kOutput: 0.0,
  },
];

/**
 * Default model for Groq.
 */
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

/**
 * Groq API URL (OpenAI-compatible).
 */
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract clean JSON from a response that may contain markdown fences or preamble.
 * Groq models generally respect json_object mode, but this is defensive.
 * @see deepInfraProvider.ts for detailed documentation
 */
function extractJSON(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();
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
  return trimmed;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isRateLimit = (error as { status?: number })?.status === 429;
      
      if (attempt < maxRetries - 1) {
        const delay = isRateLimit 
          ? baseDelay * Math.pow(2, attempt + 1) 
          : baseDelay * Math.pow(2, attempt);
        console.log(`[Groq] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// GROQ PROVIDER CLASS
// ============================================================================

/**
 * Groq AI Provider implementation.
 * 
 * Uses OpenAI-compatible chat completions API format.
 * This is the existing provider, kept as fallback.
 */
export class GroqProvider implements AIProvider {
  readonly id = 'groq' as const;
  readonly name = 'Groq';
  readonly description = 'Llama 3.3 via Groq (fallback, with Whisper STT)';
  readonly models = GROQ_MODELS;
  readonly defaultModel = DEFAULT_MODEL;
  
  private apiKey: string | undefined;
  private baseUrl: string;
  
  /** Rate limiting state */
  private lastRequestTime = 0;
  private readonly minRequestInterval = 500;
  
  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || GROQ_BASE_URL;
  }
  
  /**
   * Check if the provider is configured with a valid API key.
   */
  get isAvailable(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.length > 0;
  }
  
  /**
   * Generate a completion (non-streaming).
   */
  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    if (!this.isAvailable) {
      throw new Error('Groq API key not configured');
    }
    
    await this.enforceRateLimit();
    
    const { messages, temperature = 0.7, maxTokens = 1024, jsonMode = false } = options;
    
    return retryWithBackoff(async () => {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature,
          max_tokens: maxTokens,
          response_format: jsonMode ? { type: 'json_object' } : undefined,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        const apiError = new Error(`Groq API error: ${response.status} - ${error?.error?.message || 'Unknown error'}`);
        (apiError as any).status = response.status;
        throw apiError;
      }
      
      const data = await response.json() as {
        choices: Array<{ message: { content: string }; finish_reason: string }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };
      
      let text = data.choices?.[0]?.message?.content || '';
      const usage = data.usage;

      // Apply JSON extraction defensively even though Groq usually
      // honours response_format correctly.
      if (jsonMode) {
        text = extractJSON(text);
      }

      return {
        text,
        model: this.defaultModel,
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          estimatedCost: this.calculateCost(usage.prompt_tokens, usage.completion_tokens),
        } : undefined,
      };
    });
  }
  
  /**
   * Generate a streaming completion.
   */
  async stream(options: AICompletionOptions, callbacks: AIStreamCallbacks): Promise<void> {
    if (!this.isAvailable) {
      callbacks.onError(new Error('Groq API key not configured'));
      return;
    }
    
    await this.enforceRateLimit();
    
    const { messages, temperature = 0.7, maxTokens = 1024 } = options;
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(`Groq API error: ${response.status} - ${error?.error?.message || 'Unknown error'}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                fullText += token;
                callbacks.onToken(token);
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
      
      callbacks.onComplete(fullText);
    } catch (error) {
      callbacks.onError(error as Error);
    }
  }
  
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await sleep(this.minRequestInterval - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
  }
  
  private calculateCost(promptTokens: number, completionTokens: number): number {
    const model = this.models[0];
    if (!model.costPer1kInput || !model.costPer1kOutput) return 0;
    
    const inputCost = (promptTokens / 1000) * model.costPer1kInput;
    const outputCost = (completionTokens / 1000) * model.costPer1kOutput;
    return inputCost + outputCost;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a Groq provider instance.
 */
export function createGroqProvider(): AIProvider {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  
  return new GroqProvider({
    apiKey,
    baseUrl: GROQ_BASE_URL,
    defaultModel: DEFAULT_MODEL,
    models: GROQ_MODELS,
  });
}

export default GroqProvider;