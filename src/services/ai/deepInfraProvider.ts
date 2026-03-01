/**
 * LingoFriends - DeepInfra AI Provider
 * 
 * Provider for GLM-5 and other models via DeepInfra's OpenAI-compatible API.
 * This is the PRODUCTION default for lesson generation and chat.
 * 
 * DeepInfra processes data in US data centres with zero data retention.
 * The provider abstraction allows future migration to EU-hosted inference.
 * 
 * @module services/ai/deepInfraProvider
 */

import type { AIProvider, AICompletionOptions, AICompletionResult, AIStreamCallbacks, AIModelConfig, ProviderConfig } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * DeepInfra models available for LingoFriends.
 */
const DEEPINFRA_MODELS: AIModelConfig[] = [
  {
    id: 'zai-org/GLM-5-9B-Chat',
    name: 'GLM-5 9B Chat',
    purpose: 'general',
    contextWindow: 131_072,
    costPer1kInput: 0.00003,
    costPer1kOutput: 0.00007,
  },
  {
    id: 'zai-org/GLM-4-9B-Chat',
    name: 'GLM-4 9B Chat',
    purpose: 'fast',
    contextWindow: 131_072,
    costPer1kInput: 0.00002,
    costPer1kOutput: 0.00006,
  },
];

/**
 * Default model for DeepInfra.
 */
const DEFAULT_MODEL = 'zai-org/GLM-5-9B-Chat';

/**
 * DeepInfra API base URL (OpenAI-compatible).
 */
const DEEPINFRA_BASE_URL = 'https://api.deepinfra.com/v1/chat/completions';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep helper for rate limiting.
 */
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff.
 */
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
        console.log(`[DeepInfra] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// DEEPINFRA PROVIDER CLASS
// ============================================================================

/**
 * DeepInfra AI Provider implementation.
 * 
 * Uses OpenAI-compatible chat completions API format.
 * Supports streaming and JSON mode.
 */
export class DeepInfraProvider implements AIProvider {
  readonly id = 'deepinfra' as const;
  readonly name = 'DeepInfra';
  readonly description = 'GLM-5 via DeepInfra (production default)';
  readonly models = DEEPINFRA_MODELS;
  readonly defaultModel = DEFAULT_MODEL;
  
  private apiKey: string | undefined;
  private baseUrl: string;
  
  /** Rate limiting state */
  private lastRequestTime = 0;
  private readonly minRequestInterval = 300; // ms between requests
  
  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEEPINFRA_BASE_URL;
  }
  
  /**
   * Check if the provider is configured with a valid API key.
   */
  get isAvailable(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.length > 0;
  }
  
  /**
   * Generate a completion (non-streaming).
   * 
   * @param options - Completion options
   * @returns Generated text result
   */
  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    if (!this.isAvailable) {
      throw new Error('DeepInfra API key not configured');
    }
    
    // Rate limiting
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
        const apiError = new Error(`DeepInfra API error: ${response.status} - ${error?.error?.message || 'Unknown error'}`);
        (apiError as any).status = response.status;
        throw apiError;
      }
      
      const data = await response.json() as {
        choices: Array<{ message: { content: string }; finish_reason: string }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };
      
      const text = data.choices?.[0]?.message?.content || '';
      const usage = data.usage;
      
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
   * 
   * @param options - Completion options
   * @param callbacks - Streaming callbacks
   */
  async stream(options: AICompletionOptions, callbacks: AIStreamCallbacks): Promise<void> {
    if (!this.isAvailable) {
      callbacks.onError(new Error('DeepInfra API key not configured'));
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
        throw new Error(`DeepInfra API error: ${response.status} - ${error?.error?.message || 'Unknown error'}`);
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
  
  /**
   * Enforce minimum interval between requests.
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await sleep(this.minRequestInterval - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Calculate estimated cost in USD.
   */
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
 * Create a DeepInfra provider instance.
 */
export function createDeepInfraProvider(): AIProvider {
  const apiKey = import.meta.env.VITE_DEEPINFRA_API_KEY;
  
  return new DeepInfraProvider({
    apiKey,
    baseUrl: DEEPINFRA_BASE_URL,
    defaultModel: DEFAULT_MODEL,
    models: DEEPINFRA_MODELS,
  });
}

export default DeepInfraProvider;